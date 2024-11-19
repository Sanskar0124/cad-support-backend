// Packages
const reel = require('node-reel');

// Helpers
const cronCheckServiceHealth = require('./health-check/cronCheckServiceHealth');

module.exports = () => {
  reel()
    .call(() => {
      cronCheckServiceHealth('backend');
      cronCheckServiceHealth('calendar');
      cronCheckServiceHealth('call');
      cronCheckServiceHealth('cadencetracking.com');
      cronCheckServiceHealth('mail');
      cronCheckServiceHealth('task');
      cronCheckServiceHealth('lead-extension');
      cronCheckServiceHealth('cadence-dev');
      cronCheckServiceHealth('automated-workflow');
      cronCheckServiceHealth('cadence-go');
    })
    .everyMinute()
    .run();
};
