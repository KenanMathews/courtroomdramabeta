
async function playbackActions(roomDetails, users, ws) {
    try {
      let roomName = roomDetails.name;
  
      // Fetch all the actions and messages for the room
      const allActions = await fetchActionAndMessages(roomDetails.id);
  
      // Get the room object
      const room = rooms.get(roomName);
  
      // Add the user to the room
      for (const user of users) {
        // Add each user's WebSocket connection to the room
        room.clients.add(user.ws);
      }
  
      // Replay the actions and messages
      for (const item of allActions) {
        console.log(item);
  
        if ('message' in item) {
          await handleChatMessage(room, item.message, { userId: item.user_id, name: item.user_name });
        } else {
          switch (item.action) {
            case 'objection':
              await handleObjection(room, { userId: item.user_id, name: item.data.userName });
              break;
            case 'holdit':
              await handleHoldIt(room, { userId: item.user_id, name: item.data.userName });
              break;
            case 'switch_speaker':
              handleSwitchSpeaker(room, { userId: item.user_id, name: item.data.userName });
              break;
            case 'select_side':
              handleSelectSide(room, item.data.side);
              break;
            // Add more cases for other action types
            default:
              console.error(`Unknown action type: ${item}`);
              break;
          }
        }
  
        // Add a delay to simulate the original timeline (optional)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
  
      console.log('Playback completed.');
    } catch (error) {
      console.error('Error during playback:', error);
    }
  }
  async function createDummyRoom(roomId, ws) {
    try {
      // Fetch the room details
      const roomDetails = await getRoomDetails(roomId);
  
      if (!roomDetails) {
        console.error('Error fetching room details');
        return null;
      }
  
      // Create a similar room object
      const room = {
        name: roomDetails.name,
        clients: new Set(),
        topic: roomDetails.topic || null,
        mode: roomDetails.mode || null,
        messageHandler: handleMessage, 
        isActive: false,
        side: roomDetails.side || null,
        chatInfo: { chatLog: [], lastMessageTime: null },
        isInObjectionState: false,
        audioUrl: 'assets/audio/coutroom.mp3',
        id: roomDetails.id || null
      };
  
      const dummyUsers = roomDetails.user_room_association.map(userAssociation => ({
        userId: userAssociation.user_id,
        userName: userAssociation.users.username
      }));
  
      // Add the user who called the replay to the dummy room
      const user = {
        userId: ws.user_id,
        userName: ws.user_name
      };
      dummyUsers.push(user);
  
      // Add the room to the rooms map
      rooms.set(roomDetails.name, room);
  
      // Return the room details
      return roomDetails;
    } catch (error) {
      console.error('Error creating dummy room:', error);
      return null;
    }
  }
  
  async function replayRoom(roomId, ws) {
    try {
  
      // Add ws to room.clients
      const room = rooms.get(roomId);
      if (room) {
        room.clients.add(ws);
      }
  
      // Create a dummy room based on the actual room
      const dummyRoomDetails = await createDummyRoom(roomId,ws);
  
      if (!dummyRoomDetails) {
        console.error('Error creating dummy room');
        return;
      }
  
      setPlaybackState(true);
  
      // Get the list of users associated with the dummy room
      let dummyUsers = dummyRoomDetails.user_room_association.map(userAssociation => {
        let ws = {
          user_id: userAssociation.user_id,
          username: userAssociation.users.username
        };
        return {
          userId: userAssociation.user_id,
          userName: userAssociation.users.username,
          ws
        };
      });
  
      // Proceed with the replay using the dummy room details and user information
      await playbackActions(dummyRoomDetails, dummyUsers, ws);
    } catch (error) {
      console.error('Error replaying room:', error);
    }
  }
  