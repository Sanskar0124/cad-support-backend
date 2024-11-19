const joi = require('joi');

const fetchCompanySchema = joi.object().keys({
  limit: joi.number().optional().default(10),
  offset: joi.number().optional().default(0),
  search: joi.string().optional().max(20),
});

const updateCompanyLicenseSchema = joi.object().keys({
  company_id: joi.string().required().label('Company ID'),
  is_subscription_active: joi
    .boolean()
    .required()
    .label('Is Subscription Active'),
  is_trial_active: joi.boolean().required().label('Is Trial Active'),
  trial_duration: joi.number().integer().optional().label('Trial Duration'),
});

const CompanySchema = {
  fetchCompanySchema,
  updateCompanyLicenseSchema,
};

module.exports = CompanySchema;
