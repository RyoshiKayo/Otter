import { config } from 'dotenv';
config();
import { ShardingManager } from 'discord.js';
import * as http from 'http';
import { log } from './logging';

const manager = new ShardingManager('./lib/bot.js', {
  token: process.env.DISCORD_BOT_TOKEN,
  totalShards: 1,
  mode: 'process',
  shardList: [0],
});

manager.on('shardCreate', (shard) =>
  log.info(`Launched shard ${shard.id}`, { shard: shard.id })
);

manager.spawn();

// To make the LoadBalancer register us as a healthy host.
if (
  process.env.AWS_EXECUTION_ENV &&
  process.env.AWS_EXECUTION_ENV == 'AWS_ECS_FARGATE'
) {
  const PORT = 80;
  http
    .createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Loadbalancer port check\n');
    })
    .listen(PORT);
  log.info(`Launched HTTP server on port: ${PORT}`);
}
