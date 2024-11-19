// Packages
const Joi = require('joi');

// Utils
const {
  CADENCE_TYPES,
  CADENCE_STATUS,
  CADENCE_LEAD_STATUS,
  LEADS_FILTER,
} = require('../../../../../cadence-support-brain/src/utils/enums');

const fetchTeamsSchema = Joi.object({
  limit: Joi.number().optional().default(10),
  offset: Joi.number().optional().default(0),
  search: Joi.string().optional().max(30),
});

const fetchTeamSchema = Joi.object({
  limit: Joi.number().optional().default(10),
  offset: Joi.number().optional().default(0),
  search: Joi.string().optional().max(30),
  sd_id: Joi.string().required().label('Sub Department ID'),
  company_id: Joi.string().required().label('Company ID'),
});

const fetchTaskSchema = Joi.object({
  limit: Joi.number().optional().default(10),
  offset: Joi.number().optional().default(0),
  search: Joi.string().optional().max(30),
  filters: Joi.object({
    task_action: Joi.array().required().items(Joi.string()),
    task_status: Joi.array().required().items(Joi.string()),
    task_cadences: Joi.array().required().items(Joi.string()),
    task_date_creation: Joi.array().required().items(Joi.string()),
    task_type: Joi.array().required().items(Joi.string()),
  }).default({
    task_action: [],
    task_status: [],
    task_cadences: [],
    task_date_creation: [],
    task_type: [],
  }),
});

const fetchCadenceSchema = Joi.object({
  type: Joi.string()
    .optional()
    .valid(...Object.values(CADENCE_TYPES)),
  status: Joi.string()
    .optional()
    .valid(...Object.values(CADENCE_STATUS)),
  user_id: Joi.string().guid().required(),
  created_by: Joi.string().guid().optional(),
  limit: Joi.number().optional().default(10),
  offset: Joi.number().optional().default(0),
  search: Joi.string().optional(),
});

const fetchLeadsSchema = Joi.object({
  user_id: Joi.string().guid().required(),
  tag: Joi.array()
    .items(Joi.string().valid(...Object.values(LEADS_FILTER)))
    .default([]),
  search: Joi.number().optional(),
});

module.exports = {
  fetchTeamsSchema,
  fetchTeamSchema,
  fetchTaskSchema,
  fetchCadenceSchema,
  fetchLeadsSchema,
};
