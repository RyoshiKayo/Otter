import { Message } from 'discord.js';
import { Command } from 'discord.js-commando';
import type { CommandoClient, CommandoMessage } from 'discord.js-commando';
import { AWSExecutionTimeMetricAsync } from '../../decorators/AWSExecutionTimeMetric';

export default class random extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'otter:random',
      group: 'otters',
      memberName: 'otterrandom',
      description: '[Not implemented] Show a random image of an otter',
    });
  }

  @AWSExecutionTimeMetricAsync('Otter/Commando', {
    Service: 'OtterBotService',
    Operation: 'otter:random',
    Host: process.env.HOST,
    Task: process.env.ECS_TASK_ARN,
  })
  run(msg: CommandoMessage): Promise<Message | Message[] | null> | null {
    return msg.channel.send(`Not implemented`);
  }
}
