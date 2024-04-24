const { createClient } = require('@supabase/supabase-js');
const { getPlaybackState } = require('./gameState');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Set up Supabase connection using environment variables
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global middleware function to block database updates during playback
const blockDatabaseUpdates = (func) => async (...args) => {
  console.log(getPlaybackState())
    if (getPlaybackState()) {
      // Skip the database update during playback
      return null;
    } else {
      // Call the original function
      return await func(...args);
    }
  };

  const generateUniqueId = blockDatabaseUpdates(async (username) => {
    const { data, error } = await supabase
      .from('users')
      .insert({ username: username, auth_user_id: null })
      .select('id')
      .single();
  
    if (error) {
      console.error('Error generating unique ID:', error);
      throw error;
    }
  
    if (!data) {
      console.error('Error generating unique ID: Data is null');
      throw new Error('Error generating unique ID: Data is null');
    }
  
    return data.id;
  });
  
  const updateUserRoom = blockDatabaseUpdates(async (userId, roomId) => {
    const { error } = await supabase
      .from('user_room_association')
      .insert({ user_id: userId, room_id: roomId });
  
    if (error) {
      console.error('Error updating user room association:', error.message);
      return false;
    } else {
      console.log('User room association updated successfully.');
      return true;
    }
  });
  
  const storeRoomInfo = blockDatabaseUpdates(async (roomName, roomInfo) => {
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name: roomName, info: roomInfo }])
      .select('id')
      .single();
  
    if (error) {
      console.error('Error storing room info:', error);
      return null;
    }
  
    if (!data) {
      console.error('Error storing room info: Data is null');
      return null;
    }
  
    return data.id;
  });
  const storeChatMessage = blockDatabaseUpdates(async (roomId, userId, message, timestamp) => {
    try {
      const messageId = await supabase
        .from('chat_messages')
        .insert([{ room_id: roomId, user_id: userId, message: message, timestamp: timestamp }])
        .select('id')
        .single();
  
      if (messageId.error) {
        console.error('Error storing chat message:', messageId.error);
        return null;
      }
  
      if (!messageId.data) {
        console.error('Error storing chat message: Data is null');
        return null;
      }
  
      return messageId.data.id;
    } catch (error) {
      console.error('Error storing chat message:', error);
      return null;
    }
  });
  
  const storeUserAction = blockDatabaseUpdates(async (roomId, userId, action, userData) => {
    try {
      const actionId = await supabase
        .from('user_actions')
        .insert([{ room_id: roomId, user_id: userId, action: action, data: userData }])
        .select('id')
        .single();
  
      if (actionId.error) {
        console.error('Error storing user action:', actionId.error);
        return null;
      }
  
      if (!actionId.data) {
        console.error('Error storing user action: Data is null');
        return null;
      }
  
      return actionId.data.id;
    } catch (error) {
      console.error('Error storing user action:', error);
      return null;
    }
  });
async function fetchActionAndMessages(roomName) {
    try {
      // Fetch all the user actions for the room
      const userActions = await supabase
        .from('user_actions')
        .select('*')
        .eq('room_id', roomName);
  
      // Fetch the chat messages for the room
      const chatMessages = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomName)
        .order('timestamp', { ascending: true });
  
      return [...userActions.data, ...chatMessages.data].sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error fetching actions and messages:', error);
      throw error;
    }
  }
  async function getRoomDetails(roomId) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          user_room_association:user_room_association(
            user_id,
            users:users(username)
          )
        `)
        .eq('id', roomId)
        .single();
  
      if (error) {
        console.error('Error fetching room details:', error);
        return null;
      }
  
      if (!data) {
        console.error('Error fetching room details: Data is null');
        return null;
      }
  
      return data;
    } catch (error) {
      console.error('Error fetching room details:', error);
      return null;
    }
  }

module.exports = {
  generateUniqueId,
  storeRoomInfo,
  storeChatMessage,
  storeUserAction,
  updateUserRoom,
  fetchActionAndMessages,
  getRoomDetails,
};