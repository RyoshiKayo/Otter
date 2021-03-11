import { config } from 'dotenv';
config();
import { ShardingManager } from 'discord.js';

const manager = new ShardingManager('./lib/bot.js', {
  token: process.env.DISCORD_BOT_TOKEN,
  totalShards: 1,
  mode: 'process',
  shardList: [1],
});

manager.on('shardCreate', (shard) => console.log(`Launched shard ${shard.id}`));

manager.spawn();
