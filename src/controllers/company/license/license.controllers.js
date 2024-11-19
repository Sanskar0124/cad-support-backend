// Utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
  unprocessableEntityResponse,
  notFoundResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');
const {
  DB_TABLES,
} = require('../../../../../Cadence-Brain/src/utils/modelEnums');

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

const fetchCompanyLicense = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      include: {
        [DB_TABLES.USER]: {
          attributes: [],
        },
      },
      extras: {
        subQuery: false,
        group: ['company_id'],
        attributes: [
          'company_id',
          'plan_id',
          'plan_name',
          'name',
          'number_of_licences',
          'is_subscription_active',
          'is_trial_active',
          'trial_valid_until',
          'integration_type',
          'created_at',
          'status',
          'license_activated_on',
          [sequelize.literal(`COUNT(DISTINCT Users.user_id)`), 'user_count'],
        ],
        order: [['created_at', 'DESC']],
      },
    });
    if (errForCompany)
      return serverErrorResponse(res, `Error while fetching company`);

    if (company.is_subscription_active)
      company.license_type = 'License activated';
    else {
      company.license_type = 'Trial';
      const currentDate = new Date();
      const trialEndDate = new Date(company.trial_valid_until);

      // Get the time difference in milliseconds
      const differenceInMs = trialEndDate - currentDate;

      // Convert the time difference to days
      const differenceInDays = Math.ceil(
        differenceInMs / (1000 * 60 * 60 * 24)
      );

      // Check and format the result
      if (differenceInDays > 0) {
        company.license_period = `${differenceInDays} days left`;
      } else {
        company.license_period = 'Trial period has ended';
      }
    }

    return successResponse(
      res,
      'Company license fethced successfully',
      company
    );
  } catch (err) {
    logger.error(`Error while fetching company license: `, err);
    return serverErrorResponse(
      res,
      `Error while fetching company license : ${err.message}.`
    );
  }
};

const updateCompanyLicense = async (req, res) => {
  try {
    const params = CompanySchema.updateCompanyLicenseSchema.validate(req.body);
    if (params.error)
      return unprocessableEntityResponse(res, params.error.message);
    let { company_id } = params.value;
    if (req.body?.is_trial_active && req?.body?.is_subscription_active)
      return unprocessableEntityResponse(
        res,
        "is_subscription_active and is_trial_active both can't be true at same time!"
      );

    let [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      extras: {
        attributes: ['company_id'],
      },
    });
    if (errForCompany)
      return serverErrorResponse(
        res,
        `Error while fetching company: ${errForCompany}`
      );
    if (!company) return notFoundResponse(res, 'Company not found');

    let trialDays = null;
    const today = new Date();
    if (req.body?.is_trial_active) {
      if (!req?.body?.trial_duration) req.body.trial_duration = 14;
      else if (req?.body?.trial_duration > 365)
        return unprocessableEntityResponse(
          res,
          "Trial can't be more then 365 days"
        );
      trialDays = new Date(today);
      trialDays.setDate(today.getDate() + req?.body?.trial_duration);
      req.body.trial_valid_until = trialDays;
      req.body.license_activated_on = null;
    } else {
      req.body.license_activated_on = today;
      req.body.trial_valid_until = null;
    }

    delete req.body.company_id;

    let [updateCompanyLicense, errForUpdatingCompany] = await Repository.update(
      {
        tableName: DB_TABLES.COMPANY,
        query: { company_id },
        updateObject: req.body,
      }
    );
    if (errForUpdatingCompany)
      return serverErrorResponse(
        res,
        'Error updating company',
        errForUpdatingCompany
      );

    return successResponse(res, 'Company license updated successfully');
  } catch (err) {
    logger.error(`Error while updating company license: `, err);
    return serverErrorResponse(
      res,
      `Error while updating company license : ${err.message}.`
    );
  }
};

const LicenseController = {
  fetchCompanyLicense,
  updateCompanyLicense,
};

module.exports = LicenseController;
