// Packages
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('../../cadence-support-brain/src/utils/winston');

const app = express();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(
  express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 })
);
app.use(cors());
app.use(helmet());
app.use(morgan('common', { stream: logger.stream }));
app.use(express.json());

// Routes imports
const Routes = require('./routes');

// Routes
app.use('/v1', Routes);

app.get('/', (_, res) => {
  res.status(200).send('cadence support backend up and running');
});

module.exports = app;
