// Packages
const Joi = require('joi');

// Utils
const {
  CADENCE_TYPES,
  CADENCE_STATUS,
  CADENCE_LEAD_STATUS,
} = require('../../../../../cadence-support-brain/src/utils/enums');

const fetchCadenceSchema = Joi.object({
  type: Joi.string()
    .required()
    .valid(...Object.values(CADENCE_TYPES)),
  status: Joi.string()
    .optional()
    .valid(...Object.values(CADENCE_STATUS)),
  created_by: Joi.string().guid().optional(),
  sd_id: Joi.string().optional(),
  limit: Joi.number().optional().default(10),
  offset: Joi.number().optional().default(0),
  search: Joi.string().optional(),
});

const fetchCadenceLeadsSchema = Joi.object({
  limit: Joi.number().optional().default(10),
  offset: Joi.number().optional().default(0),
  user_id: Joi.string().guid().required(),
  status: Joi.string()
    .optional()
    .valid(...Object.values(CADENCE_LEAD_STATUS)),
  search: Joi.number().optional(),
});

const Cadence = {
  fetchCadenceSchema,
  fetchCadenceLeadsSchema,
};

module.exports = Cadence;
