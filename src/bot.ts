import { config } from 'dotenv';
config();
import * as Discord from 'discord.js';
const client = new Discord.Client();

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN must be defined!');
}

client.on('ready', () => {
  console.log(`Ready!`);
});

client.on('message', (message) => {
  if (!message.content.startsWith(`o!`)) return;

  if (message.content.startsWith(`o!ping`)) return message.reply(`pong!`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
