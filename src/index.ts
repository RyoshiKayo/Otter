import { config } from 'dotenv';
config();
import { ShardingManager } from 'discord.js';
import * as http from 'http';

const manager = new ShardingManager('./lib/bot.js', {
  token: process.env.DISCORD_BOT_TOKEN,
  totalShards: 1,
  mode: 'process',
  shardList: [1],
});

manager.on('shardCreate', (shard) => console.log(`Launched shard ${shard.id}`));

manager.spawn();

// To make the LoadBalancer register us as a healthy host.
http
  .createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Loadbalancer port check\n');
  })
  .listen(80);
