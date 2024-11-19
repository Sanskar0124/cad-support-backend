// utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  serverErrorResponse,
  successResponse,
  notFoundResponse,
  badRequestResponse,
  unauthorizedResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');
const {
  DB_TABLES,
} = require('../../../../../Cadence-Brain/src/utils/modelEnums');
const { USER_ROLE } = require('../../../../../Cadence-Brain/src/utils/enums');
const {
  SALT_ROUNDS,
} = require('../../../../../cadence-support-brain/src/utils/config');

// Packages
const bcrypt = require('bcrypt');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// Helpers
const token = require('../../../../../cadence-support-brain/src/helper/token');

// Other
const {
  signupValidationSchema,
  loginValidationSchema,
} = require('../../../joi/agent/auth');

const registerAgent = async (req, res) => {
  try {
    const { error, value } = signupValidationSchema.validate(req.body);
    if (error) return badRequestResponse(res, error.message);

    const { first_name, last_name, email, ringover_user_id, role } = value;
    if (![USER_ROLE.SUPPORT_AGENT, USER_ROLE.CADENCE_SALES].includes(role))
      return badRequestResponse(
        res,
        "Invalid Role! Role should be 'support_agent' or 'cadence_sales'"
      );
    const [agent, errForAgent] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { email },
    });
    if (errForAgent) return serverErrorResponse(res, errForAgent);

    if (agent) return badRequestResponse(res, 'Email already exists');

    const [newAgent, errForNewAgent] = await Repository.create({
      tableName: DB_TABLES.USER,
      createObject: {
        first_name: first_name,
        last_name: last_name,
        email: email,
        ringover_user_id: ringover_user_id,
        role: role,
        company_id: 0,
      },
    });
    if (errForNewAgent) return serverErrorResponse(res, errForNewAgent);

    return successResponse(res, 'Created agent successfully', newAgent);
  } catch (err) {
    logger.error(`Error while signing up agent: `, err);
    return serverErrorResponse(res);
  }
};

// const loginAgent = async (req, res) => {
//   try {
//     const { error, value } = loginValidationSchema.validate(req.body);
//     if (error) return badRequestResponse(res, error.message);

//     const { email, password } = value;
//     const [agent, errForAgent] = await Repository.fetchOne({
//       tableName: DB_TABLES.USER,
//       query: { email },
//     });
//     if (errForAgent) return serverErrorResponse(res, errForAgent);

//     if (!agent)
//       return notFoundResponse(res, 'Kindly check your username and password.');

//     if (!bcrypt.compareSync(password, agent.password)) {
//       return unauthorizedResponse(
//         res,
//         'Kindly check your username and password.'
//       );
//     }

//     const accessToken = token.access.generate(
//       agent.user_id,
//       agent.email,
//       agent.first_name,
//       agent.role
//     );

//     return successResponse(res, 'Successfully logged in', {
//       accessToken,
//       user_id: agent.user_id,
//       first_name: agent.first_name,
//       last_name: agent.last_name,
//       email: agent.email,
//       role: agent.role,
//     });
//   } catch (err) {
//     logger.error(`Error while logging in agent: `, err);
//     return serverErrorResponse(res);
//   }
// };

module.exports = {
  registerAgent,
  // loginAgent,
};
