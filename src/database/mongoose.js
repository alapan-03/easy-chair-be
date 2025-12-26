const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../config/logger');

const connectToDatabase = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri);
    logger.info({ msg: 'Connected to MongoDB', mongoUri: config.mongoUri });
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    throw error;
  }
};

module.exports = {
  connectToDatabase,
};
