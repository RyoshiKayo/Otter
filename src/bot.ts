import { config } from 'dotenv';
config();
import * as Commando from 'discord.js-commando';

let PREFIX: string = process.env.DISCORD_BOT_PREFIX;
let BOT_OWNER: string = process.env.DISCORD_BOT_OWNER;
let BOT_TOKEN: string = process.env.DISCORD_BOT_TOKEN;

const client = new Commando.Client({
  owner: BOT_OWNER,
  commandPrefix: PREFIX,
  commandEditableDuration: 60,
});

client.registry
  .registerGroups([['otters', 'Commands for Otters']])
  .registerDefaults();

client.login(BOT_TOKEN);
