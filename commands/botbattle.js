const { replayRoomByName, getRoomObj } = require('../rooms');
const { judgeConversation, generateReply, isTextAIGenerated } = require('../ai');
const { broadcastToRoom, getRoomInfo, handleChatMessage, handleObjection, handleHoldIt } = require('../handleRoomAction');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { loadCharactersAndAnimations } = require('../gameState');
const { findOrCreateBot } = require('../supabase');
const { findClosestWord } = require('../analysis');

let messageCollector;

const monitoredMessages = [];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botbattle')
        .setDescription('Start, stop, or configure bot battle chat for new messages within a time frame')
        .addStringOption(option =>
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
        const botUserId = interaction.client.user.id;
        const botUsername = interaction.client.user.username;
        let botStarted = false;
        const botGameId = await findOrCreateBot();
        const missingParams = [];
        const messageIdMap = new Map();
        if (startMonitoring === null) missingParams.push('start');
        if (!monitoringTime) missingParams.push('time');
        if (!roomName) missingParams.push('roomname');

        if (missingParams.length > 0) {
            const missingParamsList = missingParams.join(', ');
            interaction.reply(`Invalid command. Please provide the following parameters: ${missingParamsList}.`);
            return; // Exit the function early if any parameters are missing
        }
        // Get the user who initiated the command
        const interactionUser = interaction.user;

        const charactersData = loadCharactersAndAnimations();

        if (startMonitoring && !messageCollector && monitoringTime && roomName) {
            // Start monitoring
            const timeFrame = monitoringTime; // Time frame in minutes

            // Get the current time in milliseconds
            const currentTime = new Date().getTime();

            // Calculate the start time based on the time frame
            const startTime = currentTime - (timeFrame * 60000); // Convert minutes to milliseconds
            let room = getRoomObj(roomName)
            if (room) {
                const firstClient = Array.from(room.clients)[0];
                const user_id = firstClient.user_id;
                let lastUserId = null;
                let lastSide = room.side;
                ws = { user_name: 'DummyUser', user_id: botGameId, send: () => { } };
                ws.side = botSide = lastSide == 'defence' ? 'prosecution' : 'defence';
                ws.spriteKey = ws.side === 'defence' ? 'character-phoenixwright' : 'character-milesedgeworth';
                room.listener = ws;
                room.is_bot_battle = true;
                room.clients.add(ws)
                let messageContext = '';

                messageCollector = interaction.channel.createMessageCollector({
                    filter: (msg) => {
                        // Check if the message is within the time frame and from either the selected user or the interaction user
                        return msg.author.id === interactionUser.id && msg.author.id != botUserId;
                    },
                    time: monitoringTime * 60000 // Time to keep collecting messages (in milliseconds)
                });
                async function handleCollectedMessage(message) {
                    const messageId = await handleChatMessage(room, message.content, {
                        userId: user_id,
                        name: message.author.username
                    });

                    if (messageId === null) {
                        console.error('Error handling chat message.');
                        return;
                    }
                    messageIdMap.set(message.id, messageId);

                    // Construct message object in the desired format
                    const messageObject = {
                        id: message.id,
                        user_id: user_id,
                        user: message.author.username,
                        message: message.content,
                        timestamp: message.createdTimestamp,
                        room_name: roomName,
                    };
                    monitoredMessages.push(messageObject);
                    messageContext += `${message.author.username}:${message.content}.\n`;
                    lastUserId = message.author.id;
                    randomFunction(loadPoseForMessage, 0.5, message);
                    randomFunction(async ()=>{
                        const textClassification = await isTextAIGenerated(message.content);
                        if (textClassification.includes('ai-generated')) {
                            const text = `Are you using gen AI to talk to me?`;
                            interaction.channel.send(text);
                            messageContext += `${botUsername}:${text}`;
                        }
                    } ,0.2, message);
                    if (message.reference && message.author.id != botUserId) {
                        setTimeout(async () => {
                            // Check if the message is a reply to the last message sent by the other user
                            const referencedMessage = monitoredMessages.find(msg => msg.id === message.reference.messageId);
                            const discordMessageId = message.reference.messageId;
                            const serverMessageId = messageIdMap.get(discordMessageId);
                            if (referencedMessage) {
                                const actionId = await handleHoldIt(room, {
                                    userId: user_id,
                                    name: message.author.username
                                });
                                if(actionId){
                                    const holdItTriggeredObject = {
                                        id: actionId,
                                        room_id: message.channelId,
                                        user_id: user_id,
                                        action: 'holdItTriggered',
                                        data: { userId: message.author.id, userName: message.author.username },
                                    };
                                    monitoredMessages.push(holdItTriggeredObject);
                                    // Adding a timeout between the two replayRoomByName calls
                                    setTimeout(async () => {
                                        await handleObjection(room, {
                                            userId: referencedMessage.user_id,
                                            name: referencedMessage.user
                                        }, serverMessageId);
                                    }, 5000);
                                }
                            }
                        }, 2000);
                    }
                }
                function changeSide(username, user_id) {
                    const clientsArray = Array.from(room.clients);
                    const newSpeaker = clientsArray.find(client => client !== room.speaker);

                    if (newSpeaker) {
                        const tempSpeaker = room.speaker;
                        room.speaker = newSpeaker;
                        room.listener = tempSpeaker;
                        lastSide = room.side = room.speaker.side;
                        const objectBeforeMessage = {
                            id: "switch",
                            room_id: room.id,
                            user_id: user_id,
                            action: 'speakerSwitched',
                            data: { userName: username, side: lastSide },
                            table: 'user_actions'
                        };
                        monitoredMessages.push(objectBeforeMessage);
                        replayRoomByName(roomName, objectBeforeMessage);
                    }
                }
                function randomFunction(func, probability, ...params) {
                    if (Math.random() < probability) {
                        func(...params);
                    }
                }
                function loadPoseForMessage(message) {
                    const characterInfo = charactersData[room.speaker.spriteKey];
                    const animationKey = characterInfo.animations[findClosestWord(message.content, characterInfo.animationList)].animationKey;
                    broadcastToRoom(room, JSON.stringify({ type: 'loadPose', data: { side: room.speaker.side, animation: animationKey, characterKey: room.speaker.spriteKey }, roomInfo: getRoomInfo(room) }));

                }
                messageCollector.on('collect', async (message) => {

                    // Call the function to handle the collected message
                    await handleCollectedMessage(message);

                    // Check if the message is from the bot and skip reply for bot
                    if (message.author.id === botUserId) {
                        return;
                    }
                    // Check if lastUserId is not null before calling changeSide
                    if (botStarted) {
                        changeSide(message.author.username, room.speaker.user_id);
                    }
                    // Call the desired function here
                    const reply = await generateReply(room, botUsername, message.author.username, message);
                    const messageObject = {
                        id: message.id,
                        room_id: message.channelId,
                        user_id: botGameId,
                        user: botUsername,
                        message: reply,
                        timestamp: message.createdTimestamp,
                        room_name: roomName,
                        table: 'chat_messages'
                    };
                    monitoredMessages.push(messageObject);
                    messageContext += `${botUsername}:${reply}.\n`;
                    interaction.channel.send(reply);
                    lastUserId = botUserId;
                    botStarted = true;
                    changeSide(botUsername, lastUserId);
                    replayRoomByName(roomName, messageObject);
                });

                messageCollector.on('end', async () => {
                    broadcastToRoom(room, JSON.stringify({ type: 'loadingJudgement' }));
                    console.log('Monitoring ended.');
                    // Monitoring ended
                    judgeConversation(messageContext)
                        .then((judgeResult) => {
                            broadcastToRoom(room, JSON.stringify({ type: 'judgement', data: judgeResult }));
                            interaction.channel.send(`${judgeResult.result}\n${judgeResult.explanation}`);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                    console.log('Monitoring ended.');
                    messageCollector = null; // Reset messageCollector
                });

                interaction.reply(`${interactionUser.username} has started a debate against ${botUsername} on the topic ${room.topic} for ${monitoringTime} minutes in the room ${roomName}.`);
                broadcastToRoom(room, JSON.stringify({ type: 'botJoined', data: room.speaker.spriteKey, roomInfo: getRoomInfo(room) }));


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

