const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { connectToDatabase } = require('./database/mongoose');

const start = async () => {
  try {
    await connectToDatabase();
    app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Server started');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
