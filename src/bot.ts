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

const client = new Commando.Client({
  owner: BOT_OWNER,
  commandPrefix: PREFIX,
  commandEditableDuration: 60,
});

client.setProvider(
  new DynamoDBProvider(
    new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_DEFAULT_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    }),
    process.env.GUILD_SETTINGS_TABLE_NAME
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

    console.log(typeof args);
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

// This doesn't work cause client.login returns a Promise, need to figure that out.
// function metricify<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
//   return function (...args: any[]) {
//     const startTime = new Date();
//     let result: any;
//     try {
//       result = fn(...args);
//     } finally {
//       console.log(Math.abs(new Date().getTime() - startTime.getTime()));
//     }
//     return result;
//   };
// }

// const loginWithMetrics = metricify(client.login);
// loginWithMetrics(BOT_TOKEN);

client.login(BOT_TOKEN);

client.on('ready', () => log.info(`Ready!`));
