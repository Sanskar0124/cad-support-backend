// Utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');
const {
  DB_TABLES,
} = require('../../../../../Cadence-Brain/src/utils/modelEnums');
const {
  USER_ROLE,
} = require('../../../../../cadence-support-brain/src/utils/enums');
// Packages
const { Op } = require('sequelize');

// Helper
const userHelper = require('../../../../../cadence-support-brain/src/helper/user');
const CompanyHelper = require('../../../../../cadence-support-brain/src/helper/company/index');

// DB
const { sequelize } = require('../../../../../Cadence-Brain/src/db/models');

// Repositories
const Repository = require('../../../../../Cadence-Brain/src/repository');

// Joi validation
const CompanySchema = require('../../../joi/company/companies');

const getPaymentData = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id)
      return badRequestResponse(res, 'Please specify the company id');
    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id: company_id },
      extras: {
        attributes: [
          'number_of_licences',
          'is_subscription_active',
          'is_trial_active',
          'trial_valid_until',
        ],
      },
    });
    if (errForCompany)
      return serverErrorResponse(
        res,
        `Error fetching company: ${errForCompany}`
      );
    if (!company) return badRequestResponse(res, `Company not found.`);
    return successResponse(
      res,
      `Fetched payment details successfully.`,
      company
    );
  } catch (err) {
    logger.error(`Error while finding payment details of company: `, err);
    return serverErrorResponse(
      res,
      `Error while finding payment details of company: ${err.message}`
    );
  }
};

const getUsers = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id)
      return badRequestResponse(res, 'Please specify the company id');
    let users = null,
      errForUsers = null;
    // Fetch all users of the company
    [users, errForUsers] = await Repository.fetchAll({
      tableName: DB_TABLES.USER,
      query: { company_id: company_id },
    });

    if (errForUsers) return serverErrorResponse(res, errForUsers);

    // Removing hashed password of each user from users data
    users = users.map((user) => {
      delete user?.password;
      return user;
    });

    return successResponse(res, 'Successfully fetched users.', users);
  } catch (err) {
    logger.error('Error while fetching users: ', err);
    serverErrorResponse(res, err.message);
  }
};

const searchCompanyAndUser = async (req, res) => {
  try {
    if (req.body.search === '') return successResponse(res, 'Search is empty');

    const [seacrhedUser, errWhileSearchingUser] =
      await userHelper.searchCompanyAndUser(
        req.body.search?.trim(),
        req?.body?.limit,
        req?.body?.offset
      );
    if (errWhileSearchingUser) {
      logger.error('Error searching users: ', errWhileSearchingUser);
      return serverErrorResponse(
        res,
        `Error while searching users: ${errWhileSearchingUser.message}.`
      );
    }

    // if (seacrhedUser.length === 0)
    //   return successResponse(res, 'No users found');

    return successResponse(res, 'User found', seacrhedUser);
  } catch (err) {
    logger.error(`Error while searching users: `, err);
    return serverErrorResponse(
      res,
      `Error while searching users: ${err.message}.`
    );
  }
};

const fetchCompany = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id)
      return badRequestResponse(res, 'Please specify the company id');

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      include: {
        [DB_TABLES.USER]: {
          attributes: [],
        },
        [DB_TABLES.COMPANY_SETTINGS]: {
          attributes: ['mail_integration_type'],
        },
      },
      extras: {
        subQuery: false,
        group: ['company_id'],
        attributes: [
          'company_id',
          'name',
          'number_of_licences',
          'is_subscription_active',
          'is_trial_active',
          'trial_valid_until',
          'integration_type',
          'created_at',
          'status',
          [sequelize.literal(`COUNT(DISTINCT Users.user_id)`), 'user_count'],
        ],
      },
    });
    if (errForCompany)
      return serverErrorResponse(
        res,
        `Error while fetching company: ${errForCompany}`
      );

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: {
        company_id: company_id,
        role: USER_ROLE.SUPER_ADMIN,
      },
      include: {
        [DB_TABLES.USER_TOKEN]: {
          attributes: ['mail_status'],
        },
      },
      extras: {
        attributes: [],
      },
    });
    if (errForUser)
      return serverErrorResponse(res, 'Error while fetching user.', errForUser);

    company.mail_status = user?.User_Token?.mail_status || 'Sent';

    return successResponse(res, 'Company fetched successfully: ', company);
  } catch (err) {
    logger.error(`Error while searching users: `, err);
    return serverErrorResponse(
      res,
      `Error while searching users: ${err.message}.`
    );
  }
};

const fetchCompanies = async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    let [companyFilters, errForCompanyFilters] =
      CompanyHelper.getCompanyLisFilter(req.body);
    if (errForCompanyFilters)
      return serverErrorResponse(res, errForCompanyFilters);

    let extrasQuery = {
      subQuery: false,
      group: ['company_id'],
      attributes: [
        'company_id',
        'name',
        'number_of_licences',
        'is_subscription_active',
        'is_trial_active',
        'trial_valid_until',
        'integration_type',
        'created_at',
        'status',
        [sequelize.literal(`COUNT(DISTINCT Users.user_id)`), 'user_count'],
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0,
    };

    let [company, errForCompany] = await Repository.fetchAll({
      tableName: DB_TABLES.COMPANY,
      query: { ...companyFilters.company },
      include: {
        [DB_TABLES.USER]: {
          attributes: [
            [sequelize.literal(`COUNT(DISTINCT Users.user_id)`), 'user_count'],
          ],
        },
        [DB_TABLES.COMPANY_SETTINGS]: {
          required: true,
          where: {
            ...companyFilters.companySettings,
          },
          attributes: ['mail_integration_type'],
        },
      },
      extras: extrasQuery,
    });
    if (errForCompany)
      return serverErrorResponse(
        res,
        `Error while fetching company.`,
        errForCompany
      );

    const companyIds = company.map((company) => company.company_id);

    const [user, errForUser] = await Repository.fetchAll({
      tableName: DB_TABLES.USER,
      query: {
        company_id: {
          [Op.in]: companyIds,
        },
        role: USER_ROLE.SUPER_ADMIN,
      },
      include: {
        [DB_TABLES.USER_TOKEN]: {
          attributes: ['mail_status'],
        },
      },
      extras: {
        order: [['created_at', 'DESC']],
        attributes: ['company_id'],
      },
    });
    if (errForUser)
      return serverErrorResponse(res, 'Error while fetching user.', errForUser);

    for (let i = 0; i < company?.length; i++) {
      const mailStatus = user.find(
        (user) => user?.company_id === company[i]?.company_id
      );
      company[i].mail_status = mailStatus?.User_Token?.mail_status || 'Sent';
    }

    return successResponse(res, 'Company found', company);
  } catch (err) {
    logger.error(`Error while searching users: `, err);
    return serverErrorResponse(
      res,
      `Error while searching users: ${err.message}.`
    );
  }
};

const CompanyController = {
  fetchCompanies,
  getPaymentData,
  getUsers,
  searchCompanyAndUser,
  fetchCompany,
};

module.exports = CompanyController;
