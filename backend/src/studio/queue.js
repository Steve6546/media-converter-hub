const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const buildRedisConnection = () => {
  if (process.env.REDIS_URL) {
    return new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 2000,
    });
  }

  return new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 2000,
  });
};

const studioQueueName = 'studio';
let connection;
let studioQueue;

const getConnection = () => {
  if (!connection) {
    connection = buildRedisConnection();
  }
  return connection;
};

const getStudioQueue = () => {
  if (!studioQueue) {
    studioQueue = new Queue(studioQueueName, { connection: getConnection() });
  }
  return studioQueue;
};

module.exports = {
  studioQueueName,
  getConnection,
  getStudioQueue,
};
