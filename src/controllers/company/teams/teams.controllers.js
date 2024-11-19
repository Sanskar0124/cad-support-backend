// Utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');
const {
  DB_TABLES,
} = require('../../../../../Cadence-Brain/src/utils/modelEnums');

const {
  CRM_INTEGRATIONS,
  TRACKING_ACTIVITIES,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// Packages
const { Op } = require('sequelize');

// DB
const { sequelize } = require('../../../../../Cadence-Brain/src/db/models');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// Helpers
const TokenHelper = require('../../../../../cadence-support-brain/src/helper/token');

// Joi validation
const TeamsSchema = require('../../../joi/company/teams');

const fetchTeams = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID not specified');

    const { error, value } = TeamsSchema.fetchTeamsSchema.validate(req.query);
    if (error) return badRequestResponse(res, error.message);

    if (value.limit + value.offset > 200)
      return badRequestResponse(res, 'Limit exceeded');

    let includeQuery = {};

    if (value.search) {
      includeQuery = {
        [DB_TABLES.SUB_DEPARTMENT]: {
          required: true,
          where: sequelize.where(
            sequelize.fn('lower', sequelize.col('Sub_Departments.name')),
            {
              [Op.like]: `%${value.search.toLowerCase()}%`,
            }
          ),
          order: [['created_at', 'DESC']],
          [DB_TABLES.USER]: {
            separate: true,
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'profile_picture',
              'is_profile_picture_present',
              'role',
            ],
          },
          attributes: [
            'sd_id',
            'name',
            'profile_picture',
            'is_profile_picture_present',
            'department_id',
            'created_at',
          ],
        },
      };
    } else {
      includeQuery = {
        [DB_TABLES.SUB_DEPARTMENT]: {
          required: true,
          limit: value.limit,
          offset: value.offset,
          order: [['created_at', 'DESC']],
          [DB_TABLES.USER]: {
            separate: true,
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'profile_picture',
              'is_profile_picture_present',
              'role',
            ],
          },
          attributes: [
            'sd_id',
            'name',
            'profile_picture',
            'is_profile_picture_present',
            'department_id',
            'created_at',
          ],
        },
      };
    }

    const [subDepartments, errForSubDepartment] = await Repository.fetchAll({
      tableName: DB_TABLES.DEPARTMENT,
      query: { company_id: company_id },
      include: includeQuery,
      extras: {
        attributes: ['department_id'],
      },
    });
    if (errForSubDepartment)
      return serverErrorResponse(res, errForSubDepartment);

    return successResponse(
      res,
      'Fetched all sub-departments.',
      subDepartments[0].Sub_Departments
    );
  } catch (err) {
    logger.error('Error while fetching sub-departments.', err);
    return serverErrorResponse(res, 'Error while fetching sub-departments.');
  }
};

