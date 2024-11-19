// Utils
const logger = require('../../../../cadence-support-brain/src/utils/winston');

// Packages
const axios = require('axios');
const nodemailer = require('nodemailer');

// Helpers and service
const AmazonService = require('../../../../cadence-support-brain/src/services/Amazon');
const HtmlHelper = require('../../../../cadence-support-brain/src/helper/html');

const cronCheckServiceHealth = async (service) => {
  try {
    logger.info(`Checking ${service} Health`);
    let services = [
      'backend',
      'calendar',
      'call',
      'cadencetracking.com',
      'mail',
      'task',
      'lead-extension',
      'cadence-dev',
      'automated-workflow',
      'cadence-go',
    ];
    if (!services.includes(service)) {
      logger.error(`Service name ${service} not matched. `, services);
      return [null, `Service name ${service} not matched. `];
    }

    let url = `https://${
      service === 'cadencetracking.com' ? service : 'api.ringover-crm.xyz'
    }/${
      service === 'backend'
        ? ''
        : service === 'cadencetracking.com'
        ? ''
        : service + '/'
    }healthcheck`;

    try {
      const { data } = await axios.get(url, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      logger.error(`${service} is down`);
      let retryCount = 0;

      const retryHealthCheck = async () => {
        try {
          logger.info('Retrying....');
          const { data } = await axios.get(url, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
        } catch (error) {
          if (retryCount === 1) {
            const [mail, err] = await AmazonService.sendHtmlMails({
              subject: `Cadence Support: ${service} service is down`,
              body: HtmlHelper.serviceDown(url, service),
              emailsToSend: [
                'sanskar.sakhareliya@bjtmail.com',
                'tirthoraj.sengupta@bjtmail.com',
                'dnyaneshwar.birajdar@bjtmail.com',
                'atmadeep.das@bjtmail.com',
                'yuvi@bjtmail.com',
                'nishant.choudhary@ringover.com',
                'abhishek.prasad@ringover.com',
                'arvind.kumar@ringover.com',
              ],
            });
            if (err) {
              if (err.includes('Sending paused for this account.'))
                return serverErrorResponse(
                  res,
                  `Error while sending mails: ${err}`
                );
              return serverErrorResponse(
                res,
                `Error while sending mails: ${err}`
              );
            }
          } else retryTimeOut();
        }
      };

      const retryTimeOut = () => {
        const myTimeout = setTimeout(retryHealthCheck, 10000);
        retryCount++;
      };
      retryTimeOut();
    }
  } catch (err) {
    logger.error(`Error while checking ${service} health: `, err);
    return [null, err.message];
  }
};

module.exports = cronCheckServiceHealth;
