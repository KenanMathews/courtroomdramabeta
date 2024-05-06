const fs = require('fs');
const path = require('path');
const https = require('https')
const Discord = require('discord.js');
const MessageStore = require('./messageStore'); 


const client = new Discord.Client({
  intents:[ Discord.GatewayIntentBits.Guilds,
  Discord.GatewayIntentBits.GuildMessages,
  Discord.GatewayIntentBits.MessageContent,
  Discord.GatewayIntentBits.DirectMessages,]
  });
client.on('messageCreate', message => {
  MessageStore.addMessage(message.channelId, message);
});
client.commands = new Discord.Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

const commandHandler = require('./commandHandler');
commandHandler(client);

client.login(process.env.DISCORD_BOT_ID);



async function getDiscordAccessToken(code) {
    try {
      const tokenParams = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: "http://localhost:8001/callback",
      });
  
      const options = {
        hostname: 'discord.com',
        port: 443,
        path: '/api/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': tokenParams.toString().length,
        },
      };
  
      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
  
          res.on('data', (chunk) => {
            data += chunk;
          });
  
          res.on('end', () => {
            const tokenResponse = JSON.parse(data);
            resolve(tokenResponse);
          });
        });
  
        req.on('error', (error) => {
          console.error(error);
          reject(error);
        });
  
        req.write(tokenParams.toString());
        req.end();
      });
    } catch (error) {
      console.log(error);
    }
  }
  
 
function getAuthorizeUrl(){
    const clientId = process.env.DISCORD_CLIENT_ID;
    const authorizationUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=0&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A8001%2Fcallback&scope=identify+guilds+email+bot+applications.commands+messages.read+dm_channels.read+dm_channels.messages.read`;
    return authorizationUrl;
}

module.exports = {client,getDiscordAccessToken,getAuthorizeUrl};