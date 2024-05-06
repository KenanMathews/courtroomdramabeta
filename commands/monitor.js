const { replayRoomByName, getRoomObj } = require('../rooms');
const { judgeConversation } = require('../ai');
const { SlashCommandBuilder } = require('@discordjs/builders');

let messageCollector;

const monitoredMessages = [];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monitor')
        .setDescription('Start, stop, or configure monitoring chat for new messages within a time frame')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User you are challenging')
        ).addStringOption(option =>
            option
                .setName('roomname')
                .setDescription('Name of the room being monitored')
        ).addBooleanOption(option =>
            option
                .setName('start')
                .setDescription('Start or stop monitoring chat')
        )
        .addIntegerOption(option =>
            option
                .setName('time')
                .setDescription('Time in minutes to monitor chat')
        ),
    async execute(interaction) {
        const startMonitoring = interaction.options.getBoolean('start');
        const monitoringTime = interaction.options.getInteger('time');
        const roomName = interaction.options.getString('roomname');
        const selectedUser = interaction.options.getUser('user');

        // Get the user who initiated the command
        const interactionUser = interaction.user;

        if (startMonitoring && !messageCollector && monitoringTime && roomName && selectedUser) {
            // Start monitoring
            const timeFrame = monitoringTime; // Time frame in minutes

            // Get the current time in milliseconds
            const currentTime = new Date().getTime();

            // Calculate the start time based on the time frame
            const startTime = currentTime - (timeFrame * 60000); // Convert minutes to milliseconds
            let room = getRoomObj(roomName)
            if (room) {
                let lastUserId = null;
                let lastSide = room.side;
                let messageContext = '';

                messageCollector = interaction.channel.createMessageCollector({
                    filter: (msg) => {
                        // Check if the message is within the time frame and from either the selected user or the interaction user
                        return (msg.author.id === selectedUser.id || msg.author.id === interactionUser.id);
                    },
                    time: monitoringTime * 60000 // Time to keep collecting messages (in milliseconds)
                });

                // Function to handle collected messages
                function handleCollectedMessage(message, currentUser) {
                    // Construct message object in the desired format
                    const messageObject = {
                        id: message.id,
                        room_id: message.channelId,
                        user_id: message.author.id,
                        user: message.author.username,
                        message: message.content,
                        timestamp: message.createdTimestamp,
                        room_name: roomName,
                        table: 'chat_messages'
                    };
                    messageContext += `${message.author.username}:${message.content}.`
                    if (lastUserId !== message.author.id) {
                        lastSide = lastSide === 'defence' ? 'prosecution' : 'defence';
                        const objectBeforeMessage = {
                            id: message.id + "switch",
                            room_id: message.channelId,
                            user_id: lastUserId,
                            action: 'speakerSwitched',
                            data: { userName: message.author.username, side: lastSide },
                            table: 'user_actions'
                        };
                        monitoredMessages.push(objectBeforeMessage);
                        replayRoomByName(roomName, objectBeforeMessage);
                    }
                    lastUserId = message.author.id;
                    // Push the message object into the array
                    monitoredMessages.push(messageObject);
                    replayRoomByName(roomName, messageObject);
                    // Log the collected message
                    console.log(`New message collected: ${message.content}`);

                    // Check if the message is a reply to the last message sent by the other user
                    if (message.reference) {
                        const referencedMessage = monitoredMessages.find(msg => msg.id === message.reference.messageId);
                        if (referencedMessage) {
                            const holdItTriggeredObject = {
                                id: message.id,
                                room_id: message.channelId,
                                user_id: message.author.id,
                                action: 'holdItTriggered',
                                data: { userId: message.author.id, userName: message.author.username },
                                table: 'user_actions'
                            };
                            monitoredMessages.push(holdItTriggeredObject);
                            replayRoomByName(roomName, holdItTriggeredObject);

                            // Adding a timeout between the two replayRoomByName calls
                            setTimeout(() => {
                                const objectionTriggeredObject = {
                                    id: referencedMessage.id,
                                    room_id: referencedMessage.room_id,
                                    user_id: referencedMessage.user_id,
                                    action: 'objectionTriggered',
                                    data: { userId: referencedMessage.user_id, userName: referencedMessage.user, message: referencedMessage },
                                    table: 'user_actions'
                                };
                                monitoredMessages.push(objectionTriggeredObject);
                                replayRoomByName(roomName, objectionTriggeredObject);
                            }, 5000);
                        }
                    }
                }

                messageCollector.on('collect', (message) => {
                    // Determine which user sent the message
                    const currentUser = message.author.id === selectedUser.id ? 'selectedUser' : 'interactionUser';
                    // Call the function to handle the collected message
                    handleCollectedMessage(message, currentUser);
                });

                messageCollector.on('end', async () => {
                    // Monitoring ended
                    let judgeResult = await judgeConversation(messageContext)
                    interaction.reply(judgeResult);
                    console.log('Monitoring ended.');
                    messageCollector = null; // Reset messageCollector
                });

                interaction.reply(`${interactionUser.username} has started a debate against${selectedUser.username} on the topic ${room.topic} for ${monitoringTime} minutes in the room ${roomName}.`);
            }

        } else if (!startMonitoring && messageCollector) {
            // Stop monitoring
            messageCollector.stop();
            interaction.reply('Stopped monitoring chat.');
        } else {
            interaction.reply('Invalid command or monitoring is already in progress.');
        }
    },
};
