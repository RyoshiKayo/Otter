import { config } from 'dotenv';
config();
import * as Commando from 'discord.js-commando';

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN must be defined!');
}

if (!process.env.DISCORD_BOT_OWNER) {
  throw new Error('DISCORD_BOT_OWNER must be defined!');
}

let PREFIX: string;
if (process.env.DISCORD_BOT_PREFIX) {
  PREFIX = process.env.DISCORD_BOT_PREFIX;
  console.log(`Using prefix: ${PREFIX}`);
} else {
  throw new Error('DISCORD_BOT_TOKEN must be defined!');
}

const client = new Commando.Client({
  owner: process.env.DISCORD_BOT_OWNER,
  commandPrefix: PREFIX,
  commandEditableDuration: 60,
});

client.registry
  .registerGroups([['otters', 'Commands for Otters']])
  .registerDefaults();

client.login(process.env.DISCORD_BOT_TOKEN);