const fetchTeamMembers = async (req, res) => {
  try {
    const { error, value } = TeamsSchema.fetchTeamSchema.validate(req.body);
    if (error) return badRequestResponse(res, error.message);

    if (value.limit + value.offset > 200)
      return badRequestResponse(res, 'Limit exceeded');

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id: value.company_id },
      include: {
        [DB_TABLES.ENRICHMENTS]: {
          required: true,
          attributes: [
            'is_lusha_activated',
            'lusha_api_calls',
            'is_kaspr_activated',
            'kaspr_api_calls',
            'is_hunter_activated',
            'hunter_api_calls',
            'is_dropcontact_activated',
            'dropcontact_api_calls',
            'is_snov_activated',
            'snov_api_calls',
          ],
        },
      },
      extras: {
        attributes: ['company_id', 'integration_type'],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);
    if (!company) return notFoundResponse(res, 'Company not found.');

    const [subDepartment, errForSubDepartment] = await Repository.fetchOne({
      tableName: DB_TABLES.SUB_DEPARTMENT,
      query: { sd_id: value.sd_id },
      extras: {
        attributes: ['sd_id'],
      },
    });
    if (errForSubDepartment)
      return serverErrorResponse(res, 'Failed to fetch team members');
    if (!subDepartment) return notFoundResponse(res, 'Team not found');

    const [tokensToFetch, errForTokensToFetch] = TokenHelper.tokenTable(
      company.integration_type
    );
    if (errForTokensToFetch)
      return serverErrorResponse(res, errForTokensToFetch);

    let filter = { sd_id: value.sd_id };

    if (value.search) {
      filter = {
        [Op.and]: [
          { sd_id: sd_id },
          {
            [Op.or]: [
              sequelize.where(
                sequelize.fn('lower', sequelize.col('first_name')),
                {
                  [Op.like]: `%${value.search.trim().toLowerCase()}%`,
                }
              ),
              sequelize.where(
                sequelize.fn('lower', sequelize.col('last_name')),
                {
                  [Op.like]: `%${value.search.trim().toLowerCase()}%`,
                }
              ),
              sequelize.where(sequelize.fn('lower', sequelize.col('email')), {
                [Op.like]: `%${value.search.trim().toLowerCase()}%`,
              }),
            ],
          },
        ],
      };
    }

    const [users, errForUsers] = await Repository.fetchAll({
      tableName: DB_TABLES.USER,
      query: filter,
      include: {
        [DB_TABLES.SUB_DEPARTMENT]: { attributes: ['name', 'sd_id'] },
        [tokensToFetch]: { attributes: ['is_logged_out'] },
        [DB_TABLES.USER_TOKEN]: {
          attributes: [
            'is_salesforce_logged_out',
            'is_google_token_expired',
            'is_outlook_token_expired',
            'lusha_service_enabled',
            'kaspr_service_enabled',
            'hunter_service_enabled',
            'dropcontact_service_enabled',
            'snov_service_enabled',
            'mail_status',
          ],
        },
        [DB_TABLES.USER_TASK]: {
          attributes: [
            'lusha_calls_per_month',
            'kaspr_calls_per_month',
            'hunter_calls_per_month',
            'dropcontact_calls_per_month',
            'snov_calls_per_month',
          ],
        },
        [DB_TABLES.TRACKING]: {
          required: false,
          where: {
            activity: {
              [Op.in]: [
                TRACKING_ACTIVITIES.GOOGLE_SIGN_IN,
                TRACKING_ACTIVITIES.OUTLOOK_SIGN_IN,
              ],
            },
          },
          attributes: ['activity', 'created_at'],
          order: [['created_at', 'DESC']],
          limit: 1,
        },
      },
      extras: {
        subQuery: false,
        limit: value.limit,
        offset: value.offset,
        order: [['created_at', 'DESC']],
        attributes: [
          'user_id',
          'first_name',
          'last_name',
          'email',
          'profile_picture',
          'is_profile_picture_present',
          'created_at',
          'role',
          'integration_id',
          'salesforce_owner_id',
          'company_id',
          'product_tour_status',
          'is_onboarding_complete',
        ],
      },
    });
    if (errForUsers) return serverErrorResponse(res, errForUsers);

    users.forEach((user) => {
      user.Enrichment = {};
      if (company?.Enrichment?.is_lusha_activated) {
        user.Enrichment.lusha_service_enabled =
          user?.User_Token?.lusha_service_enabled;
        user.Enrichment.lusha_api_calls =
          user?.User_Task?.lusha_calls_per_month;
      }
      if (company?.Enrichment?.is_kaspr_activated) {
        user.Enrichment.kaspr_service_enabled =
          user?.User_Token?.kaspr_service_enabled;
        user.Enrichment.kaspr_api_calls =
          user?.User_Task?.kaspr_calls_per_month;
      }
      if (company?.Enrichment?.is_hunter_activated) {
        user.Enrichment.hunter_service_enabled =
          user?.User_Token?.hunter_service_enabled;
        user.Enrichment.hunter_api_calls =
          user?.User_Task?.hunter_calls_per_month;
      }
      if (company?.Enrichment?.is_dropcontact_activated) {
        user.Enrichment.dropcontact_service_enabled =
          user?.User_Token?.dropcontact_service_enabled;
        user.Enrichment.dropcontact_api_calls =
          user?.User_Task?.dropcontact_calls_per_month;
      }
      if (company?.Enrichment?.is_snov_activated) {
        user.Enrichment.snov_service_enabled =
          user?.User_Token?.snov_service_enabled;
        user.Enrichment.snov_api_calls = user?.User_Task?.snov_calls_per_month;
      }

      if (!user?.User_Token?.mail_status) user.User_Token.mail_status = 'Sent';
      delete user?.User_Token?.lusha_service_enabled;
      delete user?.User_Token?.kaspr_service_enabled;
      delete user?.User_Token?.hunter_service_enabled;
      delete user?.User_Token?.dropcontact_service_enabled;
      delete user?.User_Token?.snov_service_enabled;
    });

    return successResponse(
      res,
      'Users fetched successfully for sub-department.',
      users
    );
  } catch (err) {
    logger.error(`Error while fetching users for admin: `, err);
    return serverErrorResponse(
      res,
      `Error while fetching users for admin: ${err.message}`
    );
  }
};

const teamsControllers = {
  fetchTeams,
  fetchTeamMembers,
};

module.exports = teamsControllers;
