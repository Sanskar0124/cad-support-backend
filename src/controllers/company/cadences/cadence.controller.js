// Utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');
const {
  DB_TABLES,
} = require('../../../../../Cadence-Brain/src/utils/modelEnums');

const {
  LEAD_STATUS,
  NODE_TYPES,
  CADENCE_LEAD_STATUS,
  CADENCE_STATUS,
  CADENCE_TYPES,
  EMAIL_STATUS,
  CRM_INTEGRATIONS,
  SMS_STATUS,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// Packages
const { Op } = require('sequelize');

// DB
const { sequelize } = require('../../../../../Cadence-Brain/src/db/models');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// Helpers
const CadenceHelper = require('../../../../../cadence-support-brain/src/helper/cadence');
const NodeHelper = require('../../../../../cadence-support-brain/src/helper/node');

// Joi validation
const CadenceSchema = require('../../../joi/company/cadences');

const getAdminCadences = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required');

    const { error, value } = CadenceSchema.fetchCadenceSchema.validate(
      req.query
    );
    if (error) return badRequestResponse(res, error.message);

    // fetch admin user_id
    const [company, errForCompany] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: { company_id },
      extras: {
        attributes: ['company_id'],
      },
    });
    if (errForCompany) return serverErrorResponse(res, errForCompany);
    if (!company) return notFoundResponse(res, 'Company not found.');

    let query = {},
      andQuery = [],
      include = {};

    switch (value.type) {
      // Personal cadences
      case CADENCE_TYPES.PERSONAL:
        {
          andQuery.push({ type: CADENCE_TYPES.PERSONAL });
          include = {
            [DB_TABLES.CADENCE_SCHEDULE]: {
              attributes: ['launch_at'],
            },
            [DB_TABLES.USER]: {
              [DB_TABLES.SUB_DEPARTMENT]: {
                attributes: [
                  'sd_id',
                  'name',
                  'profile_picture',
                  'is_profile_picture_present',
                ],
              },
              attributes: [
                'user_id',
                'first_name',
                'last_name',
                'sd_id',
                'profile_picture',
                'is_profile_picture_present',
              ],
              where: { company_id: company.company_id },
              required: true,
            },
            [DB_TABLES.TAG]: {
              attributes: ['tag_name'],
            },
            [DB_TABLES.NODE]: {
              attributes: ['node_id'],
            },
            [DB_TABLES.LEADTOCADENCE]: {
              attributes: ['lead_id'],
            },
          };
        }
        break;

      // Team cadences
      case CADENCE_TYPES.TEAM:
        {
          andQuery.push({ type: CADENCE_TYPES.TEAM });
          include = {
            [DB_TABLES.CADENCE_SCHEDULE]: {
              attributes: ['launch_at'],
            },
            [DB_TABLES.SUB_DEPARTMENT]: {
              attributes: [
                'name',
                'sd_id',
                'profile_picture',
                'is_profile_picture_present',
              ],
              [DB_TABLES.DEPARTMENT]: {
                attributes: [],
                [DB_TABLES.COMPANY]: {
                  where: { company_id: company.company_id },
                },
                required: true,
              },
              required: true,
            },
            [DB_TABLES.TAG]: {
              attributes: ['tag_name'],
            },
            [DB_TABLES.NODE]: {
              attributes: ['node_id'],
            },
            [DB_TABLES.USER]: {
              attributes: [
                'user_id',
                'first_name',
                'last_name',
                'sd_id',
                'profile_picture',
                'is_profile_picture_present',
              ],
            },
            [DB_TABLES.LEADTOCADENCE]: {
              attributes: ['lead_id'],
            },
          };
        }
        break;

      // Company cadences
      case CADENCE_TYPES.COMPANY: {
        andQuery.push({ type: CADENCE_TYPES.COMPANY });
        include = {
          [DB_TABLES.CADENCE_SCHEDULE]: {
            attributes: ['launch_at'],
          },
          [DB_TABLES.COMPANY]: {
            where: { company_id: company.company_id },
            required: true,
          },
          [DB_TABLES.TAG]: {
            attributes: ['tag_name'],
          },
          [DB_TABLES.NODE]: {
            attributes: ['node_id'],
          },
          [DB_TABLES.USER]: {
            [DB_TABLES.SUB_DEPARTMENT]: {
              attributes: [
                'sd_id',
                'name',
                'is_profile_picture_present',
                'profile_picture',
              ],
            },
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'profile_picture',
              'is_profile_picture_present',
            ],
          },
          [DB_TABLES.LEADTOCADENCE]: {
            attributes: ['lead_id'],
          },
        };
        break;
      }
    }

    if (value.status) andQuery.push({ status: value.status });
    if (value.priority) andQuery.push({ priority: value.priority });
    if (value.created_by) andQuery.push({ user_id: value.created_by });
    if (value.sd_id) andQuery.push({ sd_id: value.sd_id });
    if (value.search)
      andQuery.push(
        sequelize.where(sequelize.fn('lower', sequelize.col('Cadence.name')), {
          [Op.like]: `%${value.search.toLowerCase()}%`,
        })
      );

    query = {
      [Op.and]: andQuery,
    };

    let extrasQuery = {
      required: true,
      attributes: [
        'cadence_id',
        'description',
        'name',
        'description',
        'status',
        'type',
        'priority',
        'inside_sales',
        'unix_resume_at',
        'integration_type',
        'user_id',
        'sd_id',
        'company_id',
        'created_at',
      ],
      limit: value.limit,
      offset: value.offset,
      order: [['created_at', 'DESC']],
    };

    let [cadences, errForCadence] = await Repository.fetchAll({
      tableName: DB_TABLES.CADENCE,
      query,
      include,
      extras: extrasQuery,
    });
    if (errForCadence) return serverErrorResponse(res, errForCadence);
    if (cadences.length === 0)
      return successResponse(res, 'No cadences found.', []);

    return successResponse(res, 'Cadences fetched successfully.', cadences);
  } catch (err) {
    logger.error(`Error while fetching cadences: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const getCadence = async (req, res) => {
  try {
    const { cadence_id } = req.params;
    if (!cadence_id) return badRequestResponse(res, 'Cadence id is required.');

    const { user_id } = req.query;
    if (!user_id) return badRequestResponse(res, 'User id is required.');

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { user_id: user_id },
    });
    if (errForUser) return serverErrorResponse(res, errForUser);

    // Retreive required cadence
    const [requiredCadence, errForRequiredCadence] = await Repository.fetchOne({
      tableName: DB_TABLES.CADENCE,
      query: { cadence_id },
      include: {
        [DB_TABLES.NODE]: {},
        [DB_TABLES.TAG]: {
          attributes: ['tag_name'],
        },
        [DB_TABLES.USER]: { attributes: ['sd_id', 'company_id'] },
      },
    });
    if (errForRequiredCadence)
      return serverErrorResponse(res, errForRequiredCadence);
    if (!requiredCadence) return notFoundResponse(res, 'Cadence not found.');

    const [access, errForAccess] = CadenceHelper.checkCadenceActionAccess({
      cadence: requiredCadence,
      user,
    });
    if (errForAccess) return serverErrorResponse(res);
    if (!access)
      return badRequestResponse(
        res,
        'You do not have access to read this cadence.'
      );

    let nodesInCadence = requiredCadence.Nodes;
    delete requiredCadence.Nodes;
    if (!nodesInCadence.length)
      return successResponse(res, 'Fetched cadence but no nodes present.', {
        ...requiredCadence,
        sequence: [],
      });

    // * sort all nodes in sequence
    const [nodesInSequence, errForNodesInSequence] =
      NodeHelper.getNodesInSequence(nodesInCadence);
    if (errForNodesInSequence) return serverErrorResponse(res, nodesInSequence);

    for (let node of nodesInSequence) {
      if (node.type === NODE_TYPES.AUTOMATED_MAIL) {
        // * since for automated mails multiple mail templates can be selected
        // * fetch attachments
        const [attachments, errForAttachments] = await Repository.fetchAll({
          tableName: DB_TABLES.ATTACHMENT,
          query: { attachment_id: node.data.attachments || [] },
        });

        // * replace attachment_ids with attachments
        node.data.attachments = attachments;
      } else if (node.type === NODE_TYPES.MAIL) {
        // * fetch attachments
        const [attachments, errForAttachments] = await Repository.fetchAll({
          tableName: DB_TABLES.ATTACHMENT,
          query: { attachment_id: node.data.attachments || [] },
        });

        // * replace attachment_ids with attachments
        node.data.attachments = attachments;
      } else if (
        [NODE_TYPES.REPLY_TO, NODE_TYPES.AUTOMATED_REPLY_TO].includes(node.type)
      ) {
        // * fetch attachments
        const [attachments, errForAttachments] = await Repository.fetchAll({
          tableName: DB_TABLES.ATTACHMENT,
          query: { attachment_id: node.data.attachments || [] },
        });

        // * replace attachment_ids with attachments
        node.data.attachments = attachments;
      }
    }

    const result = {
      ...requiredCadence,
      sequence: nodesInSequence,
    };

    return successResponse(res, 'Fetched cadence successfully.', result);
  } catch (err) {
    logger.error(`Error while fetching cadence sequence: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const getCadenceStatistics = async (req, res) => {
  try {
    const { cadence_id } = req.params;

    const [cadence, errForCadence] = await Repository.fetchOne({
      tableName: DB_TABLES.CADENCE,
      query: {
        cadence_id,
      },
      include: {
        [DB_TABLES.NODE]: {
          [DB_TABLES.TASK]: {
            attributes: [
              'task_id',
              'node_id',
              'lead_id',
              'completed',
              'is_skipped',
              'user_id',
            ],
          },
          order: ['step_number'],
        },
      },
      extras: {
        attributes: [],
        order: [['Nodes', 'step_number', 'ASC']],
      },
    });

    if (errForCadence) return serverErrorResponse(res, errForCadence);
    if (!cadence) return notFoundResponse(res, 'Cadence not found');

    const [cadenceLeads, errForCadenceLeads] = await Repository.count({
      tableName: DB_TABLES.LEADTOCADENCE,
      query: { cadence_id },
    });
    if (errForCadenceLeads) return serverErrorResponse(res, errForCadenceLeads);

    // * total leads

    const nodes = cadence?.Nodes;

    // * result to return
    let result = {
      cadenceName: cadence?.name,
      metrics: {
        totalLeads: cadenceLeads || 0,
      },
      nodeStats: [],
    };

    const currentTimeInUnix = new Date().getTime();

    // * loop for all nodes
    for (let node of nodes) {
      // Find all the leads that are on the current node step

      const leadsOnCurrentNodePromise = Repository.fetchAll({
        tableName: DB_TABLES.TASK,
        query: { node_id: node.node_id, completed: 0, is_skipped: 0 },
        include: {
          [DB_TABLES.LEAD]: {
            where: {
              status: {
                [Op.in]: [LEAD_STATUS.ONGOING, LEAD_STATUS.NEW_LEAD],
              },
            },
            attributes: [],
            required: true,
            [DB_TABLES.USER]: {
              required: true,
              attributes: [],
            },
            [DB_TABLES.LEADTOCADENCE]: {
              where: {
                status: { [Op.in]: [CADENCE_LEAD_STATUS.IN_PROGRESS] },
              },
              attributes: [],
              required: true,
            },
          },
        },
        extras: {
          attributes: [
            // 'start_time',
            [
              sequelize.literal(`COUNT(DISTINCT lead.lead_id,CASE
                WHEN start_time > ${currentTimeInUnix}
                THEN 1
                ELSE NULL
            END ) `),
              'scheduled_count',
            ],
            [
              sequelize.literal(`COUNT(DISTINCT lead.lead_id,CASE
                WHEN start_time < ${currentTimeInUnix}
                THEN 1
                ELSE NULL
            END ) `),
              'current_count',
            ],
          ],
        },
      });

      const doneAndSkippedTasksLeadsPromise = Repository.fetchAll({
        tableName: DB_TABLES.TASK,
        query: {
          cadence_id: cadence_id,
          node_id: node.node_id,
          [Op.or]: [
            {
              completed: true,
            },
            {
              is_skipped: true,
            },
          ],
        },
        include: {
          [DB_TABLES.LEAD]: {
            attributes: [],
            required: true,
            [DB_TABLES.USER]: {
              required: true,
              attributes: [],
            },
          },
        },
        extras: {
          attributes: [
            // 'lead_id',
            // 'completed',
            [
              sequelize.literal(`COUNT(DISTINCT lead.lead_id,CASE
                WHEN completed = 1
                THEN 1
                ELSE NULL
            END ) `),
              'completed_count',
            ],
            [
              sequelize.literal(`COUNT(DISTINCT lead.lead_id,CASE
                WHEN completed = 0
                THEN 1
                ELSE NULL
            END ) `),
              'skipped_count',
            ],
          ],
        },
      });

      const disqualifiedAndConvertedLeadsPromise = Repository.count({
        tableName: DB_TABLES.LEAD,
        query: {
          status: [LEAD_STATUS.TRASH, LEAD_STATUS.CONVERTED],
        },
        include: {
          [DB_TABLES.LEADTOCADENCE]: {
            where: {
              cadence_id,
              status_node_id: node.node_id,
            },
            attributes: [],
            required: true,
          },
          [DB_TABLES.USER]: {
            required: true,
            attributes: [],
          },
        },
        extras: {
          attributes: [],
          group: ['status'],
        },
      });

      const [
        [leadsOnCurrentNode, errForLeadsOnCurrentNode],
        [doneAndSkippedTasksForCurrentNode, errForDoneTasks],
        [disqualifedAndConvertedLeads, errForDisqualifiedLeads],
      ] = await Promise.all([
        leadsOnCurrentNodePromise,
        doneAndSkippedTasksLeadsPromise,
        disqualifiedAndConvertedLeadsPromise,
      ]);
      if (errForLeadsOnCurrentNode)
        return serverErrorResponse(
          res,
          `Error while fetching leads on current node:`,
          errForLeadsOnCurrentNode
        );
      if (errForDoneTasks)
        return serverErrorResponse(
          res,
          `Error while fetching done tasks: `,
          errForDoneTasks
        );
      if (errForDisqualifiedLeads)
        return serverErrorResponse(
          res,
          `Error while fetching disqulified leads: `,
          errForDisqualifiedLeads
        );
      switch (node.type) {
        case NODE_TYPES.MAIL:
        case NODE_TYPES.AUTOMATED_MAIL:
        case NODE_TYPES.REPLY_TO:
        case NODE_TYPES.AUTOMATED_REPLY_TO:
          if (node.data?.aBTestEnabled) {
            const [templateMails, errForTemplateMails] =
              await Repository.fetchAll({
                tableName: DB_TABLES.A_B_TESTING,
                query: {
                  node_id: node.node_id,
                },
                include: {
                  [DB_TABLES.EMAIL]: {
                    attributes: [],
                    required: true,
                    [DB_TABLES.LEAD]: {
                      required: true,
                      attributes: [],
                      [DB_TABLES.USER]: {
                        required: true,
                        attributes: [],
                      },
                    },
                  },
                },
                extras: {
                  group: ['ab_template_id'],
                  attributes: [
                    'ab_template_id',
                    [
                      sequelize.literal(`COUNT(DISTINCT email.lead_id, CASE
                          WHEN email.unsubscribed = 1
                            THEN 1
                            ELSE NULL
                          END ) `),
                      'unsubscribed_count',
                    ],
                    [
                      sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.DELIVERED}", "${EMAIL_STATUS.OPENED}", "${EMAIL_STATUS.CLICKED}") AND email.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                      'delivered_count',
                    ],
                    [
                      sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.DELIVERED}") AND email.sent=0
                            THEN 1
                            ELSE NULL
                          END ) `),
                      'replied_count',
                    ],
                    [
                      sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.OPENED}", "${EMAIL_STATUS.CLICKED}") AND email.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                      'opened_count',
                    ],
                    [
                      sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.CLICKED}") AND email.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                      'clicked_count',
                    ],
                    [
                      sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.BOUNCED}")
                            THEN 1
                            ELSE NULL
                          END ) `),
                      'bounced_count',
                    ],
                  ],
                },
              });
            if (errForTemplateMails)
              return serverErrorResponse(
                res,
                `Error while fetching ab template mails for statistics : `,
                errForTemplateMails
              );

            result['nodeStats'].push({
              name: node.name,
              task_count: node?.Tasks?.length,
              tasks: node.Tasks,
              node_id: node.node_id,
              aBTestEnabled: true,
              data: templateMails,
              leadsOnCurrentNode,
              doneAndSkippedTasksForCurrentNode,
              disqualifedAndConvertedLeads,
            });
          } else {
            const [mails, errForMails] = await Repository.fetchAll({
              tableName: DB_TABLES.EMAIL,
              query: { node_id: node.node_id },
              attributes: [],
              include: {
                [DB_TABLES.LEAD]: {
                  required: true,
                  attributes: [],
                  [DB_TABLES.USER]: {
                    required: true,
                    attributes: [],
                  },
                },
              },
              extras: {
                // group: ['Email.lead_id'],
                attributes: [
                  [
                    sequelize.literal(`COUNT(DISTINCT email.lead_id, CASE
                          WHEN email.unsubscribed = 1 AND email.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                    'unsubscribed_count',
                  ],
                  [
                    sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.DELIVERED}", "${EMAIL_STATUS.OPENED}", "${EMAIL_STATUS.CLICKED}") AND email.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                    'delivered_count',
                  ],
                  [
                    sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.DELIVERED}") AND email.sent=0
                            THEN 1
                            ELSE NULL
                          END ) `),
                    'replied_count',
                  ],
                  [
                    sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.OPENED}", "${EMAIL_STATUS.CLICKED}") AND email.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                    'opened_count',
                  ],
                  [
                    sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.CLICKED}") AND email.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                    'clicked_count',
                  ],
                  [
                    sequelize.literal(`COUNT(DISTINCT email.lead_id,CASE
                          WHEN email.status IN ("${EMAIL_STATUS.BOUNCED}") AND email.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                    'bounced_count',
                  ],
                ],
              },
            });
            if (errForMails)
              return serverErrorResponse(res, errForMails.message);

            result['nodeStats'].push({
              name: node.name,
              node_id: node.node_id,
              task_count: node?.Tasks?.length,
              tasks: node.Tasks,
              data: mails,
              leadsOnCurrentNode,
              doneAndSkippedTasksForCurrentNode,
              disqualifedAndConvertedLeads,
            });
          }
          break;
        case NODE_TYPES.MESSAGE:
        case NODE_TYPES.AUTOMATED_MESSAGE:
          if (node.data?.aBTestEnabled) {
            const [templateMessages, errForTemplateMessages] =
              await Repository.fetchAll({
                tableName: DB_TABLES.A_B_TESTING,
                query: {
                  node_id: node.node_id,
                },
                include: {
                  [DB_TABLES.MESSAGE]: {
                    attributes: [],
                    required: true,
                    [DB_TABLES.LEAD]: {
                      required: true,
                      attributes: [],
                      [DB_TABLES.USER]: {
                        required: true,
                        attributes: [],
                      },
                    },
                  },
                },
                extras: {
                  group: ['ab_template_id'],
                  attributes: [
                    'ab_template_id',
                    [
                      sequelize.literal(`COUNT(DISTINCT message.lead_id,CASE
                          WHEN message.status IN ("${SMS_STATUS.DELIVERED}", "${SMS_STATUS.CLICKED}") AND message.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                      'delivered_count',
                    ],
                    [
                      sequelize.literal(`COUNT(DISTINCT message.lead_id,CASE
                          WHEN message.status IN ("${SMS_STATUS.CLICKED}") AND message.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                      'clicked_count',
                    ],
                  ],
                },
              });
            if (errForTemplateMessages)
              return serverErrorResponse(
                res,
                `Error while fetching ab template messages for statistics : `,
                errForTemplateMessages
              );

            result['nodeStats'].push({
              name: node.name,
              node_id: node.node_id,
              task_count: node?.Tasks?.length,
              task: node.Tasks,
              aBTestEnabled: true,
              data: templateMessages,
              leadsOnCurrentNode,
              doneAndSkippedTasksForCurrentNode,
              disqualifedAndConvertedLeads,
            });
          } else {
            const [messages, errForMessages] = await Repository.fetchAll({
              tableName: DB_TABLES.MESSAGE,
              query: { node_id: node.node_id },
              attributes: [],
              include: {
                [DB_TABLES.LEAD]: {
                  required: true,
                  attributes: [],
                  [DB_TABLES.USER]: {
                    required: true,
                    attributes: [],
                  },
                },
              },
              extras: {
                // group: ['Message.lead_id'],
                attributes: [
                  [
                    sequelize.literal(`COUNT(DISTINCT message.lead_id,CASE
                          WHEN message.status IN ("${SMS_STATUS.DELIVERED}", "${SMS_STATUS.CLICKED}") AND message.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                    'delivered_count',
                  ],

                  [
                    sequelize.literal(`COUNT(DISTINCT message.lead_id,CASE
                          WHEN message.status IN ("${SMS_STATUS.CLICKED}") AND message.sent=1
                            THEN 1
                            ELSE NULL
                          END ) `),
                    'clicked_count',
                  ],
                ],
              },
            });
            if (errForMessages) return serverErrorResponse(res, errForMessages);

            result['nodeStats'].push({
              name: node.name,
              node_id: node.node_id,
              task_count: node?.Tasks?.length,
              task: node.Tasks,
              data: messages,
              leadsOnCurrentNode,
              doneAndSkippedTasksForCurrentNode,
              disqualifedAndConvertedLeads,
            });
          }
          break;
        case NODE_TYPES.END:
          if (node.data?.moved_leads) {
            const [movedLeads, errForMovedLeads] = await Repository.fetchAll({
              tableName: DB_TABLES.LEAD,
              query: {
                lead_id: node.data?.moved_leads,
              },
              include: {
                [DB_TABLES.USER]: {
                  attributes: [],
                  required: true,
                },
              },
              extras: {
                attributes: [
                  [
                    sequelize.literal(`COUNT(DISTINCT lead_id ) `),
                    'moved_count',
                  ],
                ],
              },
            });
            if (errForMovedLeads) {
              logger.error(
                `Error while fetching moved leads: `,
                errForMovedLeads
              );
              return serverErrorResponse(res, errForMovedLeads);
            }
            result['nodeStats'].push({
              name: node.name,
              node_id: node.node_id,
              task_count: node?.Tasks?.length,
              task: node.Tasks,
              // data: node.data,
              leadsOnCurrentNode,
              doneAndSkippedTasksForCurrentNode,
              disqualifedAndConvertedLeads,
              movedLeads,
            });
          } else {
            result['nodeStats'].push({
              name: node.name,
              node_id: node.node_id,
              task_count: node?.Tasks?.length,
              task: node.Tasks,
              // data: node.data,
              leadsOnCurrentNode,
              doneAndSkippedTasksForCurrentNode,
              disqualifedAndConvertedLeads,
            });
          }
          break;
        default:
          result['nodeStats'].push({
            name: node.name,
            node_id: node.node_id,
            task_count: node?.Tasks?.length,
            task: node.Tasks,
            // data: node.data,
            leadsOnCurrentNode,
            doneAndSkippedTasksForCurrentNode,
            disqualifedAndConvertedLeads,
          });
          break;
      }
    }

    return successResponse(res, 'Fetched statistics.', result);
  } catch (err) {
    logger.error(`Error while fetching cadence statistics: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const getAllLeadsForCadence = async (req, res) => {
  try {
    const { cadence_id } = req.params;
    if (!cadence_id) return badRequestResponse(res, 'Cadence id is required.');

    const { error, value } = CadenceSchema.fetchCadenceLeadsSchema.validate(
      req.query
    );
    if (error) return badRequestResponse(res, error.message);

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { user_id: value.user_id },
    });
    if (errForUser) return serverErrorResponse(res, errForUser);

    // Get cadence info
    const [cadence, errForCadence] = await Repository.fetchOne({
      tableName: DB_TABLES.CADENCE,
      query: { cadence_id },
      include: {
        [DB_TABLES.USER]: { attributes: ['sd_id', 'company_id'] },
      },
      extras: {
        attributes: [
          'cadence_id',
          'name',
          'status',
          'type',
          'user_id',
          'sd_id',
          'company_id',
        ],
      },
    });
    if (!cadence) return badRequestResponse(res, 'This cadence does not exist');
    if (errForCadence) return serverErrorResponse(res, errForCadence);

    const [access, errForAccess] = CadenceHelper.checkCadenceActionAccess({
      cadence,
      user,
    });
    if (errForAccess) return serverErrorResponse(res);
    if (!access)
      return badRequestResponse(res, 'You do not have access to read this.');

    let query = { cadence_id };
    let lead_query = {};
    let leadAndQuery = [];

    if (value.status) {
      if (
        value.status === CADENCE_LEAD_STATUS.PAUSED &&
        cadence.status === CADENCE_STATUS.PAUSED
      ) {
        query.status = {
          [Op.in]: [
            CADENCE_LEAD_STATUS.PAUSED,
            CADENCE_LEAD_STATUS.IN_PROGRESS,
          ],
        };
      } else if (
        value.status === CADENCE_LEAD_STATUS.PAUSED &&
        cadence.status === CADENCE_STATUS.IN_PROGRESS
      ) {
        query.status = null;
      } else query.status = value.status;
    }

    if (value.search)
      leadAndQuery.push({
        lead_id: { [Op.like]: `%${value.search}%` },
      });

    lead_query = {
      [Op.and]: leadAndQuery,
    };

    let extras = {
      order: [['created_at', 'DESC']],
      attributes: ['lead_id', 'status', 'user_id', 'created_at'],
      required: true,
    };

    // * get leads for the cadence
    let [cadenceLeads, errForCadenceLeads] = await Repository.fetchAll({
      tableName: DB_TABLES.LEAD,
      query: lead_query,
      include: {
        [DB_TABLES.LEADTOCADENCE]: {
          where: query,
          [DB_TABLES.CADENCE]: {
            [DB_TABLES.NODE]: {
              required: true,
              attributes: ['node_id'],
            },
            attributes: ['cadence_id', 'name'],
          },
          [DB_TABLES.TASK]: {
            [DB_TABLES.NODE]: {
              required: true,
              attributes: ['type', 'step_number'],
            },
            attributes: ['task_id'],
          },
          attributes: ['status', 'created_at', 'unix_resume_at'],
          required: true,
        },
        [DB_TABLES.ACCOUNT]: {
          attributes: ['account_id'],
        },
      },
      extras,
    });
    if (errForCadenceLeads) return serverErrorResponse(res, errForCadenceLeads);

    cadenceLeads = cadenceLeads.slice(parseInt(value.offset));
    cadenceLeads = cadenceLeads.slice(0, parseInt(value.limit));

    return successResponse(res, `Fetched leads successfully.`, cadenceLeads);
  } catch (err) {
    logger.error(`Error while fetching leads for a cadence: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const getNodeStats = async (req, res) => {
  try {
    const { node_id } = req.params;
    if (node_id == null || node_id === '')
      return badRequestResponse(res, 'Node id cannot be null');

    const currentTimeInUnix = new Date().getTime();

    const [leadsOnCurrentNode, errForLeadsOnCurrentNode] =
      await Repository.fetchAll({
        tableName: DB_TABLES.TASK,
        query: { node_id, completed: 0, is_skipped: 0 },
        include: {
          [DB_TABLES.LEAD]: {
            where: {
              status: {
                [Op.in]: [LEAD_STATUS.ONGOING, LEAD_STATUS.NEW_LEAD],
              },
            },
            attributes: [],
            required: true,
            [DB_TABLES.LEADTOCADENCE]: {
              where: {
                status: { [Op.in]: [CADENCE_LEAD_STATUS.IN_PROGRESS] },
              },
              attributes: [],
              required: true,
            },
          },
          [DB_TABLES.USER]: {
            attributes: [
              'user_id',
              'first_name',
              'last_name',
              'is_profile_picture_present',
              'profile_picture',
            ],
          },
        },
        extras: {
          attributes: [
            [
              sequelize.literal(`COUNT(CASE
                  WHEN start_time > ${currentTimeInUnix}
                  THEN 1
                  ELSE NULL
              END ) `),
              'scheduled_count',
            ],
            [
              sequelize.literal(`COUNT(CASE
                  WHEN start_time < ${currentTimeInUnix}
                  THEN 1
                  ELSE NULL
              END ) `),
              'count',
            ],
            'user_id',
            'start_time',
          ],
          group: [['user_id']],
        },
      });
    if (errForLeadsOnCurrentNode)
      return serverErrorResponse(
        res,
        `Error while fetching leads on current node: ${errForLeadsOnCurrentNode}`
      );

    return successResponse(res, 'Node stats fetched successfully.', {
      leadsOnCurrentNode,
    });
  } catch (err) {
    logger.error(`Error while fetching node statss: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const cadenceControllers = {
  getAdminCadences,
  getCadence,
  getCadenceStatistics,
  getAllLeadsForCadence,
  getNodeStats,
};

module.exports = cadenceControllers;
