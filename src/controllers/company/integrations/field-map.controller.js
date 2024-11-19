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
  FIELD_MAP_MODEL_NAMES,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// Helper and Services
const ExtensionFieldMapHelper = require('../../../../../cadence-support-brain/src/helper/company-field-map');

const fetchCompanyFieldMap = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      extras: {
        attributes: ['name', 'integration_type'],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);

    if (!Object.values(CRM_INTEGRATIONS).includes(company.integration_type))
      return badRequestResponse(res, 'Invalid Integration');

    let fieldTable = false;
    let model = false;

    // * Use CRM Integration specific logic to fetch relevant field map
    switch (company.integration_type) {
      case CRM_INTEGRATIONS.SALESFORCE:
        fieldTable = DB_TABLES.SALESFORCE_FIELD_MAP;
        model = FIELD_MAP_MODEL_NAMES.SALESFORCE;
        break;
      case CRM_INTEGRATIONS.PIPEDRIVE:
        fieldTable = DB_TABLES.PIPEDRIVE_FIELD_MAP;
        model = FIELD_MAP_MODEL_NAMES.PIPEDRIVE;
        break;
      case CRM_INTEGRATIONS.HUBSPOT:
        fieldTable = DB_TABLES.HUBSPOT_FIELD_MAP;
        model = FIELD_MAP_MODEL_NAMES.HUBSPOT;
        break;
      case CRM_INTEGRATIONS.GOOGLE_SHEETS:
        fieldTable = null;
        model = FIELD_MAP_MODEL_NAMES.GOOGLE_SHEETS;
        break;
      case CRM_INTEGRATIONS.EXCEL:
        fieldTable = null;
        model = FIELD_MAP_MODEL_NAMES.EXCEL;
        break;
      case CRM_INTEGRATIONS.ZOHO:
        fieldTable = DB_TABLES.ZOHO_FIELD_MAP;
        model = FIELD_MAP_MODEL_NAMES.ZOHO;
        break;
      case CRM_INTEGRATIONS.SELLSY:
        fieldTable = DB_TABLES.SELLSY_FIELD_MAP;
        model = FIELD_MAP_MODEL_NAMES.SELLSY;
        break;
      case CRM_INTEGRATIONS.BULLHORN:
        fieldTable = DB_TABLES.BULLHORN_FIELD_MAP;
        model = FIELD_MAP_MODEL_NAMES.BULLHORN;
        break;
      case CRM_INTEGRATIONS.DYNAMICS:
        fieldTable = DB_TABLES.DYNAMICS_FIELD_MAP;
        model = FIELD_MAP_MODEL_NAMES.DYNAMICS;
        break;
      default:
        return badRequestResponse(res, 'Invalid Integration');
    }
    if (!fieldTable)
      return badRequestResponse(res, 'Cannot find relevant field table');

    // * Fetch relevant field map
    const [field, errForField] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      include: {
        [DB_TABLES.COMPANY_SETTINGS]: {
          [fieldTable]: {},
        },
      },
      extras: {
        attributes: ['name'],
      },
    });
    if (errForField) return serverErrorResponse(res, errForField);

    let fieldMap = {};
    if (company.integration_type !== CRM_INTEGRATIONS.GOOGLE_SHEETS) {
      fieldMap = field?.Company_Setting?.[model];
      if (!fieldMap) return badRequestResponse(res, 'Unable to find field map');
    }

    return successResponse(res, `Successfully fetched field map`, fieldMap);
  } catch {
    logger.error('Error while fetching field mapping. ', err);
    return serverErrorResponse(res, 'Error while fetching field mapping.');
  }
};

const fetchExtensionFieldMap = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      include: {
        [DB_TABLES.COMPANY_SETTINGS]: {
          attributes: ['user_id'],
        },
      },
      extras: {
        attributes: ['company_id'],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);

    const userId = company?.Company_Setting?.user_id;

    // * Helper function to fetch relevant field map
    let [fieldMap, errFieldMap] =
      await ExtensionFieldMapHelper.getFieldMapForCompanyFromUser({
        user_id: userId,
      });
    if (errFieldMap) return serverErrorResponse(res, errFieldMap);

    return successResponse(res, `Successfully fetched field map`, fieldMap);
  } catch (err) {
    logger.error('Error while fetching extension-field-map:', err);
    return serverErrorResponse(res);
  }
};

const fieldMapControllers = {
  fetchCompanyFieldMap,
  fetchExtensionFieldMap,
};

module.exports = fieldMapControllers;
