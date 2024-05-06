// commands/getdm.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const MessageStore = require('../messageStore'); // MessageStore is where we'll store messages for the activity session

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getdm')
    .setDescription('Fetch messages between you and another user in this channel within a specific time frame')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to fetch messages with')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('time-frame')
        .setDescription('The time frame to fetch messages within (2min, 5min, 10min, 15min)')
        .addChoices([
          { name: '2 minutes', value: 2 },
          { name: '5 minutes', value: 5 },
          { name: '10 minutes', value: 10 },
          { name: '15 minutes', value: 15 }
        ])
        .setRequired(true)
    ),
  async execute(interaction) {
    const user1 = interaction.user;
    const user2 = interaction.options.getUser('user');
    const timeFrame = interaction.options.getInteger('time-frame');
    const numMessages = interaction.options.getInteger('num-messages') || 10;

    if (!user2) {
      return interaction.reply('Please specify a valid user to fetch messages with.');
    }

    try {
      const currentTime = new Date().getTime();
      const startTime = currentTime - (timeFrame * 60000); // Convert minutes to milliseconds
      const storedMessages = MessageStore.getMessagesForUsersInTimeFrame(interaction.channelId, user1.id, user2.id, startTime, currentTime); // Retrieve stored messages within the time frame

      if (storedMessages.length === 0) {
        return interaction.reply(`No messages found in this channel between ${user1.username} and ${user2.username} within the specified time frame.`);
      }

      const formattedMessages = storedMessages
        .map((msg) => `${msg.author.username}: ${msg.content}`)
        .join('\n');

      interaction.reply(`Messages between ${user1.username} and ${user2.username} in this channel within the specified time frame:\n\n${formattedMessages}`);
    } catch (error) {
      console.error('An error occurred:', error);
      interaction.reply('An error occurred while fetching messages. Please try again later.');
    }
  },
};
