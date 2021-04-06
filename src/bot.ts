import { config } from 'dotenv';
config();
import * as Commando from 'discord.js-commando';
const DynamoDBProvider = require('./providers/dynamodb');
import * as AWS from 'aws-sdk';
import * as path from 'path';
import { log } from './logging';
import type { CommandoMessage } from 'discord.js-commando';

const PREFIX: string = process.env.DISCORD_BOT_PREFIX;
const BOT_OWNER: string = process.env.DISCORD_BOT_OWNER;
const BOT_TOKEN: string = process.env.DISCORD_BOT_TOKEN;

const readyTimerStart = new Date();

const client = new Commando.Client({
  owner: BOT_OWNER,
  commandPrefix: PREFIX,
  commandEditableDuration: 60,
});

let aws_creds;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  aws_creds = {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };
}

client.setProvider(
  new DynamoDBProvider(
    new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_DEFAULT_REGION,
      ...aws_creds,
    }),
    process.env.DISCORD_BOT_GUILD_SETTINGS_TABLE_NAME
  )
);

client.on(
  'commandRun',
  async (
    command: Commando.Command,
    res: Promise<any>,
    msg: CommandoMessage,
    args: object | string | string[],
    fromPattern: boolean
  ) => {
    let _args;
    if (typeof args === 'object') {
      _args = JSON.stringify(args);
    } else if (
      Array.isArray(args) &&
      args.length > 0 &&
      typeof args[0] === 'string'
    ) {
      _args = args.join(',');
    } else {
      _args = args;
    }

    if (command.name === 'help') return;

    log.info(`Ran ${command.name} with args: ${_args}`, {
      commandResults: await res,
      fromPattern: fromPattern,
    });
  }
);

client.registry
  .registerGroups([['otters', 'Commands related to']])
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.login(BOT_TOKEN);

client.on('shardReady', (shardId) => {
  const readyTimeDelta = Math.abs(
    new Date().getMilliseconds() - readyTimerStart.getMilliseconds()
  );
  log.info(`Shard ${shardId} Ready! (${readyTimeDelta}ms)`, {
    time: readyTimeDelta,
    shardId,
  });
});

client.on('error' || 'shardError', (error, shardId) => {
  log.error(`[Discord.js Client] Got an error!`, { error, shardId });
});

client.on('disconnect' || 'shardDisconnect', (closeEvent, shardId) => {
  log.info(`[Discord.js Client] Shard ${shardId} disconnected!`, {
    closeEvent,
    shardId,
  });
});
