const WebSocket = require('ws');
const { generateUniqueId, storeRoomInfo, updateUserRoom,fetchActionAndMessages} = require('./supabase');
const { setPlaybackState } = require('./gameState');
const { handleRoomAction, getRoomInfo, broadcastToRoom } = require('./handleRoomAction');
// Map to store the active rooms
const rooms = new Map();

// Function to create a new room
async function createRoom(roomName, name, ws) {
  if (rooms.has(roomName)) {
    const roomInstance = [...rooms.values()].find(room => room.clients.has(ws));
    return roomInstance || null;
  }

  const room = {
    name: roomName,
    clients: new Set([ws]),
    topic: null,
    mode: null,
    messageHandler: handleMessage,
    isActive: false,
    side: null,
    chatInfo: { chatLog: [], lastMessageTime: null },
    isInObjectionState: false,
    audioUrl: 'assets/audio/coutroom.mp3',
    id: null,
    roomAssets: {},
    isActive: false,
  };

  try {
    const userId = await generateUniqueId(name);
    if (!userId) throw new Error('Error generating unique user ID.');

    const roomId = await storeRoomInfo(roomName, {});
    if (!roomId) throw new Error('Error storing room info.');

    const updatedUserRoom = await updateUserRoom(userId, roomId);
    if (!updatedUserRoom) throw new Error('Error updating user room.');

    ws.send(JSON.stringify({ type: 'updateUUID', data: userId }));

    ws.user_id = userId;
    ws.user_name = name;
    room.speaker = ws;
    room.id = roomId;
    rooms.set(roomName, room);

    ws.on('close', () => {
      console.log(`Client disconnected from room: ${roomName}`);
      room.isActive = false;
      broadcastToRoom(room, JSON.stringify({ type: "error", data: `${ws.user_name} has disconnected` }));
      room.clients.delete(ws);
      if (room.clients.size === 0) {
        console.log(`Room ${roomName} has no more clients. Deleting room.`);
        rooms.delete(roomName);
      }
    });

    console.log(`Client connected to room: ${roomName}`);
    ws.send(JSON.stringify({ type: 'requestTopic' }));
    return room;
  } catch (error) {
    console.error('Error creating room:', error);
    return null;
  }
}

async function joinRoom(roomName, name, ws) {
  try {
    const userId = await generateUniqueId(name);
    if (!userId) throw new Error('Error generating unique user ID.');

    const room = rooms.get(roomName);
    if (!room) return { success: false, error: 'Room not found' };

    const updatedUserRoom = await updateUserRoom(userId, room.id);
    if (!updatedUserRoom) throw new Error('Error updating user room.');

    ws.user_id = userId;
    ws.user_name = name;
    ws.send(JSON.stringify({ type: 'updateUUID', data: userId }));
    ws.on('close', () => {
      console.log(`Client disconnected from room: ${roomName}`);
      room.isActive = false;
      broadcastToRoom(room, JSON.stringify({ type: "error", data: `${ws.user_name} has disconnected` }));
      room.clients.delete(ws);
      if (room.clients.size === 0) {
        console.log(`Room ${roomName} has no more clients. Deleting room.`);
        rooms.delete(roomName);
      }
    });
    room.clients.add(ws);

    if (room.clients.size === 1) {
      ws.side = 'defence';
      ws.spriteKey = ws.side === 'defence'?'character-phoenixwright':'character-milesedgeworth';
      room.speaker = ws;
    } else if (room.clients.size === 2) {
      if (room.speaker.side) {
        ws.side = room.speaker.side === 'defence' ? 'prosecution' : 'defence';
        ws.spriteKey = ws.side === 'defence'?'character-phoenixwright':'character-milesedgeworth';
        room.listener = ws;        
      } else {
        ws.side = 'defence'
        ws.spriteKey = ws.side === 'defence'?'character-phoenixwright':'character-milesedgeworth';
        room.listener = ws;
      }
      broadcastToRoom(room, JSON.stringify({ type: 'playerJoined' }));
    } else {
      return { success: false, error: 'Room is full' };
    }
    return { success: true, roomInfo: getRoomInfo(room), spriteKey:ws.spriteKey };
  } catch (error) {
    console.error('Error joining room:', error);
    return { success: false, error: 'Error joining room' };
  }
}
function getOpenRooms() {
  const singleClientRooms = [];
  for (const [roomName, room] of rooms) {
    if (room.isActive && room.clients.size === 1) {
      singleClientRooms.push({name:roomName, count:room.clients.size});
    }
  }
  return singleClientRooms;
}
// Function to handle messages for a room
function handleMessage(room, type, data, userData) {
  // Process the message based on its type
  switch (type) {
    case 'setTopic':
      room.topic = data;
      broadcastToRoom(room, JSON.stringify({ type: "topicSet", data: data }));
      break;
    case 'setMode':
      room.mode = data;
      broadcastToRoom(room, JSON.stringify({ type: "modeSet", data: data }));
      break;
    case 'objection':
    case 'holdit':
    case 'switch_speaker':
    case 'chatMessage':
    case 'change_pose':
    case 'select_side':
    case 'generate':
      handleRoomAction(room, type, data, userData);
      break;
    case 'crossExamination':
      broadcastToRoom(room, JSON.stringify({ type: 'crossExaminationTriggered' }));
      break;
    case 'changeScene':
      return changeScene(data);
    case 'replay':
      replayRoom(room);
      break;
    default:
      console.log('Unsupported message type:', type);
  }
}



