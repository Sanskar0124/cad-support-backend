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

// Package
const { Op } = require('sequelize');

// DB
const { sequelize } = require('../../../../../Cadence-Brain/src/db/models');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// Helpers
const TokenHelper = require('../../../../../cadence-support-brain/src/helper/token');

const getCompanyIntegrations = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      include: {
        [DB_TABLES.ENRICHMENTS]: {},
        [DB_TABLES.COMPANY_TOKENS]: {},
        [DB_TABLES.COMPANY_SETTINGS]: {
          required: true,
          attributes: ['user_id'],
        },
        [DB_TABLES.DEPARTMENT]: {
          required: true,
          attributes: ['department_id'],
        },
      },
      extras: {
        attributes: ['company_id', 'integration_type'],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);

    const [tokensToFetch, errForTokensToFetch] = TokenHelper.tokenTable(
      company.integration_type
    );
    if (errForTokensToFetch)
      return serverErrorResponse(res, errForTokensToFetch);

    let departmentID = company?.Departments[0]?.department_id;

    const userPromise = Repository.fetchAll({
      tableName: DB_TABLES.USER,
      query: { company_id },
      include: {
        [tokensToFetch]: {
          required: true,
          attributes: ['is_logged_out'],
        },
        [DB_TABLES.USER_TOKEN]: {
          attributes: ['lusha_service_enabled', 'kaspr_service_enabled'],
        },
      },
      extras: {
        attributes: ['user_id', 'sd_id'],
      },
    });

    const subDepartmentPromise = Repository.fetchAll({
      tableName: DB_TABLES.SUB_DEPARTMENT,
      query: { department_id: departmentID },
      extras: {
        attributes: [
          [sequelize.literal(`COUNT(DISTINCT sd_id ) `), 'sd_count'],
        ],
      },
    });

    const [[user, errForUser], [subDepartment, errForSubDepartment]] =
      await Promise.all([userPromise, subDepartmentPromise]);
    if (errForUser || errForSubDepartment)
      return serverErrorResponse(res, errForUser || errForSubDepartment);

    let kaspr_count = 0;
    let lusha_count = 0;
    let huter_count = 0;
    let dropcontact_count = 0;
    let snov_count = 0;
    let distinct_kasper_teams = [];
    let distinct_lusha_teams = [];
    let distinct_hunter_teams = [];
    let distinct_dropcontact_teams = [];
    let distinct_snov_teams = [];

    user.forEach((user) => {
      if (user?.User_Token?.kaspr_service_enabled) {
        kaspr_count++;
        if (!distinct_kasper_teams.includes(user.sd_id))
          distinct_kasper_teams.push(user.sd_id);
      }

      if (user?.User_Token?.lusha_service_enabled) {
        lusha_count++;
        if (!distinct_lusha_teams.includes(user.sd_id))
          distinct_lusha_teams.push(user.sd_id);
      }

      if (user?.User_Token?.hunter_service_enabled) {
        huter_count++;
        if (!distinct_hunter_teams.includes(user.sd_id))
          distinct_hunter_teams.push(user.sd_id);
      }

      if (user?.User_Token?.dropcontact_service_enabled) {
        dropcontact_count++;
        if (!distinct_dropcontact_teams.includes(user.sd_id))
          distinct_dropcontact_teams.push(user.sd_id);
      }

      if (user?.User_Token?.snov_service_enabled) {
        snov_count++;
        if (!distinct_snov_teams.includes(user.sd_id))
          distinct_snov_teams.push(user.sd_id);
      }

      if (company?.Company_Setting?.user_id === user.user_id) {
        delete user.User_Token;
        delete user.user_id;
        delete user.sd_id;
        company.active_status = user;
      }
    });

    delete company.Company_Setting;
    delete company.Departments;

    const {
      lusha_api_key,
      kaspr_api_key,
      hunter_api_key,
      dropcontact_api_key,
      snov_client_secret,
    } = company.Company_Token;

    const enrichments = company?.Enrichment;
    if (!enrichments)
      return badRequestResponse(res, 'No enrichments found for the company.');

    const data = {
      user_count: user.length,
      company_id: company.company_id,
      integration_type: company.integration_type,
      sd_count: subDepartment[0].sd_count,
      kaspr_user_count: kaspr_count,
      kaspr_team_count: distinct_kasper_teams.length,
      lusha_user_count: lusha_count,
      lusha_team_count: distinct_lusha_teams.length,
      hunter_user_count: huter_count,
      hunter_team_count: distinct_hunter_teams.length,
      dropcontact_user_count: dropcontact_count,
      dropcontact_team_count: distinct_dropcontact_teams.length,
      snov_user_count: snov_count,
      snov_team_count: distinct_snov_teams.length,
      is_linkedin_activated: enrichments.is_linkedin_activated,
      Enrichment: {
        enr_id: enrichments.enr_id,
        is_lusha_configured: lusha_api_key && enrichments.is_lusha_activated,
        lusha_api_calls: enrichments.lusha_api_calls,
        is_kaspr_configured: kaspr_api_key && enrichments.is_kaspr_activated,
        kaspr_api_calls: enrichments.kaspr_api_calls,
        is_hunter_configured: hunter_api_key && enrichments.is_hunter_activated,
        hunter_api_calls: enrichments.hunter_api_calls,
        is_dropcontact_configured:
          dropcontact_api_key && enrichments.is_dropcontact_activated,
        dropcontact_api_calls: enrichments.dropcontact_api_calls,
        is_snov_activated: snov_client_secret && enrichments.is_snov_activated,
        snov_api_calls: enrichments.snov_api_calls,
      },
    };

    return successResponse(res, 'Successfully fetched integrations.', data);
  } catch (err) {
    logger.error('Error while fetching integrations. ', err);
    return serverErrorResponse(res, 'Error while fetching integrations.');
  }
};

