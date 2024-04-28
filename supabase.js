const { createClient } = require('@supabase/supabase-js');
const { getPlaybackState } = require('./gameState');
const { fs } = require('fs');
const { path } = require('path');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Set up Supabase connection using environment variables
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global middleware function to block database updates during playback
const blockDatabaseUpdates = (func) => async (...args) => {
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
  async function getAIChatBoxIdFromRoom(roomId, userId) {
    try {
      const { data } = await supabase
        .from('ai_chat_boxes')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();
  
      return data ? data.id : null; // Return the AI chat box ID or null if not found
    } catch (error) {
      console.error('Error fetching AI chat box ID:', error);
      return null;
    }
  }

  async function createAIChatBox(roomId, userId, name) {
    try {
      const { data, error } = await supabase
        .from('ai_chat_boxes')
        .insert([{ room_id: roomId, user_id: userId, name: name }])
        .select("id")
        .single();
  
      if (error) {
        console.error('Error creating AI chat box:', error);
        return null;
      }
  
      if (!data) {
        console.error('Error creating AI chat box: Data is null');
        return null;
      }
  
      return data.id; // Return the ID of the created AI chat box
    } catch (error) {
      console.error('Error creating AI chat box:', error);
      return null;
    }
  }
  async function getAIChatLog(aiChatBoxId) {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select(`*,users!inner(username,is_bot)`)
        .eq('ai_chat_box_id', aiChatBoxId)
  
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching AI chat log:', error);
      return [];
    }
  }

  async function storeAIChatMessage(aiChatBoxId, userId, message) {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert([{ ai_chat_box_id: aiChatBoxId, user_id: userId, message: message }])
        .select('id')
        .single();
  
      if (error) {
        console.error('Error storing AI chat message:', error);
        return null;
      }
  
      if (!data) {
        console.error('Error storing AI chat message: Data is null');
        return null;
      }
  
      return data.id; // Return the ID of the stored message
    } catch (error) {
      console.error('Error storing AI chat exception:', error);
      return null;
    }
  }
  
  async function updateAIChatMessage(messageId, updatedMessage) {
    try {
        const { data, error } = await supabase
            .from('ai_chat_messages')
            .update({ message: updatedMessage })
            .eq('id', messageId)
            .single();

        if (error) {
            console.error('Error updating AI chat message:', error);
            return false;
        }

        return true; // Return true indicating successful update
    } catch (error) {
        console.error('Error updating AI chat message:', error);
        return false;
    }
}

const findOrCreateBot = async () => {
  try {
      // Check if the bot already exists
      const { data: existingBot, error: findError } = await supabase
          .from('users')
          .select('*')
          .eq('username', 'AI Assistant')
          .single();


      if (existingBot) {
          return existingBot.id;
      }
      if (findError) {
        console.error('Error finding bot:', findError);
        console.log('Creating bot......');
      }


      // If the bot doesn't exist, create it
      const botId = await generateUniqueId('AI Assistant');
      
      // Update the newly created user as a bot
      await supabase
          .from('users')
          .update({ is_bot: true })
          .eq('id', botId);

      return botId;
  } catch (error) {
      console.error('Error finding or creating bot:', error);
      throw error;
  }
};

async function storeTopics(topics) {
  // Collect all unique topics to insert
  const uniqueTopics = [...new Set(topics)];

  // Fetch existing topics from the 'topics' table
  const { data: existingTopics, error: existingError } = await supabase
      .from('topics')
      .select('topic_name')
      .in('topic_name', uniqueTopics);

  if (existingError) {
      console.error('Error fetching existing topics:', existingError);
      return;
  }

  // Filter out existing topics
  const existingTopicNames = existingTopics.map(topic => topic.topic_name);
  const newTopics = uniqueTopics.filter(topic => !existingTopicNames.includes(topic));

  // Insert new topics into the 'topics' table
  if (newTopics.length > 0) {
      const inserts = newTopics.map(topic => ({ topic_name: topic, connections: 1 }));
      const { error: insertError } = await supabase.from('topics').insert(inserts);
      
      if (insertError) {
          console.error('Error inserting new topics:', insertError);
          return;
      }
  }

  console.log('Topics stored successfully.');
}

async function getRandomTopics(numberOfTopics = 15) {
  const { data: allTopics, error } = await supabase
      .from('topics')
      .select('topic_name');

  if (error) {
      console.error('Error fetching topics:', error);
      return [];
  }

  if (!allTopics || allTopics.length === 0) {
      console.error('No topics found.');
      return [];
  }

  // Shuffle the array of topics
  const shuffledTopics = allTopics.sort(() => Math.random() - 0.5);

  // Return a slice of the shuffled array containing the specified number of topics
  return shuffledTopics.slice(0, numberOfTopics);
}



module.exports = {
  generateUniqueId,
  storeRoomInfo,
  storeChatMessage,
  storeUserAction,
  updateUserRoom,
  fetchActionAndMessages,
  getAIChatBoxIdFromRoom,
  createAIChatBox,
  getAIChatLog,
  storeAIChatMessage,
  updateAIChatMessage,
  findOrCreateBot,
  storeTopics,
  getRandomTopics,
};