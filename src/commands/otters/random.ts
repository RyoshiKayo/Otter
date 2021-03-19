import { Message } from 'discord.js';
import { Command } from 'discord.js-commando';
import type { CommandoClient, CommandoMessage } from 'discord.js-commando';

export default class random extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'otter:random',
      group: 'otters',
      memberName: 'otterrandom',
      description: '[Not implemented] Show a random image of an otter',
    });
  }

  run(msg: CommandoMessage): Promise<Message | Message[] | null> | null {
    return msg.channel.send(`Not implemented`);
  }
}
