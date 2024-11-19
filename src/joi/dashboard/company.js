// Packages
const Joi = require('joi');

// Utils
const {
  INTEGRATIONS_TYPE,
  CRM_INTEGRATIONS,
  PHONE_SYSTEM_TYPE,
  USER_LANGUAGES,
  HIRING_INTEGRATIONS,
  MAIL_INTEGRATION_TYPES,
} = require('../../../../cadence-support-brain/src/utils/enums');

/*
  {
    "company_name": {String}(required),
    "integration": {String}(required)(enum to refer: `INTEGRATIONS_TYPE`)(),
    "integration_type": {String}(required)(enum to refer: `CRM_INTEGRATIONS`)(`integration` value should be according to `integration_type`, if `integration` is `crm`/`hiring` then `integration_type` should be a `crm`/`hiring` integration),
    "mail_integration_type": {String}(optional),
    "number_of_licences": {Number}(required),
    "is_subscription_active": {Boolean}(required),
    "is_trial_active": {Boolean}(required),
    "trial_valid_until": {Date}(if `is_trial_active` is true then required else optional),
    "ringover_team_id": {String}(optional),
    "phone_system": {String}(required)(enum to refer: `PHONE_SYSTEM_TYPE`),
    "instance_url": {String}(if `integration_type` is `dynamics` then required else optional),
    "admin": {
        "first_name": {String}(required),
        "last_name": {String}(required),
        "email": {String}(required),
        "ringover_user_id": {Number}(optional),
        "ringover_api_key": {String}(optional),
        "language": {String}(optional)(enum to refer: `USER_LANGUAGES`),
        "timezone": {String}(required)
    }
*/

const createCompanySchema = Joi.object().keys({
  company_name: Joi.string().required().label('Company Name'),
  integration: Joi.string()
    .valid(...Object.values(INTEGRATIONS_TYPE))
    .required()
    .label('Integration'),
  integration_type: Joi.alternatives()
    .try(
      Joi.string()
        .required()
        .when('integration', {
          is: 'crm',
          then: Joi.valid(...Object.values(CRM_INTEGRATIONS)),
        }),
      Joi.string()
        .required()
        .when('integration', {
          is: 'hiring',
          then: Joi.valid(...Object.values(HIRING_INTEGRATIONS)),
        })
    )
    .required()
    .label('Integration Type'),
  mail_integration_type: Joi.string()
    .valid(...Object.values(MAIL_INTEGRATION_TYPES))
    .optional()
    .allow(null, '')
    .label('Mail'),
  number_of_licences: Joi.number().required().label('Number of Licences'),
  is_subscription_active: Joi.boolean().required().label('Subscription'),
  is_trial_active: Joi.boolean()
    .disallow(Joi.ref('is_subscription_active'))
    .required()
    .label('Trial'),
  trial_valid_until: Joi.date()
    .when('is_trial_active', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, ''),
    })
    .label('Trial Valid Until'),
  ringover_team_id: Joi.string()
    .optional()
    .allow(null, '')
    .label('Ringover Team Id'),
  phone_system: Joi.string()
    .valid(...Object.values(PHONE_SYSTEM_TYPE))
    .required()
    .label('Phone System'),
  instance_url: Joi.string()
    .when('integration_type', {
      is: CRM_INTEGRATIONS.DYNAMICS,
      then: Joi.string().required(),
      otherwise: Joi.string().optional().allow(null, ''),
    })
    .label('Instance Url'),
  admin: Joi.object()
    .keys({
      first_name: Joi.string().required().label('First Name'),
      last_name: Joi.string().required().label('Last Name'),
      email: Joi.string().email().required().label('Email'),
      ringover_user_id: Joi.number()
        .optional()
        .allow(null, '')
        .label('Ringover User Id'),
      ringover_api_key: Joi.string()
        .optional()
        .allow(null, '')
        .label('Ringover Api Key'),
      language: Joi.string()
        .default(USER_LANGUAGES.ENGLISH)
        .valid(...Object.values(USER_LANGUAGES))
        .optional()
        .label('Language'),
      timezone: Joi.string().required().label('Timezone'),
    })
    .required(),
});

const updateCompanyAndSuperAdminSchema = Joi.object().keys({
  company_id: Joi.string().guid().required().label('Company Id'),
  user_id: Joi.string().guid().required().label('User Id'),
  number_of_licences: Joi.number()
    .optional()
    .allow(0)
    .label('Number of Licenses'),
  is_subscription_active: Joi.boolean().optional().label('Subscription'),
  is_trial_active: Joi.boolean()
    .disallow(Joi.ref('is_subscription_active'))
    .optional()
    .label('Trial'),
  trial_valid_until: Joi.date()
    .when('is_trial_active', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, ''),
    })
    .label('Trial Valid Until'),
  email: Joi.string().email().optional().label('Email'),
  ringover_user_id: Joi.number()
    .optional()
    .allow(null)
    .label('Ringover User Id'),
  ringover_team_id: Joi.string()
    .optional()
    .allow(null, '')
    .label('Ringover Team Id'),
  timezone: Joi.string().optional().allow(null, '').label('Timezone'),
});

module.exports = {
  createCompanySchema,
  updateCompanyAndSuperAdminSchema,
};
