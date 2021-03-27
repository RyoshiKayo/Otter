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

// Get task ARN
if (process.env.ECS_CONTAINER_METADATA_URI_V4) {
  http
    .get(`${process.env.ECS_CONTAINER_METADATA_URI_V4}/task`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(data);

        const taskInfo = JSON.parse(data);
        process.env.ECS_TASK_ARN =
          taskInfo['Labels']['com.amazonaws.ecs.task-arn'];
      });
    })
    .on('error', (err) => log.error(`Failed to get ECS task info: ${err}`));
}
