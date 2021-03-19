const SettingProvider = require('../../node_modules/discord.js-commando/src/providers/base.js');

/**
 * Uses an SQLite database to store settings with guilds
 * @extends {SettingProvider}
 */
class DynamoDBProvider extends SettingProvider {
  /**
   * @external DynamoDB
   * @see {@link https://www.npmjs.com/package/dynamodb}
   */

  /**
   * @param {DynamoDB} docClient - Configured DynamoDB Document Client
   * @see {@link https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/dynamodb-example-document-client.html}
   *
   * @param {DynamoDB} tableName - Name of the table in AWS
   */
  constructor(docClient, tableName) {
    super();

    /**
     * Database that will be used for storing/retrieving settings
     * @type {DynamoDB}
     */
    this.docClient = docClient;

    /**
     * Name of the table in AWS
     * @type {DynamoDB}
     */
    this.tableName = tableName;

    /**
     * Client that the provider is for (set once the client is ready, after using {@link CommandoClient#setProvider})
     * @name DynamoDBProvider#client
     * @type {CommandoClient}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: null, writable: true });

    /**
     * Settings cached in memory, mapped by guild ID (or 'global')
     * @type {Map}
     * @private
     */
    this.settings = new Map();

    /**
     * Listeners on the Client, mapped by the event name
     * @type {Map}
     * @private
     */
    this.listeners = new Map();
  }

