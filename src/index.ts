import { config } from 'dotenv';
config();

import { ShardingManager } from 'discord.js';

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN must be defined!');
}

const manager = new ShardingManager('./dist/bot.js', {
  totalShards: 'auto',
  token: process.env.DISCORD_BOT_TOKEN,
});

manager.on('shardCreate', (shard) => console.log(`Shard ${shard.id} launched`));

manager.spawn();
