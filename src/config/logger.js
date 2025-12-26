const pino = require('pino');
const config = require('./index');

const logger = pino({
  level: config.logging.level,
  transport:
    config.env === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:standard',
            colorize: true,
          },
        }
      : undefined,
});

module.exports = logger;
