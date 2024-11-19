// Utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');

const {
  DB_TABLES,
} = require('../../../../../Cadence-Brain/src/utils/modelEnums');
const {
  CRM_SERVER_URL,
} = require('../../../../../cadence-support-brain/src/utils/config');

const {
  USER_ROLE,
  CRM_INTEGRATIONS,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// Packages
const axios = require('axios');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// Helpers
const TokenHelper = require('../../../../../cadence-support-brain/src/helper/token');

const fetchUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'Invalid user id');

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { user_id },
      include: {
        [DB_TABLES.USER_TOKEN]: {
          required: true,
          attributes: [
            'lusha_service_enabled',
            'kaspr_service_enabled',
            'hunter_service_enabled',
            'dropcontact_service_enabled',
            'snov_service_enabled',
            'mail_status',
          ],
        },
        [DB_TABLES.COMPANY]: {
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
              'is_linkedin_activated',
            ],
          },
          required: true,
          attributes: ['company_id', 'integration_type'],
        },
      },
      extras: {
        attributes: [
          'user_id',
          'salesforce_owner_id',
          'ringover_user_id',
          'first_name',
          'last_name',
          'profile_picture',
          'is_profile_picture_present',
          'primary_email',
          'role',
          'primary_phone_number',
          'integration_type',
          'integration_id',
          'company_id',
          'sd_id',
          'department_id',
          'created_at',
          'is_onboarding_complete',
          'product_tour_status',
        ],
      },
    });
    if (errForUser) return serverErrorResponse(res, errForUser);

    const [tokensToFetch, errForTokensToFetch] = TokenHelper.tokenTable(
      user?.Company?.integration_type
    );
    if (errForTokensToFetch)
      return serverErrorResponse(res, errForTokensToFetch);

    const [tokens, errForTokens] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { user_id },
      include: {
        [tokensToFetch]: {
          attributes: ['is_logged_out'],
        },
      },
      extras: {
        attributes: ['user_id'],
      },
    });
    if (errForTokens) return serverErrorResponse(res, errForTokens);

    user.Company.is_integration_activated = !tokens?.is_logged_out;
    user.mail_status = user?.User_Token?.mail_status || 'Sent';
    user.is_linkedin_activated =
      user?.Company?.Enrichment?.is_linkedin_activated;
    user.Enrichment = {};

    if (user?.Company?.Enrichment?.is_lusha_activated) {
      user.Enrichment.lusha_service_enabled =
        user?.User_Token?.lusha_service_enabled;
      user.Enrichment.lusha_api_calls =
        user?.Company?.Enrichment?.lusha_api_calls;
    }

    if (user?.Company?.Enrichment?.is_kaspr_activated) {
      user.Enrichment.kaspr_service_enabled =
        user?.User_Token?.kaspr_service_enabled;
      user.Enrichment.kaspr_api_calls =
        user?.Company?.Enrichment?.kaspr_api_calls;
    }

    if (user?.Company?.Enrichment?.is_hunter_activated) {
      user.Enrichment.hunter_service_enabled =
        user?.User_Token?.hunter_service_enabled;
      user.Enrichment.hunter_api_calls =
        user?.Company?.Enrichment?.hunter_api_calls;
    }

    if (user?.Company?.Enrichment?.is_dropcontact_activated) {
      user.Enrichment.dropcontact_service_enabled =
        user?.User_Token?.dropcontact_service_enabled;

      user.Enrichment.dropcontact_api_calls =
        user?.Company?.Enrichment?.dropcontact_api_calls;
    }

    if (user?.Company?.Enrichment?.is_snov_activated) {
      user.Enrichment.snov_service_enabled =
        user?.User_Token?.snov_service_enabled;
      user.Enrichment.snov_api_calls =
        user?.Company?.Enrichment?.snov_api_calls;
    }

    delete user.User_Token;
    delete user.Company;
    return successResponse(res, 'User fetched successfully', user);
  } catch (err) {
    logger.error('Error while fetching a user: ', err);
    return serverErrorResponse(res, 'Error while fetching user');
  }
};

const fetchUsers = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'Invalid user id');

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { user_id },
    });
    if (errForUser) return serverErrorResponse(res, errForUser);
    if (!user) return notFoundResponse(res, 'User not found.');

    let users = null,
      errForUsers = null;

    switch (user.role) {
      case USER_ROLE.SUPER_ADMIN:
      case USER_ROLE.ADMIN:
        // Fetch all users of the company
        [users, errForUsers] = await Repository.fetchAll({
          tableName: DB_TABLES.USER,
          query: { company_id: user.company_id },
          extras: {
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'profile_picture',
              'is_profile_picture_present',
            ],
          },
        });
        break;

      case USER_ROLE.SALES_MANAGER_PERSON:
      case USER_ROLE.SALES_MANAGER:
      case USER_ROLE.SALES_PERSON:
        // Fetch all users of the user's sub-dept
        [users, errForUsers] = await Repository.fetchAll({
          tableName: DB_TABLES.USER,
          query: { sd_id: user.sd_id },
          extras: {
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'profile_picture',
              'is_profile_picture_present',
            ],
          },
        });
        break;

      default:
        return forbiddenResponse(
          res,
          'You do not have permission to access this.'
        );
    }
    if (errForUsers) return serverErrorResponse(res, errForUsers);

    return successResponse(res, 'Successfully fetched users.', users);
  } catch (err) {
    logger.error('Error while fetching users: ', err);
    serverErrorResponse(res, err.message);
  }
};

const sendMailToSuperAdmin = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'Invalid user id');

    const { access_token } = req.agent;

    let config = {
      method: 'get',
      url: `${CRM_SERVER_URL}/v2/support/user/send-mail/${user_id}`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    };

    await axios(config);

    return successResponse(res, 'Mail sent successfully.');
  } catch (err) {
    logger.error(
      `Error while sending mail to super admin: ${
        err?.response?.data?.error ?? err.message
      }`
    );
    serverErrorResponse(res, err?.response?.data?.msg ?? err?.message);
  }
};

const completeProductTourForUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'Invalid user id');

    const { access_token } = req.agent;

    let config = {
      method: 'PUT',
      url: `${CRM_SERVER_URL}/v2/support/user/complete-product-tour/${user_id}`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    };

    await axios(config);

    return successResponse(res, 'Product tour marked as complete for user');
  } catch (err) {
    logger.error(
      `Error while sending mail to super admin: ${
        err?.response?.data?.error ?? err.message
      }`
    );
    serverErrorResponse(res, err?.response?.data?.msg ?? err?.message);
  }
};

const userController = {
  fetchUser,
  fetchUsers,
  sendMailToSuperAdmin,
  completeProductTourForUser,
};

module.exports = userController;
