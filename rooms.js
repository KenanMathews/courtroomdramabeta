const WebSocket = require('ws');
const { generateUniqueId, storeRoomInfo, updateUserRoom, storeChatMessage, storeUserAction,fetchActionAndMessages, getRoomDetails } = require('./supabase');
const { setPlaybackState } = require('./gameState');


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
    roomAssets: {}
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
      ws.spriteKey = ws.side === 'character-phoenixwright';
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

    return { success: true, roomInfo: getRoomInfo(roomName), spriteKey:ws.spriteKey };
  } catch (error) {
    console.error('Error joining room:', error);
    return { success: false, error: 'Error joining room' };
  }
}
function getOpenRooms() {
  const singleClientRooms = [];
  for (const [roomName, room] of rooms) {
    if (room.clients.size === 1) {
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
    case 'selectSide':
      handleSelectSide(room, data, userData);
      break;
    case 'objection':
      handleObjection(room, userData, data);
      break;
    case 'holdIt':
      handleHoldIt(room,userData);
      break;
    case 'crossExamination':
      // handleCrossExamination(ws);
      broadcastToRoom(room, JSON.stringify({ type: 'crossExaminationTriggered' }));
      break;
    case 'changeScene':
      return changeScene(data);
    case 'chatMessage':
      handleChatMessage(room, data, userData);
      break;
    case 'switchSpeaker':
      handleSwitchSpeaker(room);
      break;
    case 'sendPose':
      handleLoadPose(room,data,userData);
      break;
    default:
      console.log('Unsupported message type:', type);
  }
}

async function handleObjection(room,userData, messageid) {
  room.audioUrl = '/assets/audio/objection.mp3';
  room.effectUrl = '/assets/audio/pw/objection.wav';
  try {
    const actionId = await storeUserAction(room.id, userData.userId, 'objection', {id:messageid});
    room.previousObjectionIndex = room.objectionIndex || 0;
    const tempMessage = room.chatInfo.chatLog.find(message => message.id == messageid);
    const objectionData = { type: 'objectionTriggered', data: { userId: userData.userId, userName: userData.name, message: tempMessage }, roomInfo: getRoomInfo(room.name) };
    broadcastToRoom(room, JSON.stringify(objectionData));
    broadcastToRoom(room, JSON.stringify({ type: 'showChatBox', roomInfo: getRoomInfo(room.name) }))
    room.effectUrl = '';
  } catch (error) {
    console.error('Error handling objection:', error);
  }
}

async function handleHoldIt(room,userData){
  room.isInObjectionState = true;
  room.audioUrl = '/assets/audio/objection.mp3';
  room.effectUrl = '/assets/audio/pw/holdit.wav';
  try {
    const actionId = await storeUserAction(room.id, userData.userId, 'holdit', {});
    room.previousObjectionIndex = room.objectionIndex || 0;
    room.objectionIndex = room.chatInfo.chatLog.length;
    const speakerMessages = room.chatInfo.chatLog.slice(room.previousObjectionIndex, room.objectionIndex).filter(message => message.user_id === room.speaker.user_id);
    const speakerMessagesData = { type: 'holditChatLog', data: speakerMessages };
    sendDataToListener(room, JSON.stringify(speakerMessagesData));
    const holditData = { type: 'holdItTriggered', data: { userId: userData.userId, userName: userData.name }, roomInfo: getRoomInfo(room.name) };
    broadcastToRoom(room, JSON.stringify(holditData));
  } catch (error) {
    console.error('Error handling objection:', error);
  }
}


function handleSwitchSpeaker(room, user) {
  const clientsArray = Array.from(room.clients);
  const newSpeaker = clientsArray.find(client => client !== room.speaker);
  
  if (newSpeaker) {
    const tempSpeaker = room.speaker;
    room.speaker = newSpeaker;
    room.listener = tempSpeaker;
    
    const actionId = storeUserAction(room.id, room.speaker.user_id, 'switch_speaker', { newSpeakerId: newSpeaker.user_id });
    
    broadcastToRoom(room, JSON.stringify({ type: 'speakerSwitched', data: { userName: newSpeaker.user_name, side: room.speaker.side }, roomInfo: getRoomInfo(room.name) }));
  }
}

async function handleChatMessage(room, message, userData) {
  const currentTime = new Date();
  const currentTimeInMinutes = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), currentTime.getHours(), currentTime.getMinutes()).getTime();

  const messageId = await storeChatMessage(room.id, userData.userId, message, currentTime);
  
  if (messageId === null) {
    console.error('Error storing chat message.');
    return;
  }
  const tempMessage = {
    id: messageId,
    user_id: userData.userId,
    user: userData.name,
    message: message,
    timestamp: currentTimeInMinutes,
  };

  room.chatInfo.chatLog.push(tempMessage);
  room.chatInfo.lastMessageTime = currentTime;

  if (messageId !== null) {
    broadcastToRoom(room, JSON.stringify({ type: 'chatMessage', data: { message, timestamp: currentTime, user: userData.name, id: messageId }, roomInfo: getRoomInfo(room.name) }));
  }
}