  async validateAWSConfig() {
    const requiredEnvVars = [
      'AWS_DEFAULT_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ];

    requiredEnvVars.forEach((envVar) => {
      if (!process.env[envVar] || process.env[envVar] === '') {
        throw new Error(`${envVar} must be set!`);
      }
    });
  }

  async init(client) {
    // this.validateAWSConfig();
    this.client = client;

    // Load all settings
    const _params = {
      TableName: this.tableName,
      FilterExpression: 'enabled = :val',
      ExpressionAttributeValues: { ':val': 1 },
    };

    let scanRes;
    try {
      scanRes = await this.docClient.scan(_params, this.onScan).promise();
    } catch (error) {
      this.client.emit(
        'warn',
        `DynamoDBProvider Unable to run intial scan: ${error}`
      );
    }
    console.log(JSON.stringify(scanRes));

    for (const item of scanRes.Items) {
      let settings = item.settings;
      const guild = item.guild !== '0' ? item.guild : 'global';
      this.settings.set(guild, settings);
      if (guild !== 'global' && !client.guilds.cache.has(item.guild)) continue;
      this.loadGuild(guild, settings);
    }

    client.guilds.cache.forEach(async (guild) => {
      if (this.settings.has(guild.id)) return;

      const _params = {
        TableName: this.tableName,
        Item: {
          guild: guild.id,
          enabled: 1,
          settings: {
            prefix: process.env.DISCORD_BOT_PREFIX,
          },
        },
      };

      try {
        await this.docClient.put(_params).promise();
      } catch (error) {
        this.client.emit(
          'warn',
          `DynamoDBProvider failed to setup guild in DynamoDB: ${guild}`
        );
        console.log(error);
      } finally {
        this.client.emit('debug', `DynamoDBProvider setup new guild ${guild}`);
      }
    });

    // Listen for changes
    this.listeners
      .set('commandPrefixChange', (guild, prefix) =>
        this.set(guild, 'prefix', prefix)
      )
      .set('commandStatusChange', (guild, command, enabled) =>
        this.set(guild, `cmd-${command.name}`, enabled)
      )
      .set('groupStatusChange', (guild, group, enabled) =>
        this.set(guild, `grp-${group.id}`, enabled)
      )
      .set('guildCreate', async (guild) => {
        const settings = this.settings.get(guild.id);
        if (!settings) return;
        await this.loadGuild(guild.id, settings);
      })
      .set('commandRegister', (command) => {
        for (const [guild, settings] of this.settings) {
          if (guild !== 'global' && !client.guilds.cache.has(guild)) continue;
          this.loadGuildCommand(
            client.guilds.cache.get(guild),
            command,
            settings
          );
        }
      })
      .set('groupRegister', (group) => {
        for (const [guild, settings] of this.settings) {
          if (guild !== 'global' && !client.guilds.cache.has(guild)) continue;
          this.setupGuildGroup(client.guilds.cache.get(guild), group, settings);
        }
      });

    for (const [event, listener] of this.listeners) client.on(event, listener);
  }

  async onScan(err, data) {
    if (err) {
      console.error(
        'Unable to scan the table. Error JSON:',
        JSON.stringify(err, null, 2)
      );
    } else {
      if (typeof data.LastEvaluatedKey !== 'undefined') {
        // console.log('Scanning for more...');
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }

  async destroy() {
    // I don't think we need to do anything for the DynamoDB client?

    // Remove all listeners from the client
    for (const [event, listener] of this.listeners)
      this.client.removeListener(event, listener);
    this.listeners.clear();
  }

  get(guild, key, defVal) {
    const settings = this.settings.get(this.constructor.getGuildID(guild));
    return settings
      ? typeof settings[key] !== 'undefined'
        ? settings[key]
        : defVal
      : defVal;
  }

  async set(guild, key, val) {
    await this.update(guild, key, val);
  }

  async remove(guild, key) {
    await this.update(guild, key, undefined);
  }

  async update(guild, key, val) {
    guild = this.constructor.getGuildID(guild);

    const _params = {
      TableName: this.tableName,
      Key: { guild: guild !== 'global' ? guild : 0 },
      UpdateExpression: `SET #settings.${key} = :val`,
      ExpressionAttributeNames: {
        '#settings': 'settings',
      },
      ExpressionAttributeValues: {
        ':val': val,
      },
    };

    try {
      await this.docClient.update(_params).promise();
    } catch (error) {
      this.client.emit(
        'warn',
        `DynamoDBProvider failed to update setting guild: ${guild} Key: ${key} Value: ${val}`
      );
    } finally {
      this.client.emit(
        'debug',
        `DynamoDBProvider updating update setting for guild: ${guild} Key: ${key} Value: ${val}`
      );
    }

    if (guild === 'global') this.updateOtherShards(key, val);
    return val;
  }

  async clear(guild) {
    guild = this.constructor.getGuildID(guild);
    if (!this.settings.has(guild)) return;
    this.settings.delete(guild);

    const _params = {
      TableName: this.tableName,
      Key: { guild: guild !== 'global' ? guild : 0 },
    };

    try {
      await this.docClient.delete(_params).promise();
    } catch (error) {
      this.client.emit(
        'error',
        `DynamoDBProvider failed to delete settings for guild: ${guild}`
      );
    } finally {
      this.client.emit('debug', `DynamoDBProvider cleared guild: ${guild}`);
    }
  }

  /**
   * Loads all settings for a guild
   * @param {string} guild - Guild ID to load the settings of (or 'global')
   * @param {Object} settings - Settings to load
   * @private
   */
  async loadGuild(guild, settings) {
    if (typeof guild !== 'string')
      throw new TypeError('The guild must be a guild ID or "global".');

    guild = this.client.guilds.cache.get(guild) || null;

    // Load the command prefix
    if (settings.prefix && typeof settings.prefix !== 'undefined') {
      if (guild) guild._commandPrefix = settings.prefix;
      else this.client._commandPrefix = settings.prefix;
    }

    // Load all command/group statuses
    for (const command of this.client.registry.commands.values())
      this.loadGuildCommand(guild, command, settings);
    for (const group of this.client.registry.groups.values())
      this.loadGuildGroup(guild, group, settings);
  }

  /**
   * Sets up a command's status in a guild from the guild's settings
   * @param {?CommandoGuild} guild - Guild to set the status in
   * @param {Command} command - Command to set the status of
   * @param {Object} settings - Settings of the guild
   * @private
   */
  loadGuildCommand(guild, command, settings) {
    if (typeof settings[`cmd-${command.name}`] === 'undefined') return;
    if (guild) {
      if (!guild._commandsEnabled) guild._commandsEnabled = {};
      guild._commandsEnabled[command.name] = settings[`cmd-${command.name}`];
    } else {
      command._globalEnabled = settings[`cmd-${command.name}`];
    }
  }

  /**
   * Sets up a command group's status in a guild from the guild's settings
   * @param {?CommandoGuild} guild - Guild to set the status in
   * @param {CommandGroup} group - Group to set the status of
   * @param {Object} settings - Settings of the guild
   * @private
   */
  loadGuildGroup(guild, group, settings) {
    if (typeof settings[`grp-${group.id}`] === 'undefined') return;
    if (guild) {
      if (!guild._groupsEnabled) guild._groupsEnabled = {};
      guild._groupsEnabled[group.id] = settings[`grp-${group.id}`];
    } else {
      group._globalEnabled = settings[`grp-${group.id}`];
    }
  }

  /**
   * Updates a global setting on all other shards if using the {@link ShardingManager}.
   * @param {string} key - Key of the setting to update
   * @param {*} val - Value of the setting
   * @private
   */
  updateOtherShards(key, val) {
    if (!this.client.shard) return;
    key = JSON.stringify(key);
    val = typeof val !== 'undefined' ? JSON.stringify(val) : 'undefined';
    this.client.shard.broadcastEval(`
    		const ids = [${this.client.shard.ids.join(',')}];
    		if(!this.shard.ids.some(id => ids.includes(id)) && this.provider && this.provider.settings) {
    			let global = this.provider.settings.get('global');
    			if(!global) {
    				global = {};
    				this.provider.settings.set('global', global);
    			}
    			global[${key}] = ${val};
    		}
    	`);
  }
}

module.exports = DynamoDBProvider;
