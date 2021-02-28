import { config } from 'dotenv';
config();
import * as Commando from 'discord.js-commando';

let PREFIX: string = process.env.DISCORD_BOT_PREFIX;

const client = new Commando.Client({
  owner: process.env.DISCORD_BOT_OWNER,
  commandPrefix: PREFIX,
  commandEditableDuration: 60,
});

client.registry
  .registerGroups([['otters', 'Commands for Otters']])
  .registerDefaults();

client.login(process.env.DISCORD_BOT_TOKEN);
