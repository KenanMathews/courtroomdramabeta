const { replayRoomByName, getRoomObj } = require('../rooms');
const { judgeConversation } = require('../ai');
const { broadcastToRoom, getRoomInfo } = require('../handleRoomAction');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { loadCharactersAndAnimations } = require('../gameState');
const { findClosestWord } = require('../analysis');

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
        const botUserId = interaction.client.user.id;


        // Get the user who initiated the command
        const interactionUser = interaction.user;

        const charactersData = loadCharactersAndAnimations();
        if (startMonitoring === null) missingParams.push('start');
        if (!monitoringTime) missingParams.push('time');
        if (!roomName) missingParams.push('roomname');
        if (!selectedUser) missingParams.push('user');

        if (missingParams.length > 0) {
            const missingParamsList = missingParams.join(', ');
            interaction.reply(`Invalid command. Please provide the following parameters: ${missingParamsList}.`);
            return; // Exit the function early if any parameters are missing
        }

        if(selectedUser.id == botUserId){
            interaction.reply(`Invalid user selected. the bot cannot reply to your challenge. Try /botbattle if you want to converse with bot`);
            return; // Exit the function early if bot is chosen
        }

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
                    monitoredMessages.push(messageObject);
                    messageContext += `${message.author.username}:${message.content}.\n`
                    if (lastUserId && lastUserId !== message.author.id) {
                        const clientsArray = Array.from(room.clients);
                        const newSpeaker = clientsArray.find(client => client !== room.speaker);
                        
                        if (newSpeaker) {
                            const tempSpeaker = room.speaker;
                            room.speaker = newSpeaker;
                            room.listener = tempSpeaker;
                            lastSide = room.side = room.speaker.side;
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
                    }
                    setTimeout(() => {
                        lastUserId = message.author.id;
                        randomFunction(loadPoseForMessage,0.8,message);
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
                    }, 3000);
                }
                function randomFunction(func, probability ,...params) {
                    if (Math.random() < probability) {
                        func(...params);
                    }
                }
                function loadPoseForMessage(message) {
                    const characterInfo = charactersData[room.speaker.spriteKey];
                    const animationKey = characterInfo.animations[findClosestWord(message.content,characterInfo.animationList)].animationKey;
                    broadcastToRoom(room, JSON.stringify({ type: 'loadPose', data: { side:room.speaker.side, animation:animationKey, characterKey:room.speaker.spriteKey }, roomInfo: getRoomInfo(room) }));

                }
                messageCollector.on('collect', (message) => {
                    // Determine which user sent the message
                    const currentUser = message.author.id === selectedUser.id ? 'selectedUser' : 'interactionUser';
                    // Call the function to handle the collected message
                    handleCollectedMessage(message, currentUser);
                });

                messageCollector.on('end', async () => {
                    broadcastToRoom(room, JSON.stringify({ type: 'loadingJudgement' }));
                    console.log('Monitoring ended.');
                    // Monitoring ended
                    judgeConversation(messageContext)
                        .then((judgeResult) => {
                            broadcastToRoom(room, JSON.stringify({ type: 'judgement', data: judgeResult }));
                            interaction.followUp(`${judgeResult.result}\n${judgeResult.explanation}`);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                    console.log('Monitoring ended.');
                    messageCollector = null; // Reset messageCollector
                });
                // Fetch the User object for the selected user
                // const user = await interaction.client.users.fetch(selectedUser.id);

                // Send a message directly to the selected user
                // await user.send({ content: `Monitoring started for ${monitoringTime} minutes in the room ${roomName}.` });
                const url = `https://courtroomdramabeta.onrender.com/joinGame?room=${roomName}&name=${selectedUser.username}`;
                interaction.reply(`${interactionUser.username} has started a debate against ${selectedUser.username} on the topic ${room.topic} for ${monitoringTime} minutes in the room ${roomName}.\n ${url}`);

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

