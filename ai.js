const Anthropic = require('@anthropic-ai/sdk');
const { storeAIChatMessage, updateAIChatMessage, getRandomTopics, storeTopics } = require('./supabase')
require('dotenv').config();
const jb = require('json-buffer');
const readline = require("readline");
const exp = require('constants');

const CLAUDE_AI_API_KEY = process.env.CLAUDE_AI_API_KEY;

function initializeAnthropic() {
    return new Anthropic({
        apiKey: CLAUDE_AI_API_KEY
    });
}

async function streamTextViaWebSocket(room, aiChatBoxId, botId, prompt, chatLog) {
    const anthropic = initializeAnthropic();
    let output = "";
    const messageId = await storeAIChatMessage(aiChatBoxId, botId, "");
    const systemPrompt = getSystemPrompt(room)
    if (messageId !== null) {
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
                system: systemPrompt
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
                room.speaker.send(JSON.stringify({ type: 'generatedText', data: { message: tempMessage, messageId: messageId } }));
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
                room.speaker.send(JSON.stringify({ type: 'generationComplete', data: { "chatLog": chatLog } }));
                await updateAIChatMessage(messageId, output);
            })
        } catch (error) {
            console.error('WebSocket streaming setup error:', error);
        }
    }
}
async function judgeConversation(conversation) {
    const anthropic = initializeAnthropic();

    // Prepare the prompt
    const prompt = `Analyze the following conversation and provide a score between 0 and 5 for each speaker, considering factors like their use of evidence, logical reasoning, and persuasive language. Also, provide a brief explanation for each score. 

    The output should be formatted as follows:
    
    Speaker's Name's Score: X
    Explanation: ...
    
    Speaker's Name's Score: Y
    Explanation: ...
    
    Where 'X' and 'Y' are the scores for each speaker, and the explanations follow the corresponding scores.
    
    Finally, determine the winner by stating "The winner of the conversation is: [Speaker's Name]".
    
    ${conversation}`;

    const messages = [
        { role: "user", content: prompt },
    ];

    const stream = await anthropic.messages.stream({
        messages,
        model: "claude-3-opus-20240229",
        max_tokens: 1000, // Adjust as needed
        stop_sequences: [],
    });

    let output = "";
    stream.on('text', (text) => {
        output += text;
    });

    return new Promise((resolve, reject) => {
        stream.on('end', async () => {
            const analysis = output.trim();

            // Parse the analysis
            const scores = {};
            const lines = analysis.split("\n\n");
            for (const line of lines) {
                const [scoreText, explanation] = line.split("\n");
                const [speaker, score] = scoreText.split("'s Score: ");
                scores[speaker] = { score: parseInt(score, 10), explanation };
            }

            // Determine the winner
            let winner = null;
            let maxScore = -Infinity;
            let explanation = '';
            for (const [speaker, score] of Object.entries(scores)) {
                if (score.score > maxScore) {
                    winner = speaker;
                    maxScore = score.score;
                    explanation = score.explanation;
                }
            }


            console.log(`\nThe winner of the conversation is: ${winner}`);
            resolve({result:`\nThe winner of the conversation is: ${winner}`,winner, maxScore,explanation });

        });

        stream.on('error', (error) => {
            reject(error);
        });
    });
}

function getSystemPrompt(room) {
    const currentUser = room.speaker.user_name;
    const topic = room.topic;
    const chatInfo = room.chatInfo;
    const side = room.side;
    return `There are two people who have entered the courtroom.You are assisting ${currentUser} with talking points to the arguments he needs. The topic is ${topic} that has been set. The side you are on is the ${side} and the chat log so far is: ${chatInfo.chatLog}. Give me short and concise answers if possible and you can make up information as you go.`
}

async function getTopicsForRoom() {
    const anthropic = initializeAnthropic();
    const prompt = 'I need 15 topics for a debate about general knowledge/funny topics formatted as json in format["Topic 1","Topic 2",.....]';
    let output = '';
    let messages = [{ "role": "user", "content": prompt }];

    return new Promise((resolve, reject) => {
        const stream = anthropic.messages.stream({
            messages: messages,
            model: 'claude-3-opus-20240229',
            max_tokens: 1024,
        });

        stream.on('text', (text) => {
            output += text;
        });

        stream.on('end', () => {
            const startIndex = output.indexOf('[');
            const endIndex = output.lastIndexOf(']');
            const jsonSubstring = output.substring(startIndex, endIndex + 1);

            try {
                const jsonArray = JSON.parse(jsonSubstring);
                resolve(jsonArray);
            } catch (error) {
                console.error('Error parsing JSON:', error.message);
                reject(error);
            }
        });

        stream.on('error', (error) => {
            console.error('Error in stream:', error);
            reject(error);
        });
    });
}

async function getTopicsFromDB() {
    let topics = await getRandomTopics(5);
    if (topics.length == 0) {
        topics = await getTopicsForRoom();
        storeTopics(topics);
    }
    return topics;
}
module.exports = {
    streamTextViaWebSocket,
    getTopicsFromDB,
    judgeConversation,
}
