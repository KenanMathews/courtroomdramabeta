const { storeUserAction,storeChatMessage,createAIChatBox,getAIChatBoxIdFromRoom,storeAIChatMessage,findOrCreateBot, getAIChatLog} = require('./supabase');
const WebSocket = require('ws');
const { streamTextViaWebSocket } = require('./ai')


async function handleRoomAction(room, actionType, data, userData) {
  switch (actionType) {
    case 'objection':
      await handleObjection(room, userData, data);
      break;
    case 'holdit':
      await handleHoldIt(room, userData);
      break;
    case 'switch_speaker':
      await handleSwitchSpeaker(room, userData);
      break;
    case 'chatMessage':
      await handleChatMessage(room, data, userData);
      break;
    case 'change_pose':
      await handleLoadPose(room, data, userData);
      break;
    case 'select_side':
      await handleSelectSide(room, data, userData);
      break;
    case 'generate':
        handleAIChatMessage(room, data, userData);
        break;
    default:
      console.log('Unsupported action type:', actionType);
  }
}

async function handleObjection(room,userData, messageid) {
    room.audioUrl = '/assets/audio/objection.mp3';
    room.effectUrl = '/assets/audio/pw/objection.wav';
    try {
      const actionId = await storeUserAction(room.id, userData.userId, 'objection', {id:messageid});
      room.previousObjectionIndex = room.objectionIndex || 0;
      const tempMessage = room.chatInfo.chatLog.find(message => message.id == messageid);
      const objectionData = { type: 'objectionTriggered', data: { userId: userData.userId, userName: userData.name, message: tempMessage }, roomInfo: getRoomInfo(room) };
      broadcastToRoom(room, JSON.stringify(objectionData));
      broadcastToRoom(room, JSON.stringify({ type: 'showChatBox', roomInfo: getRoomInfo(room) }))
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
      const holditData = { type: 'holdItTriggered', data: { userId: userData.userId, userName: userData.name }, roomInfo: getRoomInfo(room) };
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
      room.side = room.speaker.side;
      
      const actionId = storeUserAction(room.id, room.speaker.user_id, 'switch_speaker', { newSpeakerId: newSpeaker.user_id });
      
      broadcastToRoom(room, JSON.stringify({ type: 'speakerSwitched', data: { userName: newSpeaker.user_name, side: room.speaker.side }, roomInfo: getRoomInfo(room) }));
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
      broadcastToRoom(room, JSON.stringify({ type: 'chatMessage', data: { message, timestamp: currentTime, user: userData.name, id: messageId }, roomInfo: getRoomInfo(room) }));
    }
  }
  function parseChatLog(chatLog) {
    return chatLog.map(message => ({
        id: message.id,
        userId: message.user_id,
        user: message.username, 
        message: message.message,
        timestamp: message.timestamp,
        bot: message.is_bot,
    }));
}
  async function handleAIChatMessage(room, message, userData) {
    try {
        const roomId = room.id; // Accessing roomId from the room object
        const userId = userData.userId;

        // Check if the AI chat box already exists for the user in the room
        let aiChatBoxId = await getAIChatBoxIdFromRoom(roomId, userId);
        if (!aiChatBoxId) {
            // If the AI chat box doesn't exist, generate a new ID
            aiChatBoxId = await createAIChatBox(roomId, userId, message);
        }

        // Get the existing chat log array or initialize it if it's the first message
        let chatLog = [];
        if (aiChatBoxId) {
            const botId = await findOrCreateBot();
            chatLog = await getAIChatLog(aiChatBoxId);
            const parsedChatLog = parseChatLog(chatLog);

            // Store the chat message in the database and get the message ID
            const messageId = await storeAIChatMessage(aiChatBoxId, userId, message);

            if (messageId === null) {
                console.error('Error storing AI chat message.');
                return;
            }

            // Construct the message object
            const tempMessage = {
                id: messageId,
                user_id: userId,
                user: userData.name,
                message: message,
                timestamp: new Date().getTime(), // Use current timestamp
            };

            // Add the message to the chat log array
            parsedChatLog.push(tempMessage);

            // Update the room object with the latest AI chat box info using the aiChatBoxId as key
            room.aiChatBoxes = room.aiChatBoxes || {}; // Initialize aiChatBoxes object if it doesn't exist
            room.aiChatBoxes[aiChatBoxId] = { id: aiChatBoxId, userId, parsedChatLog };

            // Broadcast the chat message to the room (implementation depends on your application logic)

            // Now call the streaming function
            await streamTextViaWebSocket(room , aiChatBoxId, botId, message, parsedChatLog);
        }

        

    } catch (error) {
        console.error('Error handling AI chat message:', error);
    }
}
  
  function handleLoadPose(room, data, userData) {
    const actionId = storeUserAction(room.id, userData.userId, 'change_pose', { animation: data});
    broadcastToRoom(room, JSON.stringify({ type: 'loadPose', data: { side:userData.side, animation:data, characterKey:userData.spriteKey }, roomInfo: getRoomInfo(room) }));
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
    room.side = user.side;
  
    room.audioUrl = '/assets/audio/questioning.mp3';
    room.isActive = true;
    const actionId = await storeUserAction(room.id, user.user_id, 'select_side', { side }); // Storing user action
    broadcastToRoom(room, JSON.stringify({ type: 'sideSelected', data: { side, spriteKey }, name: user.user_name })); // Broadcasting side selection with spriteKey
    broadcastToRoom(room, JSON.stringify({ type: 'showChatBox', roomInfo: getRoomInfo(room) }));
  
    if (room.clients.size != 2) {
      broadcastToRoom(room, JSON.stringify({ type: 'waitingPlayer' }));
    } 
  }
  
  function broadcastToRoom(room, message) {
    room.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

function getRoomInfo(room) {
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
      name: room.name,
      users: users,
      speaker: room.speaker ? room.speaker.user_name : null,
      speakerSide: speakerSide,
      chatInfo: room.chatInfo,
      audioUrl: room.audioUrl,
      effectUrl: room.effectUrl
    };
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
    handleRoomAction,
    broadcastToRoom,
    getRoomInfo,
    sendDataToSpeaker,
  };