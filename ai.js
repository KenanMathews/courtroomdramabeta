const Anthropic = require('@anthropic-ai/sdk');
const { storeAIChatMessage, updateAIChatMessage } = require('./supabase')
require('dotenv').config();

const CLAUDE_AI_API_KEY = process.env.CLAUDE_AI_API_KEY;

function initializeAnthropic() {
    return new Anthropic({
        apiKey: CLAUDE_AI_API_KEY
    });
}

async function streamTextViaWebSocket(room, aiChatBoxId, botId, prompt, chatLog) {
    const anthropic = initializeAnthropic();
    let output = "";
    const messageId = await storeAIChatMessage(aiChatBoxId,botId,"");
    const systemPrompt = getSystemPrompt(room)
    if(messageId !== null){
        let messages = [{ "role": "user", "content": prompt }];
        if (!aiChatBoxId) {
            console.error('Error fetching AI chat box ID.');
            return;
        }
        try {
            const stream = await anthropic.messages.stream({
                messages: messages,
                model: 'claude-3-opus-20240229',
                max_tokens: 1024,
                system:systemPrompt
            });
    
            stream.on('text', (text) => {
                output += text;
                const tempMessage = {
                    id: messageId,
                    user_id: botId,
                    user: "AI Assistant", // Assuming the AI assistant doesn't have a specific user name
                    message: output,
                    is_bot: true,
                    timestamp: new Date().getTime(), // Use current timestamp
                };
                room.speaker.send(JSON.stringify({ type: 'generatedText', data: {message:tempMessage, messageId:messageId} }));
            });
    
            stream.on('error', (error) => {
                console.error('WebSocket streaming error:', error);
            });
    
            stream.on('end', async () => {
                // Append the final assistant's output to the chat log
                messages.push({ "role": "assistant", "content": output });
    
                // Construct tempMessage from scratch
                const tempMessage = {
                    id: messageId,
                    user_id: botId,
                    user: "AI Assistant", // Assuming the AI assistant doesn't have a specific user name
                    message: output,
                    is_bot: true,
                    timestamp: new Date().getTime(), // Use current timestamp
                };
    
                // Add tempMessage to the chat log
                chatLog.push(tempMessage);
    
                // Append the final chat log to the room's AI chat box
                room.aiChatBoxes = room.aiChatBoxes || {};
                room.aiChatBoxes[aiChatBoxId] = room.aiChatBoxes[aiChatBoxId] || {};
                room.aiChatBoxes[aiChatBoxId].chatLog = chatLog;
                room.speaker.send(JSON.stringify({ type: 'generationComplete' , data: {"chatLog":chatLog}}));
                await updateAIChatMessage(messageId, output);
            })
        } catch (error) {
            console.error('WebSocket streaming setup error:', error);
        }
    } 
}

function getSystemPrompt(room){
    const currentUser = room.speaker.user_name;
    const topic = room.topic;
    const chatInfo = room.chatInfo;
    const side = room.side;
    return `There are two people who have entered the courtroom.You are assisting ${currentUser} with talking points to the arguments he needs. The topic is ${topic} that has been set. The side you are on is the ${side} and the chat log so far is: ${chatInfo.chatLog}. Give me short and concise answers if possible and you can make up information as you go.`
}


module.exports = {
    streamTextViaWebSocket
}
