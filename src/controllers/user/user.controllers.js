// Utils
const logger = require('../../../../cadence-support-brain/src/utils/winston');
const {
  successResponse,
  serverErrorResponse,
  badRequestResponse,
} = require('../../../../cadence-support-brain/src/utils/response');
const { DB_TABLES } = require('../../../../Cadence-Brain/src/utils/modelEnums');
const {
  USER_ROLE,
} = require('../../../../cadence-support-brain/src/utils/enums');
const {
  CRM_SERVER_URL,
} = require('../../../../cadence-support-brain/src/utils/config');

// Packages
const { Op } = require('sequelize');
const axios = require('axios');

// Repositories
const Repository = require('../../../../cadence-support-brain/src/repository');
const { sequelize } = require('../../../../Cadence-Brain/src/db/models');

// Helpers and Services
const RingoverHelper = require('../../../../cadence-support-brain/src/helper/ringover-service');

// Joi validation
const UserSchema = require('../../joi/user');

const fetchUsers = async (req, res) => {
  try {
    if (req.agent.support_role !== USER_ROLE.SUPPORT_ADMIN)
      return serverErrorResponse(
        res,
        'You are not authorized to perform this action'
      );

    const { limit, offset, search } = req.query;

    let whereQuery = {
      support_role: {
        [Op.or]: [USER_ROLE.SUPPORT_ADMIN, USER_ROLE.SUPPORT_AGENT],
      },
    };

    if (search) {
      const searchQuery = search.trim().toLowerCase();

      whereQuery[Op.or] = [
        sequelize.literal(
          `LOWER(CONCAT(\`User\`.\`first_name\`, ' ', \`User\`.\`last_name\`)) LIKE '%${searchQuery}%'`
        ),
        sequelize.literal(`LOWER(\`User\`.\`email\`) LIKE '%${searchQuery}%'`),
      ];
    }

    const [users, errForUsers] = await Repository.fetchAll({
      tableName: DB_TABLES.USER,
      query: whereQuery,
      include: {
        [DB_TABLES.RINGOVER_TOKENS]: {
          attributes: ['expires_at'],
        },
      },
      extras: {
        attributes: [
          'user_id',
          'first_name',
          'last_name',
          'email',
          'support_role',
          'ringover_user_id',
          'company_id',
          'is_profile_picture_present',
          'profile_picture',
          'created_at',
        ],
        limit: parseInt(limit) || 10,
        offset: parseInt(offset) || 0,
        order: [['created_at', 'DESC']],
      },
    });
    if (errForUsers)
      return serverErrorResponse(
        res,
        'Error while fetching users',
        errForUsers
      );

    return successResponse(res, 'Users fetched successfully', users);
  } catch (err) {
    logger.error('Error while fetching users: ', err);
    return serverErrorResponse(res, 'Error while fetching users', err.message);
  }
};

// * Fetch users from Ringover
const getUsersFromRingover = async (req, res) => {
  try {
    logger.info('Fetching users from Ringover', { user_id: req.agent.user_id });

    let { data } = await axios.get(
      `${RingoverHelper.regionURL(req.agent.region)}/gateway/app/team/members`,
      {
        headers: {
          Authorization: `Bearer ${req.agent.access_token}`,
        },
      }
    );

    return successResponse(
      res,
      'Successfully fetched users from Ringover',
      data
    );
  } catch (err) {
    logger.error('Error while getting users from Ringover: ', err);
    return serverErrorResponse(
      res,
      `Error while getting users from Ringover: ${err.message}`
    );
  }
};

const addSupportAgent = async (req, res) => {
  try {
    const { value, error } = UserSchema.addSupportAgentSchema.validate(
      req.body
    );
    if (error) return badRequestResponse(res, error.message);

    const { access_token } = req.agent;

    let config = {
      method: 'put',
      url: `${CRM_SERVER_URL}/v2/support/user/add`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      data: value,
    };

    await axios(config);

    return successResponse(res, 'User added successfully.');
  } catch (err) {
    logger.error('Error while adding user to support: ', err);
    return serverErrorResponse(
      res,
      `Error while adding user to support: ${err.message}`
    );
  }
};

const removeUserFromSupport = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { access_token } = req.agent;

    if (!user_id) return badRequestResponse(res, 'User id is required');

    let config = {
      method: 'put',
      url: `${CRM_SERVER_URL}/v2/support/user/remove/${user_id}`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    };

    await axios(config);

    return successResponse(res, 'User removed successfully.');
  } catch (err) {
    logger.error('Error while removing user from support: ', err);
    return serverErrorResponse(
      res,
      `Error while removing user from support: ${err.message}`
    );
  }
};

const updateSupportRole = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'User id is required');

    const { access_token } = req.agent;
    const { support_role } = req.query;
    if (!support_role)
      return badRequestResponse(res, 'Support role is required');

    let config = {
      method: 'patch',
      url: `${CRM_SERVER_URL}/v2/support/user/update/${user_id}?support_role=${support_role}`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    };

    await axios(config);

    return successResponse(res, 'User role updated successfully.');
  } catch (err) {
    logger.error('Error while updating user role: ', err);
    return serverErrorResponse(
      res,
      `Error while updating user role: ${err.message}`
    );
  }
};

const markProductTourAsComplete = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'Please specify the user id');

    const { access_token } = req.agent;
    let config = {
      method: 'put',
      url: `${CRM_SERVER_URL}/v2/support/user/complete-product-tour/${user_id}`,
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    };

    await axios(config);
    return successResponse(res, 'Product tour mark as complete Successfully');
  } catch (err) {
    logger.error(`Error while marking product tour as complete: `, err);
    if (err?.response?.data?.error)
      return serverErrorResponse(
        res,
        `Error while marking product tour as complete: ${err?.response?.data?.error}`
      );

    return serverErrorResponse(
      res,
      `Error while marking product tour as complete: ${err.message}`
    );
  }
};

const userController = {
  fetchUsers,
  getUsersFromRingover,
  addSupportAgent,
  removeUserFromSupport,
  updateSupportRole,
  markProductTourAsComplete,
};

module.exports = userController;