function handleLoadPose(room, data, userData) {
  const actionId = storeUserAction(room.id, userData.userId, 'change_pose', { animation: data});
  broadcastToRoom(room, JSON.stringify({ type: 'loadPose', data: { side:userData.side, animation:data, characterKey:userData.spriteKey }, roomInfo: getRoomInfo(room.name) }));
}

async function handleSelectSide(room, data, userData) {
  let side = data.side;
  let spriteKey = data.spriteKey;
  const user = [...room.clients].find(client => client.user_id === userData.userId); // Finding the user in the room

  if (!user) {
    console.error('User not found in the room');
    return;
  }

  user.side = side;
  user.spriteKey = spriteKey;

  room.audioUrl = '/assets/audio/questioning.mp3';
  const actionId = await storeUserAction(room.id, user.user_id, 'select_side', { side }); // Storing user action
  broadcastToRoom(room, JSON.stringify({ type: 'sideSelected', data: { side, spriteKey }, name: user.user_name })); // Broadcasting side selection with spriteKey
  broadcastToRoom(room, JSON.stringify({ type: 'showChatBox', roomInfo: getRoomInfo(room.name) }));

  if (room.clients.size != 2) {
    broadcastToRoom(room, JSON.stringify({ type: 'waitingPlayer' }));
  } 
}

function getRoomInfo(roomName) {
  const room = rooms.get(roomName);

  if (!room) {
    return null;
  }
  const users = [...room.clients].map(client => ({
    userId: client.user_id,
    name: client.user_name,
    spriteKey: client.spriteKey,
    side: client.side,
    isSpeaker: client === room.speaker
  }));
  
  const speakerSide = room.speaker ? room.speaker.side : null;

  return {
    name: roomName,
    users: users,
    speaker: room.speaker ? room.speaker.user_name : null,
    speakerSide: speakerSide,
    chatInfo: room.chatInfo,
    audioUrl: room.audioUrl,
    effectUrl: room.effectUrl
  };
}

// Function to process WebSocket messages
async function processMessage(ws, message) {
  try {
    const { type, data, roomName, name } = JSON.parse(message);
    switch (type) {
      case 'createRoom':
        const room = await createRoom(roomName, name, ws);
        if (room) {
          return JSON.stringify({ type: 'roomCreated', data: roomName, roomInfo: getRoomInfo(roomName) });
        }
      case 'joinRoom':
        const response = await joinRoom(roomName, name, ws);
        if (response.success) {
          return JSON.stringify({ type: 'roomJoined', data: response.spriteKey, roomInfo: response.roomInfo });
        } else {
          return JSON.stringify({ type: 'error', data: `Room "${roomName}" not found.` });
        }
      case 'replay':
        replayRoom(data,ws);
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

function broadcastToRoom(room, message) {
  room.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Function to send data to the speaker user
function sendDataToSpeaker(room, data) {
  if (room.speaker && room.speaker.readyState === WebSocket.OPEN) {
    room.speaker.send(data);
  } else {
    console.error('Speaker not available or connection closed.');
  }
}

// Function to send data to the listener user
function sendDataToListener(room, data) {
  if (room.listener && room.listener.readyState === WebSocket.OPEN) {
    room.listener.send(data);
  } else {
    console.error('Listener not available or connection closed.');
  }
}

module.exports = {
  createRoom,
  joinRoom,
  processMessage,
  getOpenRooms
};
