// Utils
const logger = require('../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
} = require('../../../../cadence-support-brain/src/utils/response');
const { DB_TABLES } = require('../../../../Cadence-Brain/src/utils/modelEnums');
const { DB_MODELS } = require('../../../../Cadence-Brain/src/utils/modelEnums');
const {
  ACTIVITY_STATUS,
  CRM_INTEGRATIONS,
} = require('../../../../cadence-support-brain/src/utils/enums');
const {
  USER_ROLE,
} = require('../../../../cadence-support-brain/src/utils/enums');
const {
  CRM_SERVER_URL,
} = require('../../../../cadence-support-brain/src/utils/config');

// Helpers and service
const AmazonService = require('../../../../cadence-support-brain/src/services/Amazon');
const HtmlHelper = require('../../../../cadence-support-brain/src/helper/html');

// DB
const { sequelize } = require('../../../../Cadence-Brain/src/db/models');

// Repositories
const Repository = require('../../../../cadence-support-brain/src/repository');

// Joi validation
const Schema = require('../../joi/company/companies');
const dashboardSchema = require('../../joi/dashboard');

// Packages
const axios = require('axios');
const { Op } = require('sequelize');

const fetchIntegrations = async (req, res) => {
  try {
    const [company, errForCompany] = await Repository.fetchAll({
      tableName: DB_TABLES.COMPANY,
      extras: {
        subQuery: false,
        group: ['integration_type'],
        attributes: [
          [sequelize.literal(`COUNT(company_id) `), 'company_count'],
          'integration_type',
        ],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);

    const [user, errForUser] = await Repository.fetchAll({
      tableName: DB_TABLES.USER,
      extras: {
        group: ['integration_type'],
        attributes: [
          [sequelize.literal(`COUNT(user_id) `), 'user_count'],
          'integration_type',
        ],
      },
    });
    if (errForUser) return serverErrorResponse(res, errForUser);

    const result = company.map((companyItem) => {
      const userItem = user.find(
        (item) =>
          item.integration_type === companyItem.integration_type + '_user' ||
          item.integration_type === companyItem.integration_type + '_owner'
      );
      return {
        ...userItem,
        ...companyItem,
      };
    });

    return successResponse(res, 'Successfully fetched integrations.', result);
  } catch {
    logger.error('Error while fetching integrations. ', err);
    return serverErrorResponse(res, 'Error while fetching integrations.');
  }
};

const fetchAddOns = async (req, res) => {
  try {
    const [company, errForCompany] = await Repository.fetchAll({
      tableName: DB_TABLES.COMPANY,
      include: {
        [DB_TABLES.ENRICHMENTS]: {
          attributes: ['is_lusha_activated', 'is_kaspr_activated'],
        },
      },
      extras: {
        attributes: ['company_id'],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);

    const [user, errForUser] = await Repository.fetchAll({
      tableName: DB_TABLES.USER,
      include: {
        [DB_TABLES.USER_TOKEN]: {
          required: true,
          attributes: ['lusha_service_enabled', 'kaspr_service_enabled'],
        },
      },
      extras: {
        attributes: ['user_id'],
      },
    });
    if (errForUser) return serverErrorResponse(res, errForUser);

    let stats = [
      {
        name: 'Lusha',
        company_count: 0,
        user_count: 0,
      },
      {
        name: 'Kaspr',
        company_count: 0,
        user_count: 0,
      },
    ];

    for (let i = 0; i < company.length; i++) {
      if (company[i].Enrichment.is_lusha_activated) {
        stats[0].company_count++;
      }
      if (company[i].Enrichment.is_kaspr_activated) {
        stats[1].company_count++;
      }
    }

    for (let i = 0; i < user.length; i++) {
      if (user[i].User_Token.lusha_service_enabled) {
        stats[0].user_count++;
      }
      if (user[i].User_Token.kaspr_service_enabled) {
        stats[1].user_count++;
      }
    }

    return successResponse(res, 'Successfully fetched add-ons.', stats);
  } catch {
    logger.error('Error while fetching add-ons. ', err);
    return serverErrorResponse(res, 'Error while fetching add-ons.');
  }
};

const checkServiceHealth = async (req, res) => {
  try {
    const { service } = req.query;
    let services = [
      'backend',
      'calendar',
      'call',
      'cadencetracking.com',
      'mail',
      'task',
      'lead-extension',
      'marketplace',
      'cadence-dev',
      'automated-workflow',
      'cadence-go',
    ];
    if (!services.includes(service))
      return serverErrorResponse(
        res,
        `Service name  ${service} not matched. ` + services
      );

    logger.info(`Checking ${service} Health`);

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
      logger.error('Error while fetching health check = ', error);
      // sending mail when any service is down
      if (
        error?.response?.status === 408 ||
        error?.response?.status === 500 ||
        error?.response?.status === 404
      ) {
        const [mail, err] = await AmazonService.sendHtmlMails({
          subject: `Cadence Support: ${service} service is down`,
          body: HtmlHelper.serviceDown(url, service),
          emailsToSend: [
            'sanskar.sakhareliya@bjtmail.com',
            'tirthoraj.sengupta@bjtmail.com',
            'dnyaneshwar.birajdar@bjtmail.com',
            'atmadeep.das@bjtmail.com',
          ],
        });
        if (err) {
          if (err.includes('Sending paused for this account.'))
            return serverErrorResponse(
              res,
              `Error while sending mails: ${err}`
            );
          return serverErrorResponse(res, `Error while sending mails: ${err}`);
        }
        logger.error(`${service} is down`);
        return serverErrorResponse(res, `${service} is down.`);
      }
    }

    return successResponse(res, 'Service Health checked successfully.');
  } catch (err) {
    logger.error('Error while checking service health. ', err);
    return serverErrorResponse(res, 'Error while checking service health.');
  }
};

const getComapnyStatusCount = async (req, res) => {
  sequelize;
  try {
    const modelName = DB_MODELS.company;

    let response = {
      is_subscription_active: '',
      is_trial_active: '',
      expired: '',
      total_companies: '',
    };

    modelName
      .findAndCountAll({
        attributes: [
          [
            sequelize.fn('SUM', sequelize.col('is_subscription_active')),
            'is_subscription_active',
          ],
          [
            sequelize.fn('SUM', sequelize.col('is_trial_active')),
            'is_trial_active',
          ],
          [
            sequelize.fn(
              'SUM',
              sequelize.literal(
                'CASE WHEN is_subscription_active = false AND is_trial_active = false THEN 1 ELSE 0 END'
              )
            ),
            'neitherCount',
          ],
          [sequelize.fn('COUNT', sequelize.col('*')), 'totalCount'],
        ],
      })
      .then((result) => {
        response.is_subscription_active =
          result.rows[0].dataValues.is_subscription_active;
        response.is_trial_active = result.rows[0].dataValues.is_trial_active;
        response.expired = result.rows[0].dataValues.neitherCount;
        response.total_companies = result.rows[0].dataValues.totalCount;

        return successResponse(
          res,
          'Company status fetched successfully.',
          response
        );
      });
  } catch (err) {
    logger.error('Error while fetching company status.', err);
    return serverErrorResponse(res, 'Error while fetching company status.');
  }
};

const getActivity = async (req, res) => {
  try {
    const { error, value } = Schema.validate(req.query);
    if (error) return badRequestResponse(res, error.message);

    if (parseInt(value.limit) + parseInt(value.offset) > 200)
      return badRequestResponse(res, 'Limit exceeded');

    const fetchLimit = parseInt(value.limit) + parseInt(value.offset);

    let query = {};
    let extrasQuery = {
      attributes: [
        'activity_id',
        'name',
        'type',
        'status',
        'comment',
        'created_at',
      ],
      subQuery: false,
    };

    if (value.search) {
      query = sequelize.where(
        sequelize.fn('lower', sequelize.col('Activity.name')),
        {
          [Op.like]: `%${value.search.toLowerCase()}%`,
        }
      );
    } else {
      extrasQuery.limit = fetchLimit;
      query = {
        status: {
          [Op.in]: [ACTIVITY_STATUS.COMPANY_ADDED],
        },
      };
    }

    let [activity, errForActivity] = await Repository.fetchAll({
      tableName: DB_TABLES.ACTIVITY,
      query,
      extras: extrasQuery,
    });
    if (errForActivity)
      return serverErrorResponse(res, `Error while fetching activity.`);

    activity = activity.slice(value.offset);
    activity = activity.slice(0, value.limit);

    return successResponse(res, `Fetched activity successfully.`, activity);
  } catch (err) {
    logger.error(`Error while fetching activity: `, err);
    return serverErrorResponse(
      res,
      `Error while fetching activity: ${err.message}`
    );
  }
};

const createCompany = async (req, res) => {
  try {
    const { error, value } = dashboardSchema.createCompanySchema.validate(
      req.body
    );
    if (error) return badRequestResponse(res, error.message);

    const { access_token } = req.agent;
    let config = {
      method: 'post',
      url: `${CRM_SERVER_URL}/v2/company/create-company`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      data: value,
    };

    await axios(config);
    return successResponse(res, 'Company Created Successfully');
  } catch (err) {
    logger.error(`Error while creating company: `, err);
    if (err?.response?.data?.error)
      return serverErrorResponse(
        res,
        `Error while creating company in backend: ${err?.response?.data?.error}`
      );

    return serverErrorResponse(
      res,
      `Error while creating company: ${err.message}`
    );
  }
};

const updateIntegration = async (req, res) => {
  try {
    const { error, value } =
      dashboardSchema.updateCompanyAndSuperAdminSchema.validate(req.body);
    if (error) return badRequestResponse(res, error.message);

    const { access_token } = req.agent;

    let config = {
      method: 'post',
      url: `${CRM_SERVER_URL}/v2/company/update-integration`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      data: value,
    };

    await axios(config);
    return successResponse(res, 'Integration Updated Successfully');
  } catch (err) {
    logger.error(`Error while updating integration: `, err);
    if (err?.response?.data?.msg)
      return serverErrorResponse(
        res,
        `Error while updating integration: ${err?.response?.data?.msg}`
      );

    return serverErrorResponse(
      res,
      `Error while updating integration: ${err.message}`
    );
  }
};

const getIntegration = async (req, res) => {
  try {
    const { company_id } = req.params;

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      include: {
        [DB_TABLES.COMPANY_SETTINGS]: {
          // required: true,
          attributes: ['phone_system', 'mail_integration_type'],
        },
        [DB_TABLES.USER]: {
          required: true,
          where: { role: USER_ROLE.SUPER_ADMIN },
          attributes: [
            'user_id',
            'first_name',
            'last_name',
            'email',
            'ringover_user_id',
            'timezone',
          ],
          [DB_TABLES.USER_TOKEN]: {
            // required: true,
            attributes: ['encrypted_ringover_api_key', 'ringover_api_key'],
          },
        },
      },
    });
    if (errForCompany)
      return serverErrorResponse(
        res,
        `Error while fetching company: ${errForCompany}`
      );

    if (!company) return badRequestResponse(res, `Company not found.`);

    if (company?.integration_type === CRM_INTEGRATIONS.DYNAMICS) {
      if (company?.User?.user_id) {
        const [tokens, errForTokens] = await Repository.fetchOne({
          tableName: DB_TABLES.DYNAMICS_TOKENS,
          query: { user_id: company.User.user_id },
          extras: {
            attributes: ['instance_url', 'encrypted_instance_url'],
          },
        });
        if (errForTokens)
          return serverErrorResponse(
            res,
            `Error while fetching instance url: ${errForTokens}`
          );

        company.instance_url = tokens?.instance_url;
      } else company.instance_url = null;
    }

    company.phone_system = company?.Company_Setting?.phone_system;
    company.mail_integration_type =
      company?.Company_Setting?.mail_integration_type;
    delete company.Company_Setting;

    if (company?.Users?.length) {
      company.User = company?.Users[0];
      if (company.User?.User_Token) {
        company.User.ringover_api_key =
          company?.User?.User_Token?.ringover_api_key;
        delete company.User.User_Token;
      }
      delete company.Users;
    }

    return successResponse(res, `Fetched integration successfully.`, company);
  } catch (err) {
    logger.error(`Error while fetching integration: `, err);
    return serverErrorResponse(
      res,
      `Error while fetching integration: ${err.message}`
    );
  }
};

const statisticControllers = {
  fetchIntegrations,
  fetchAddOns,
  checkServiceHealth,
  getComapnyStatusCount,
  getActivity,
  createCompany,
  updateIntegration,
  getIntegration,
};

module.exports = statisticControllers;
