import { config } from 'dotenv';
config();
import { ShardingManager } from 'discord.js';
import * as http from 'http';
import { log } from './logging';
import { acquireShards } from './providers/shardLockProvider';
import { metricScope, Unit } from 'aws-embedded-metrics';

metricScope((metrics) => async () => {
  metrics.setNamespace('Otter/Commando');

  let shardList: number[];
  try {
    shardList = await acquireShards(+process.env.DISCORD_BOT_MAX_SHARD_LOCKS);
  } catch (error) {
    throw error;
  }

  if (shardList === undefined || shardList.length < 1)
    throw new Error(`Shard list must be > 1`);
  else log.info(`Locked shards ${shardList.join(',')}`);

  const manager = new ShardingManager('./lib/bot.js', {
    token: process.env.DISCORD_BOT_TOKEN,
    totalShards: 'auto',
    mode: 'process',
    shardList,
  });

  manager.on('shardCreate', (shard) => {
    log.info(`Launched shard ${shard.id}`, { shard: shard.id });
    metrics.putMetric('shardCount', 1, Unit.Count);
  });

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
        console.log('foo');
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const taskInfo = JSON.parse(data);
          process.env.ECS_TASK_ARN = taskInfo.TaskARN;
        });
      })
      .on('error', (err) => log.error(`Failed to get ECS task info: ${err}`));
  }
})();
