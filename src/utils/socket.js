const logger = require('../../../cadence-support-brain/src/utils/winston');

const sendActivity = async (activity) => {
  try {
    // if found, send
    if (activity) global.socket.emit('Activity', activity);
    return [`Activity sent to frontend by socket`, null];
  } catch (err) {
    logger.error(`Error while sending activity through socket: ${err.message}`);
    return [null, err];
  }
};

const SocketHelper = {
  sendActivity,
};

module.exports = SocketHelper;