const getIntegrationSetting = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      include: {
        [DB_TABLES.COMPANY_TOKENS]: {
          required: true,
          attributes: ['encrypted_api_token', 'api_token'],
        },
        [DB_TABLES.COMPANY_SETTINGS]: {
          required: true,
          attributes: ['user_id'],
        },
      },
      extras: {
        attributes: ['company_id', 'integration_type', 'integration_id'],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);

    const [tokensToFetch, errForTokensToFetch] = TokenHelper.tokenTable(
      company.integration_type
    );
    if (errForTokensToFetch)
      return serverErrorResponse(res, errForTokensToFetch);

    let userId = company?.Company_Setting?.user_id;
    delete company.Company_Setting;

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: {
        [Op.or]: {
          user_id: userId,
          role: USER_ROLE.SUPER_ADMIN,
        },
        company_id,
      },
      include: {
        [tokensToFetch]: {
          attributes: [
            'is_logged_out',
            'encrypted_instance_url',
            'instance_url',
            'created_at',
          ],
        },
      },
      extras: {
        attributes: [
          'user_id',
          'first_name',
          'last_name',
          'profile_picture',
          'is_profile_picture_present',
          'created_at',
          'integration_id',
        ],
      },
    });
    if (errForUser) return serverErrorResponse(res, errForUser);

    company.User = user;

    return successResponse(
      res,
      'Successfully fetched integrations setting.',
      company
    );
  } catch (err) {
    logger.error('Error while fetching integration setting. ', err);
    return serverErrorResponse(
      res,
      `Error while fetching integration setting: ${err.message}`
    );
  }
};

const getPhoneSystem = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const [phoneSystemType, errForPhoneSystemType] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY_SETTINGS,
      query: { company_id },
      extras: {
        attributes: ['phone_system', 'updated_at'],
      },
    });
    if (errForPhoneSystemType)
      return serverErrorResponse(res, errForPhoneSystemType);
    return successResponse(
      res,
      'Phone system fetched successfully',
      phoneSystemType
    );
  } catch (err) {
    logger.error('Error while getting phone system for admin:', err);
    return serverErrorResponse(res, err.message);
  }
};

const getActivityToLog = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const [activity, errForActivity] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY_SETTINGS,
      query: { company_id },
      extras: {
        attributes: ['activity_to_log', 'updated_at'],
      },
    });
    if (errForActivity) return serverErrorResponse(res, errForActivity);

    return successResponse(res, 'Fetched salesforce log activities.', activity);
  } catch (err) {
    logger.error('Error while fetching salesforce activities to log: ', err);
    return serverErrorResponse(res, err.message);
  }
};

const integrationControllers = {
  getCompanyIntegrations,
  getIntegrationSetting,
  getPhoneSystem,
  getActivityToLog,
};

module.exports = integrationControllers;
