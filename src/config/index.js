const dotenv = require('dotenv');

dotenv.config();

const parseList = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/easychair',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  payments: {
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'dev-shared-secret',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  superAdminEmails: parseList(process.env.SUPER_ADMIN_EMAILS),
};
