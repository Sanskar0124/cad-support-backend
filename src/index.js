require('dotenv').config({ path: `./.env.${process.env.NODE_ENV}` });
require('../../cadence-support-brain/src/utils/winston');

const { sequelize } = require('../../Cadence-Brain/src/db/models');
const app = require('./app');
const logger = require('../../cadence-support-brain/src/utils/winston');
const http = require('http');
const os = require('os');
const path = require('path');
const { WorkerPool } = require('../../Cadence-Brain/src/helper/worker-threads');

// Port setup
const {
  PORT,
  NODE_ENV,
} = require('../../cadence-support-brain/src/utils/config');
const port = PORT || 8081;

// Set up http server
const server = http.createServer(app);
global.io = require('socket.io')(server);
global.worker_pool = new WorkerPool(
  os.cpus().length,
  path.resolve(
    __dirname,
    '../../Cadence-Brain/src/helper/worker-threads/worker.js'
  )
);

// Connection to database
sequelize
  .authenticate()
  .then(() => {
    logger.info('Successfully connected to db');
    server.listen(port, () =>
      logger.info(`Server running on port ${port} in ${NODE_ENV} mode`)
    );

    // socket connection
    global.io.on('connection', (socket) => {
      global.socket = socket;
      logger.info('USER CONNECTED TO SOCKET:- ' + socket.id);
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to db', err);
  });

// Cron job imports
const CronJobs = require('./cron');
CronJobs.minute();
