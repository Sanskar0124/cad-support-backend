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
  CADENCE_STATUS,
  CADENCE_TYPES,
  LEAD_STATUS,
  CADENCE_LEAD_STATUS,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// DB
const { sequelize } = require('../../../../../Cadence-Brain/src/db/models');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');
const CadenceRepository = require('../../../../../Cadence-Brain/src/repository/cadence.repository');

//  Helpers and Services
const TeamsHelper = require('../../../../../cadence-support-brain/src/helper/teams');
const TaskHelper = require('../../../../../cadence-support-brain/src/helper/task');

// Joi validation
const TeamsSchema = require('../../../joi/company/teams');

// Packages
const { Op } = require('sequelize');

const fetchTask = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { error, value } = TeamsSchema.fetchTaskSchema.validate(req.body);
    if (error) return badRequestResponse(res, error.message);
    if (!user_id) return badRequestResponse(res, 'User id not specified');

    if (value.limit + value.offset > 200)
      return badRequestResponse(res, `Limit exceeded.`);

    const [tasks, errForTasks] = await TeamsHelper.getPendingTasks(
      value.search,
      value.filters,
      value.limit,
      value.offset,
      user_id
    );
    if (errForTasks) return serverErrorResponse(res, errForTasks);

    return successResponse(res, `Fetched Tasks Successfully for user.`, tasks);
  } catch (err) {
    logger.error('Error while fetching tasks: ', err);
    return serverErrorResponse(
      res,
      `Error while fetching tasks: ${err.message}.`
    );
  }
};

const getCadencesForTaskFilter = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'User id not specified');

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { user_id: user_id },
    });
    if (errForUser) return serverErrorResponse(res, errForUser);
    if (!user) return badRequestResponse(res, `No User found.`);

    let cadences = [],
      errForCadences = null;

    switch (user?.role) {
      case USER_ROLE.SALES_PERSON:
        [cadences, errForCadences] =
          await CadenceRepository.getCadencesByLeadQuery(
            {
              // cadence query
              status: CADENCE_STATUS.IN_PROGRESS,
            },
            {
              // lead query
              user_id: user.user_id,
            },
            ['name', 'cadence_id'], // cadence attributes
            [] // lead attributes
          );
        if (errForCadences) return serverErrorResponse(res, errForCadences);
        break;
      case USER_ROLE.SALES_MANAGER_PERSON:
      case USER_ROLE.SALES_MANAGER:
        [cadences, errForCadences] =
          await CadenceRepository.getCadencesByCreatedUserQuery(
            {
              //sd_id: user.sd_id, // should belong to user's sd_id
            }, // cadence query
            { sd_id: user.sd_id }, // user query
            ['name', 'cadence_id'], // cadence attributes
            [] // user attributes
          );
        if (errForCadences) return serverErrorResponse(res, errForCadences);

        let [companyCadences, errForCompanyCadences] =
          await Repository.fetchAll({
            tableName: DB_TABLES.CADENCE,
            query: {
              type: CADENCE_TYPES.COMPANY,
              company_id: user.company_id,
            },
            extras: {
              attributes: ['name', 'cadence_id'],
            },
          });
        cadences = cadences?.concat(companyCadences || []);
        break;
    }

    return successResponse(
      res,
      `Fetched cadences for user successfully.`,
      cadences
    );
  } catch (err) {
    logger.error(`Error while fething cadences for task filter: `, err);
    return serverErrorResponse(
      res,
      `Error while fething cadences for task filter: ${err.message}.`
    );
  }
};

const getNodeStats = async (req, res) => {
  try {
    const { node_id } = req.params;
    if (node_id == null || node_id === '')
      return badRequestResponse(res, 'Node id cannot be null.');

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
    if (errForLeadsOnCurrentNode) return serverErrorResponse(res);

    return successResponse(res, 'Node stats fetched successfully.', {
      leadsOnCurrentNode,
    });
  } catch (err) {
    logger.error('Error while fetching node stats: ', err);
    return serverErrorResponse(res);
  }
};

const getCountSummaryForTasksView = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'User id not specified');

    const [data, err] = await TaskHelper.findOrCreateTaskSummary({
      user_id: user_id,
      toUpdateInRedis: false,
    });
    if (err) {
      if (err === `Requested user not found.`)
        return notFoundResponse(res, `Requested user not found.`);
      return serverErrorResponse(res, err);
    }

    return successResponse(
      res,
      `Fetched count summary for task view successfully.`,
      data
    );
  } catch (err) {
    logger.error('Error while fetching count summary for task view: ', err);
    return serverErrorResponse(
      res,
      `Error while fetching count summary for task view: ${err.message}.`
    );
  }
};

const taskController = {
  fetchTask,
  getCadencesForTaskFilter,
  getNodeStats,
  getCountSummaryForTasksView,
};

module.exports = taskController;
