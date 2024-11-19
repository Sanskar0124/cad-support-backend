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
  CADENCE_TYPES,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// Packages
const { Op } = require('sequelize');

// DB
const { sequelize } = require('../../../../../Cadence-Brain/src/db/models');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// Joi validation
const TeamsSchema = require('../../../joi/company/teams');

const fetchAllCadences = async (req, res) => {
  try {
    const { error, value } = TeamsSchema.fetchCadenceSchema.validate(req.query);
    if (error) return badRequestResponse(res, error.message);

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: {
        user_id: value.user_id,
      },
    });
    if (errForUser)
      return serverErrorResponse(res, 'Error while fetching user');
    if (!user) return badRequestResponse(res, 'User not found.');

    let query = {},
      andQuery = [],
      include = {},
      orQuery = [];

    switch (value.type) {
      // Personal cadences
      case CADENCE_TYPES.PERSONAL:
        {
          // Switch according to role
          switch (user.role) {
            case USER_ROLE.SALES_PERSON: {
              andQuery.push(
                {
                  user_id: user.user_id,
                },
                { type: CADENCE_TYPES.PERSONAL }
              );
              include = {
                [DB_TABLES.CADENCE_SCHEDULE]: {
                  attributes: ['launch_at'],
                },
                [DB_TABLES.LEADTOCADENCE]: {
                  attributes: ['lead_id'],
                },
                [DB_TABLES.TAG]: {
                  attributes: ['tag_name'],
                },
                [DB_TABLES.NODE]: {
                  attributes: ['node_id'],
                },
                [DB_TABLES.USER]: {
                  where: { sd_id: user.sd_id },
                  [DB_TABLES.SUB_DEPARTMENT]: {
                    attributes: [
                      'sd_id',
                      'name',
                      'profile_picture',
                      'is_profile_picture_present',
                    ],
                  },
                  attributes: [
                    'sd_id',
                    'user_id',
                    'first_name',
                    'last_name',
                    'profile_picture',
                    'is_profile_picture_present',
                  ],
                  required: true,
                },
              };
              break;
            }
            case USER_ROLE.SALES_MANAGER: {
              andQuery.push({ type: CADENCE_TYPES.PERSONAL });
              include = {
                [DB_TABLES.CADENCE_SCHEDULE]: {
                  attributes: ['launch_at'],
                },
                [DB_TABLES.TAG]: {
                  attributes: ['tag_name'],
                },
                [DB_TABLES.NODE]: {
                  attributes: ['node_id'],
                },
                [DB_TABLES.USER]: {
                  where: { sd_id: user.sd_id },
                  [DB_TABLES.SUB_DEPARTMENT]: {
                    attributes: [
                      'sd_id',
                      'name',
                      'profile_picture',
                      'is_profile_picture_present',
                    ],
                  },
                  attributes: [
                    'sd_id',
                    'user_id',
                    'first_name',
                    'last_name',
                    'profile_picture',
                    'is_profile_picture_present',
                  ],
                  required: true,
                },
                [DB_TABLES.LEADTOCADENCE]: {
                  attributes: ['lead_id'],
                },
              };
              break;
            }
            case USER_ROLE.SUPER_ADMIN:
            case USER_ROLE.ADMIN: {
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
                  where: { company_id: user.company_id },
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
              break;
            }
            default:
              return badRequestResponse(res, 'Not an appropriate role.');
          }
        }
        break;

      // Team cadences
      case CADENCE_TYPES.TEAM:
        {
          // Switch according to role
          switch (user.role) {
            case USER_ROLE.SALES_PERSON: {
              andQuery.push(
                { sd_id: user.sd_id },
                { type: CADENCE_TYPES.TEAM }
              );
              include = {
                [DB_TABLES.CADENCE_SCHEDULE]: {
                  attributes: ['launch_at'],
                },
                [DB_TABLES.LEADTOCADENCE]: {
                  attributes: ['lead_id'],
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
                      'profile_picture',
                      'is_profile_picture_present',
                    ],
                  },
                  attributes: [
                    'sd_id',
                    'user_id',
                    'first_name',
                    'last_name',
                    'profile_picture',
                    'is_profile_picture_present',
                  ],
                },
              };
              break;
            }
            case USER_ROLE.SALES_MANAGER: {
              andQuery.push(
                { sd_id: user.sd_id },
                { type: CADENCE_TYPES.TEAM }
              );
              include = {
                [DB_TABLES.CADENCE_SCHEDULE]: {
                  attributes: ['launch_at'],
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
                      'profile_picture',
                      'is_profile_picture_present',
                    ],
                  },
                  attributes: [
                    'sd_id',
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
            case USER_ROLE.SUPER_ADMIN:
            case USER_ROLE.ADMIN: {
              andQuery.push({ type: CADENCE_TYPES.TEAM });
              include = {
                [DB_TABLES.CADENCE_SCHEDULE]: {
                  attributes: ['launch_at'],
                },
                [DB_TABLES.SUB_DEPARTMENT]: {
                  attributes: [
                    'sd_id',
                    'name',
                    'profile_picture',
                    'is_profile_picture_present',
                  ],
                  [DB_TABLES.DEPARTMENT]: {
                    attributes: [],
                    [DB_TABLES.COMPANY]: {
                      where: { company_id: user.company_id },
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
              break;
            }
            default:
              return badRequestResponse(res, 'Not an appropriate role.');
          }
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
            where: { company_id: user.company_id },
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
                'profile_picture',
                'is_profile_picture_present',
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

      default: {
        orQuery.push(
          {
            [Op.and]: [
              { company_id: user.company_id },
              { type: CADENCE_TYPES.COMPANY },
              {
                sd_id: {
                  [Op.is]: null,
                },
              },
            ],
          },
          {
            [Op.and]: [
              { user_id: user.user_id },
              { type: CADENCE_TYPES.PERSONAL },
              {
                sd_id: {
                  [Op.is]: null,
                },
              },
              {
                company_id: {
                  [Op.is]: null,
                },
              },
            ],
          },
          {
            [Op.and]: [
              { sd_id: user.sd_id },
              { type: CADENCE_TYPES.TEAM },
              {
                company_id: {
                  [Op.is]: null,
                },
              },
            ],
          }
        );

        include = {
          [DB_TABLES.CADENCE_SCHEDULE]: {
            attributes: ['launch_at'],
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
                'profile_picture',
                'is_profile_picture_present',
              ],
            },
            required: true,
            attributes: [
              'sd_id',
              'company_id',
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
      }
    }

    if (value?.status) andQuery.push({ status: value.status });
    if (value?.created_by) andQuery.push({ user_id: value.created_by });
    if (value?.search)
      andQuery.push(
        sequelize.where(sequelize.fn('lower', sequelize.col('Cadence.name')), {
          [Op.like]: `%${value.search.toLowerCase()}%`,
        })
      );

    query = { [Op.and]: andQuery };

    if (orQuery.length) query = { [Op.or]: orQuery };
    if (orQuery.length && andQuery.length)
      query = {
        [Op.and]: [{ [Op.or]: orQuery }, ...andQuery],
      };

    let extrasQuery = {
      required: true,
      attributes: [
        'cadence_id',
        'name',
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
      order: [['created_at', 'DESC']],
    };

    extrasQuery.limit = value.limit;
    extrasQuery.offset = value.offset;

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
    return serverErrorResponse(
      res,
      `Error while fetching cadences: ${err.message}`
    );
  }
};

const cadenceControllers = {
  fetchAllCadences,
};

module.exports = cadenceControllers;
