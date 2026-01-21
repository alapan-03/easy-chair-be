require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec= require('./docs/swagger')

const routes = require('./routes');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');

const app = express();
app.use('/api/swagger/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// app.use(requestId);
// app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use((req, res, next) => {
//   logger.info({ reqId: req.id, method: req.method, url: req.originalUrl }, 'Incoming request');
//   next();
// });

app.use(routes);

app.use(errorHandler);

module.exports = app;
