// Utils
const {
  SALESFORCE_SOBJECTS,
  PIPEDRIVE_ENDPOINTS,
  HUBSPOT_ENDPOINTS,
  SELLSY_ENDPOINTS,
  FORM_FIELDS_FOR_CUSTOM_OBJECTS,
  ZOHO_ENDPOINTS,
  BULLHORN_ENDPOINTS,
  DYNAMICS_ENDPOINTS,
} = require('../../../../Cadence-Brain/src/utils/enums');

// Packages
const Joi = require('joi');

// * Describe a salesforce object
const describeSalesforceObjectSchema = Joi.object({
  object: Joi.string()
    .valid(...Object.values(SALESFORCE_SOBJECTS))
    .required(),
});

// * Describe pipedrive endpoint
const describePipedriveEndpointSchema = Joi.object({
  object: Joi.string()
    .valid(...Object.values(PIPEDRIVE_ENDPOINTS))
    .required(),
});

// * Describe pipedrive endpoint
const describeHubspotEndpointSchema = Joi.object({
  object: Joi.string()
    .valid(...Object.values(HUBSPOT_ENDPOINTS))
    .required(),
});

// * Describe sellsy endpoint
const describeSellsyEndpointSchema = Joi.object({
  object: Joi.string()
    .valid(...Object.values(SELLSY_ENDPOINTS))
    .required(),
});

const describeZohoObjectSchema = Joi.object({
  object: Joi.string()
    .valid(...Object.values(ZOHO_ENDPOINTS))
    .required(),
});

const describeBullhornObjectSchema = Joi.object({
  object: Joi.string()
    .valid(...Object.values(BULLHORN_ENDPOINTS))
    .required(),
});

// * Describe dynamics endpoint
const describeDynamicsEndpointSchema = Joi.object({
  object: Joi.string()
    .valid(...Object.values(DYNAMICS_ENDPOINTS))
    .required(),
});

module.exports = {
  describeSalesforceObjectSchema,
  describePipedriveEndpointSchema,
  describeHubspotEndpointSchema,
  describeZohoObjectSchema,
  describeSellsyEndpointSchema,
  describeBullhornObjectSchema,
  describeDynamicsEndpointSchema,
};