// Function to process WebSocket messages
async function processMessage(ws, message) {
  try {
    const { type, data, roomName, name } = JSON.parse(message);
    switch (type) {
      case 'createRoom':
        const room = await createRoom(roomName, name, ws);
        if (room) {
          return JSON.stringify({ type: 'roomCreated', data: roomName, roomInfo: getRoomInfo(room) });
        }
      case 'joinRoom':
        const response = await joinRoom(roomName, name, ws);
        if (response.success) {
          return JSON.stringify({ type: 'roomJoined', data: response.spriteKey, roomInfo: response.roomInfo });
        } else {
          return JSON.stringify({ type: 'roomNotFound', data: `Room "${roomName}" not found.` });
        }
      default:
        // Pass the message to the room-level handler
        const roomInstance = [...rooms.values()].find(room => room.clients.has(ws));
        const userData = {
          userId: ws.user_id,
          name: ws.user_name,
          side: ws.side,
          spriteKey: ws.spriteKey
        };
        if (roomInstance) {
          const response = roomInstance.messageHandler(roomInstance, type, data, userData);
          return response;
        } else {
          console.error(`Room "${roomName}" not found.`);
          return JSON.stringify({ type: 'error', data: `Room "${roomName}" not found.` });
        }
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

// Function to change the current scene
function changeScene(sceneName) {
  const scene = sceneData.find((s) => s.name === sceneName);
  if (scene) {
    return JSON.stringify({ type: 'updateScene', data: scene });
  } else {
    console.error(`Scene "${sceneName}" not found.`);
    return JSON.stringify({ type: 'error', data: `Scene "${sceneName}" not found.` });
  }
}

async function replayRoom(room) {
  const actions = await fetchActionAndMessages(room.id);
  const roomInfo = getRoomInfo(room);
  actions.forEach((action, index) => {
      setTimeout(() => {
          let formattedAction;
          if (action.table === 'chat_messages') {
              formattedAction = JSON.stringify({ type: 'chatMessage', data: { message: action.message, timestamp: action.timestamp, user: action.user, id: action.id }, roomInfo: roomInfo });
          } else {
              formattedAction = JSON.stringify({ type: action.action, data: action.data, roomInfo: roomInfo });
          }
          broadcastToRoom(room, formattedAction);
      }, 5000 * index); // Delay of 1 second between actions
  });
}

async function replayRoomByName(roomName, action){
  if (rooms.has(roomName)) {
    const room = rooms.get(roomName);
    let roomInfo = getRoomInfo(room);
    if (action.table === 'chat_messages') {
        roomInfo.chatInfo.chatLog.push(action)
        formattedAction = JSON.stringify({ type: 'chatMessage', data: { message: action.message, timestamp: action.timestamp, user: action.user, id: action.id }, roomInfo: roomInfo });
    } else {
        formattedAction = JSON.stringify({ type: action.action, data: action.data, roomInfo: roomInfo });
    }
    broadcastToRoom(room, formattedAction);
  }else{
    console.log("Room not found");
  }
}

function getRoomObj(roomName){
  if (rooms.has(roomName)) {
    return rooms.get(roomName);
  }else{
    return null;
  }
}


module.exports = {
  createRoom,
  joinRoom,
  processMessage,
  getOpenRooms,
  getRoomObj,
  replayRoomByName,
};
