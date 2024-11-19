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
  CRM_INTEGRATIONS,
  LEAD_INTEGRATION_TYPES,
} = require('../../../../../cadence-support-brain/src/utils/enums');

const {
  DEV_AUTH,
  CRM_SERVER_URL,
} = require('../../../../../cadence-support-brain/src/utils/config');

// Joi
const companyFieldSchema = require('../../../joi/admin/company-field-map.joi.js');

// Packages
const { Op } = require('sequelize');
const axios = require('axios');

// Helper
const CompanyFieldMapHelper = require('../../../../../cadence-support-brain/src/helper/company-field-map');
const CompanyHelper = require('../../../../../cadence-support-brain/src/helper/company');

// DB
const { sequelize } = require('../../../../../Cadence-Brain/src/db/models');

// Repositories
const Repository = require('../../../../../Cadence-Brain/src/repository');

const getConfigurations = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      include: {
        [DB_TABLES.COMPANY_TOKENS]: {},
        [DB_TABLES.COMPANY_SETTINGS]: {
          attributes: ['company_settings_id', 'user_id'],
        },
        [DB_TABLES.ENRICHMENTS]: {},
      },
      extras: {
        attributes: ['company_id', 'integration_type'],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);
    if (!company) return badRequestResponse(res, 'company not found.');

    // Fetch company's enrichments config
    const enrichments = company?.Enrichment;
    if (!enrichments) return badRequestResponse(res, 'Enrichments not found.');

    const userId = company?.Company_Setting?.user_id;

    // Fetch field map
    const [fieldMap, errForFieldMap] =
      await CompanyFieldMapHelper.getFieldMapForCompanyFromUser({
        user_id: userId,
      });
    if (errForFieldMap) return serverErrorResponse(res, errForFieldMap);

    let data = {};
    const companyToken = company?.Company_Token;

    switch (company.integration_type) {
      case CRM_INTEGRATIONS.SALESFORCE:
        const { lead_map, contact_map } = fieldMap;

        data = {
          lusha_api_key: companyToken?.lusha_api_key,
          kaspr_api_key: companyToken?.kaspr_api_key,
          hunter_api_key: companyToken?.hunter_api_key,
          dropcontact_api_key: companyToken?.dropcontact_api_key,
          snov_client_id: companyToken?.snov_client_id,
          snov_client_secret: companyToken?.snov_client_secret,
          phone_options: {
            [LEAD_INTEGRATION_TYPES.SALESFORCE_LEAD]: lead_map.phone_numbers,
            [LEAD_INTEGRATION_TYPES.SALESFORCE_CONTACT]:
              contact_map.phone_numbers,
          },
          email_options: {
            [LEAD_INTEGRATION_TYPES.SALESFORCE_LEAD]: lead_map.emails,
            [LEAD_INTEGRATION_TYPES.SALESFORCE_CONTACT]: contact_map.emails,
          },
          ...enrichments,
        };
        break;

      case CRM_INTEGRATIONS.PIPEDRIVE:
        data = {
          ...enrichments,
          lusha_api_key: companyToken?.lusha_api_key,
          kaspr_api_key: companyToken?.kaspr_api_key,
          hunter_api_key: companyToken?.hunter_api_key,
          dropcontact_api_key: companyToken?.dropcontact_api_key,
          snov_client_id: companyToken?.snov_client_id,
          snov_client_secret: companyToken?.snov_client_secret,
          phone_options: {
            [LEAD_INTEGRATION_TYPES.PIPEDRIVE_PERSON]: [
              'home',
              'work',
              'mobile',
              'other',
            ],
          },
          email_options: {
            [LEAD_INTEGRATION_TYPES.PIPEDRIVE_PERSON]: [
              'home',
              'work',
              'other',
            ],
          },
        };
        break;

      case CRM_INTEGRATIONS.HUBSPOT:
        const hubspot_contact_map = fieldMap.contact_map;
        data = {
          lusha_api_key: companyToken?.lusha_api_key,
          kaspr_api_key: companyToken?.kaspr_api_key,
          hunter_api_key: companyToken?.hunter_api_key,
          dropcontact_api_key: companyToken?.dropcontact_api_key,
          snov_client_id: companyToken?.snov_client_id,
          snov_client_secret: companyToken?.snov_client_secret,
          phone_options: {
            [LEAD_INTEGRATION_TYPES.HUBSPOT_CONTACT]:
              hubspot_contact_map.phone_numbers,
          },
          email_options: {
            [LEAD_INTEGRATION_TYPES.HUBSPOT_CONTACT]:
              hubspot_contact_map.emails,
          },
          ...enrichments,
        };
        break;

      case CRM_INTEGRATIONS.GOOGLE_SHEETS:
        const google_sheets_lead_map = fieldMap.lead_map;
        data = {
          lusha_api_key: companyToken?.lusha_api_key,
          kaspr_api_key: companyToken?.kaspr_api_key,
          hunter_api_key: companyToken?.hunter_api_key,
          dropcontact_api_key: companyToken?.dropcontact_api_key,
          snov_client_id: companyToken?.snov_client_id,
          snov_client_secret: companyToken?.snov_client_secret,
          phone_options: {
            [LEAD_INTEGRATION_TYPES.GOOGLE_SHEETS_LEAD]:
              google_sheets_lead_map.phone_numbers,
          },
          email_options: {
            [LEAD_INTEGRATION_TYPES.GOOGLE_SHEETS_LEAD]:
              google_sheets_lead_map.emails,
          },
          ...enrichments,
        };
        break;

      case CRM_INTEGRATIONS.EXCEL:
        const excel_lead_map = fieldMap.lead_map;
        data = {
          lusha_api_key: companyToken?.lusha_api_key,
          kaspr_api_key: companyToken?.kaspr_api_key,
          hunter_api_key: companyToken?.hunter_api_key,
          dropcontact_api_key: companyToken?.dropcontact_api_key,
          snov_client_id: companyToken?.snov_client_id,
          snov_client_secret: companyToken?.snov_client_secret,
          phone_options: {
            [LEAD_INTEGRATION_TYPES.EXCEL_LEAD]: excel_lead_map.phone_numbers,
          },
          email_options: {
            [LEAD_INTEGRATION_TYPES.EXCEL_LEAD]: excel_lead_map.emails,
          },
          ...enrichments,
        };
        break;

      case CRM_INTEGRATIONS.ZOHO:
        const zoho_lead_map = fieldMap.lead_map;
        const zoho_contact_map = fieldMap.contact_map;
        data = {
          lusha_api_key: companyToken?.lusha_api_key,
          kaspr_api_key: companyToken?.kaspr_api_key,
          hunter_api_key: companyToken?.hunter_api_key,
          dropcontact_api_key: companyToken?.dropcontact_api_key,
          snov_client_id: companyToken?.snov_client_id,
          snov_client_secret: companyToken?.snov_client_secret,
          phone_options: {
            [LEAD_INTEGRATION_TYPES.ZOHO_LEAD]: zoho_lead_map.phone_numbers,
            [LEAD_INTEGRATION_TYPES.ZOHO_CONTACT]:
              zoho_contact_map.phone_numbers,
          },
          email_options: {
            [LEAD_INTEGRATION_TYPES.ZOHO_LEAD]: zoho_lead_map.emails,
            [LEAD_INTEGRATION_TYPES.ZOHO_CONTACT]: zoho_contact_map.emails,
          },
          ...enrichments,
        };
        break;

      case CRM_INTEGRATIONS.SELLSY:
        const sellsy_contact_map = fieldMap.contact_map;
        data = {
          lusha_api_key: companyToken?.lusha_api_key,
          kaspr_api_key: companyToken?.kaspr_api_key,
          hunter_api_key: companyToken?.hunter_api_key,
          dropcontact_api_key: companyToken?.dropcontact_api_key,
          snov_client_id: companyToken?.snov_client_id,
          snov_client_secret: companyToken?.snov_client_secret,
          phone_options: {
            [LEAD_INTEGRATION_TYPES.SELLSY_CONTACT]:
              sellsy_contact_map.phone_numbers,
          },
          email_options: {
            [LEAD_INTEGRATION_TYPES.SELLSY_CONTACT]: sellsy_contact_map.emails,
          },
          ...enrichments,
        };
        break;

      case CRM_INTEGRATIONS.BULLHORN:
        const bullhorn_lead_map = fieldMap.lead_map;
        const bullhorn_contact_map = fieldMap.contact_map;
        const bullhorn_candidate_map = fieldMap.candidate_map;
        data = {
          lusha_api_key: companyToken?.lusha_api_key,
          kaspr_api_key: companyToken?.kaspr_api_key,
          hunter_api_key: companyToken?.hunter_api_key,
          dropcontact_api_key: companyToken?.dropcontact_api_key,
          snov_client_id: companyToken?.snov_client_id,
          snov_client_secret: companyToken?.snov_client_secret,
          phone_options: {
            [LEAD_INTEGRATION_TYPES.BULLHORN_LEAD]:
              bullhorn_lead_map.phone_numbers,
            [LEAD_INTEGRATION_TYPES.BULLHORN_CONTACT]:
              bullhorn_contact_map.phone_numbers,
            [LEAD_INTEGRATION_TYPES.BULLHORN_CANDIDATE]:
              bullhorn_candidate_map.phone_numbers,
          },
          email_options: {
            [LEAD_INTEGRATION_TYPES.BULLHORN_LEAD]: bullhorn_lead_map.emails,
            [LEAD_INTEGRATION_TYPES.BULLHORN_CONTACT]:
              bullhorn_contact_map.emails,
            [LEAD_INTEGRATION_TYPES.BULLHORN_CANDIDATE]:
              bullhorn_candidate_map.emails,
          },
          ...enrichments,
        };
        break;

      default:
        return badRequestResponseWithDevMsg({
          res,
          msg: 'Enrichments are not available for this integration_type',
        });
    }

    return successResponse(
      res,
      'Successfully fetched enrichments config........................',
      data
    );
  } catch (err) {
    logger.error(`Error while fetching enrichments config: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const getSubDepartments = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    // Fetch user for company_id
    let [users, errForUsers] = await Repository.fetchAll({
      tableName: DB_TABLES.USER,
      query: {
        company_id: company_id,
      },
      extras: {
        group: ['department_id'],
        attributes: ['user_id', 'department_id'],
      },
    });

    const department_ids = users.map((user) => user.department_id);

    let [subDepartments, errForSubDepartments] = await Repository.fetchAll({
      tableName: DB_TABLES.SUB_DEPARTMENT,
      query: {
        department_id: {
          [Op.in]: department_ids,
        },
      },
      include: {
        [DB_TABLES.USER]: {
          attributes: [
            'first_name',
            'last_name',
            'user_id',
            'is_profile_picture_present',
            'profile_picture',
          ],
          [DB_TABLES.USER_TOKEN]: {
            attributes: [
              'lusha_service_enabled',
              'kaspr_service_enabled',
              'hunter_service_enabled',
              'dropcontact_service_enabled',
              'snov_service_enabled',
            ],
          },
        },
        [DB_TABLES.SUB_DEPARTMENT_SETTINGS]: {
          attributes: [
            'enable_new_users_lusha',
            'enable_new_users_kaspr',
            'enable_new_users_hunter',
            'enable_new_users_dropcontact',
            'enable_new_users_snov',
          ],
        },
      },
    });
    if (errForSubDepartments)
      return serverErrorResponse(res, errForSubDepartments);
    if (!subDepartments)
      return notFoundResponse(res, 'No sub-departments found.');

    return successResponse(
      res,
      'Successfully fetched subDepartments with users.',
      subDepartments
    );
  } catch (err) {
    logger.error(`Error while fetching usersg: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const describeObject = async (req, res) => {
  try {
    const { company_id, object } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    let config = {
      method: 'get',
      url: `${CRM_SERVER_URL}/v2/admin/company-settings/company-field-map/describe/${company_id}/${object}`,
      headers: {
        Authorization: `Bearer ${DEV_AUTH}`,
        'Content-Type': 'application/json',
      },
      data: req.body,
    };

    let response = await axios(config);
    console.log('000000000000000000000000000', response?.data);

    return successResponse(
      res,
      'Successfully fetched sObject fields',
      response?.data?.data
    );
  } catch (err) {
    if (err?.response?.data?.error) {
      logger.error(
        `Error while fetching describe object: `,
        err?.response?.data
      );
      return serverErrorResponse(
        res,
        `Error while fetching describe object: ${err?.response?.data?.error}`
      );
    }
    logger.error(`Error while fetching describe object: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const EnrichmentsController = {
  getConfigurations,
  getSubDepartments,
  describeObject,
};

module.exports = EnrichmentsController;
