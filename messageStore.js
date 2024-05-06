// messageStore.js
const { Collection } = require('discord.js');

// Initialize the messages collection
const messages = new Collection();


class MessageStore {
  static addMessage(channelId, message) {
    // Initialization logic to ensure messages collection exists
    if (!messages.has(channelId)) {
      messages.set(channelId, new Collection());
    }

    const channelMessages = messages.get(channelId);
    if (!channelMessages.has(message.author.id)) {
      channelMessages.set(message.author.id, []);
    }
    channelMessages.get(message.author.id).push(message);
  }

  static getMessagesForUsersInTimeFrame(channelId, userId1, userId2, startTime, endTime) {
    const channelMessages = messages.get(channelId);
    if (!channelMessages) return [];
    const user1Messages = channelMessages.get(userId1) || [];
    const user2Messages = channelMessages.get(userId2) || [];
    const messagesWithinTimeFrame = [...user1Messages, ...user2Messages].filter(message => {
      const messageTime = message.createdTimestamp;
      return messageTime >= startTime && messageTime <= endTime;
    });
    return messagesWithinTimeFrame;
  }
}

module.exports = MessageStore;
