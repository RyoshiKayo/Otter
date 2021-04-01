import * as ddbLocking from 'dynamodb-lock-client';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { promisify } from 'util';
import { log } from '../logging';

const acquireShards = async (numShardsToLock: number): Promise<number[]> => {
  let _acquiredShardLocks: number[] = [];
  const lockClient = new ddbLocking.FailOpen({
    dynamodb: new DocumentClient({
      region: process.env.AWS_DEFAULT_REGION || 'us-west-2',
    }),
    lockTable: process.env.DISCORD_BOT_SHARD_LOCK_TABLE_NAME,
    partitionKey: 'shardId',
    leaseDurationMs: 1 * 60 * 1000, // 1min
    heartbeatPeriodMs: 3 * 1000, // 3sec
  });

  const acquireLock = promisify(lockClient.acquireLock);

  const MAX_RETRIES = 10; // Max number of times we can attempt to lock a shard
  let shardIdOffset = 0; // Offset for the shard ID, this should stay at zero unless we error a lot
  for (let i = 0; i < numShardsToLock; i++) {
    let shardId = shardIdOffset + i;

    let gotLock = false;
    while (!gotLock) {
      if (shardIdOffset > MAX_RETRIES) {
        gotLock = true;
        return;
      }

      try {
        await acquireLock.call(lockClient, `shard-${shardId}`);
        _acquiredShardLocks.push(shardId);
        gotLock = true;
      } catch (error) {
        log.error(
          `Failed to acquire lock for shard ${shardId}, trying again...`,
          {
            error,
          }
        );

        /**
         * Should probably do more explicit checks here like:
         *  I think the locking library should throw the ValidationException
         *    when DDB can't create the item (ie if another Task creates the lock first)
         *    but I'd like an explicit way to check this.
         */
        shardIdOffset++;
      }
    }
  }

  return _acquiredShardLocks;
};

export { acquireShards };
