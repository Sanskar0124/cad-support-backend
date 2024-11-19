// * Utils
const logger = require('../../../../../cadence-support-brain/src/utils/winston');
const {
  serverErrorResponse,
  successResponse,
  notFoundResponse,
  badRequestResponse,
  unauthorizedResponse,
} = require('../../../../../cadence-support-brain/src/utils/response');
const {
  RINGOVER_OAUTH,
} = require('../../../../../cadence-support-brain/src/utils/config');
const {
  DB_TABLES,
} = require('../../../../../Cadence-Brain/src/utils/modelEnums');

// * Packages
const axios = require('axios');
var FormData = require('form-data');

// * Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// * Helpers and Services
const CryptoHelper = require('../../../../../cadence-support-brain/src/helper/crypto');
const UserHelper = require('../../../../../cadence-support-brain/src/helper/user');

// * Get redirect URL
const redirectToRingover = async (req, res) => {
  try {
    let URI = `https://auth.ringover.com/oauth2/authorize?response_type=code&client_id=${RINGOVER_OAUTH.RINGOVER_CLIENT_ID_EU}&redirect_uri=${RINGOVER_OAUTH.REDIRECT_URL}&scope=cadence.all&code_challenge=${RINGOVER_OAUTH.CODE_CHALLENGE}&code_challenge_method=S256`;
    return successResponse(res, 'Redirect to this URI.', { URI });
  } catch (err) {
    logger.error(`Error while redirecting to ringover auth: `, err);
    return serverErrorResponse(
      res,
      `Error while redirecting to ringover auth: ${err.message}`
    );
  }
};

// * Authorize code
const authorizeRingover = async (req, res) => {
  try {
    const { code } = req.query;

    if (code === null || code === '')
      return badRequestResponseWithDevMsg({
        res,
        msg: 'Failed to connect with Ringover',
        error: 'Code not valid',
      });

    let requestBody = new FormData();
    requestBody.append('code', code);
    requestBody.append('grant_type', 'authorization_code');
    requestBody.append('client_id', RINGOVER_OAUTH.RINGOVER_CLIENT_ID_EU);
    requestBody.append('redirect_uri', RINGOVER_OAUTH.REDIRECT_URL);
    requestBody.append('code_verifier', RINGOVER_OAUTH.CODE_VERIFIER);

    // * Fetch access tokens
    const { data: ringover_tokens } = await axios.post(
      'https://auth.ringover.com/oauth2/access_token',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...requestBody.getHeaders(),
        },
      }
    );

    requestBody = new FormData();
    requestBody.append('token', ringover_tokens.id_token);

    const { data: inspectedToken } = await axios.post(
      'https://auth.ringover.com/oauth2/introspect',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...requestBody.getHeaders(),
        },
      }
    );

    let { region, user_id: ringover_user_id } = inspectedToken;

    console.log('Values fetched from token ===> ');
    console.log('Region : ' + region);
    console.log('ringover_user_id : ' + ringover_user_id);

    // * Encrypting tokens
    const [accessToken, errAccessToken] = CryptoHelper.encrypt(
      ringover_tokens.id_token
    );
    if (errAccessToken)
      return serverErrorResponse(
        res,
        `Error while encrypting access token: ${errAccessToken}`
      );
    const [refreshToken, errRefreshToken] = CryptoHelper.encrypt(
      ringover_tokens.refresh_token
    );
    if (errRefreshToken)
      return serverErrorResponse(
        res,
        `Error while encrypting refresh token: ${errRefreshToken}`
      );

    // * Fetch user from database
    const [user, errFetchingUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { ringover_user_id },
      extras: {
        attributes: [
          'user_id',
          'first_name',
          'last_name',
          'role',
          'email',
          'support_role',
        ],
      },
    });
    if (errFetchingUser)
      return serverErrorResponseWithDevMsg(res, errFetchingUser);
    if (!user)
      return badRequestResponse(
        res,
        "We couldn't find your Cadence Support account associated with Ringover user ID. Please contact support"
      );

    if (!user.support_role)
      return unauthorizedResponse(
        res,
        'User does not have cadence support access'
      );

    // * Calculate expires_in
    let expires_at = new Date();
    const milliseconds = ringover_tokens.expires_in * 1000;
    expires_at = new Date(expires_at.getTime() + milliseconds);

    //  create token
    const [_, errCreatingRingoverTokens] = await Repository.create({
      tableName: DB_TABLES.RINGOVER_TOKENS,
      query: { user_id: user.user_id },
      createObject: {
        encrypted_access_token: accessToken,
        encrypted_refresh_token: refreshToken,
        region,
        user_id: user.user_id,
        expires_at,
      },
    });
    if (errCreatingRingoverTokens)
      return serverErrorResponse(
        res,
        'Failed to authenticate, please verify access'
      );

    return successResponse(res, 'Successfully logged in.', {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      email: user.email,
      support_role: user.support_role,
      ringover_tokens,
    });
  } catch (err) {
    logger.error(`Error while authorizing with Ringover:`, err);
    return serverErrorResponse(
      res,
      `Error while authorizing with Ringover: ${err.message}`
    );
  }
};

// * Access token
const getAccessToken = async (req, res) => {
  try {
    let { id_token, refresh_token } = req.body;

    console.log('[DEBUG] : Fetching new ringover access token ===> ');
    console.log(id_token);
    console.log(refresh_token);

    // * Encrypting tokens
    let [encryptedAccessToken, errAccessToken] = CryptoHelper.encrypt(id_token);
    if (errAccessToken)
      return serverErrorResponse(
        res,
        `Error while encrypting access token: ${errAccessToken}`
      );

    let includeObject = {};
    if (req.query.agent)
      includeObject = {
        [DB_TABLES.USER]: {
          attributes: [
            'user_id',
            'first_name',
            'last_name',
            'role',
            'email',
            'support_role',
          ],
        },
      };

    // * Fetch the id_token
    const [ringoverToken, errFetchingRingoverToken] = await Repository.fetchOne(
      {
        tableName: DB_TABLES.RINGOVER_TOKENS,
        query: {
          encrypted_access_token: encryptedAccessToken,
        },
        include: includeObject,
        extras: {
          attributes: ['ringover_token_id', 'user_id'],
        },
      }
    );
    if (errFetchingRingoverToken)
      return serverErrorResponse(res, errFetchingRingoverToken);
    if (!ringoverToken) {
      UserHelper.deleteUserSession(id_token);
      return notFoundResponse(res, 'Unable to find tokens');
    }

    if (req.query.agent && !ringoverToken?.User?.support_role)
      return unauthorizedResponse(
        res,
        'User does not have cadence support access'
      );

    let requestBody = new FormData();
    requestBody.append('refresh_token', refresh_token);
    requestBody.append('grant_type', 'refresh_token');
    requestBody.append('client_id', RINGOVER_OAUTH.RINGOVER_CLIENT_ID_EU);

    const { data } = await axios.post(
      'https://auth.ringover.com/oauth2/access_token',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...requestBody.getHeaders(),
        },
      }
    );

    // * Encrypting tokens
    [encryptedAccessToken, errAccessToken] = CryptoHelper.encrypt(
      data.id_token
    );
    if (errAccessToken)
      return serverErrorResponse(
        res,
        `Error while encrypting access token: ${errAccessToken}`
      );
    const [encryptedRefreshToken, errRefreshToken] = CryptoHelper.encrypt(
      data.refresh_token
    );
    if (errRefreshToken)
      return serverErrorResponse(
        res,
        `Error while encrypting refresh token: ${errRefreshToken}`
      );

    // * Calculate expires_in
    let expires_at = new Date();
    const milliseconds = data.expires_in * 1000;
    expires_at = new Date(expires_at.getTime() + milliseconds);

    // * Update token
    let [_, errUpdatingRingoverTokens] = await Repository.update({
      tableName: DB_TABLES.RINGOVER_TOKENS,
      query: {
        ringover_token_id: ringoverToken.ringover_token_id,
      },
      updateObject: {
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        expires_at: expires_at,
      },
    });
    if (errUpdatingRingoverTokens)
      return serverErrorResponse(
        res,
        'An error occured, failed to verify access'
      );

    if (req.query.agent) {
      const user = ringoverToken.User;

      return successResponse(res, 'Successfully fetched access token', {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email: user.email,
        ringover_tokens: data,
        support_role: user.support_role,
      });
    }

    return successResponse(res, 'Successfully fetched access token.', data);
  } catch (err) {
    logger.error(`Error while authorizing with Ringover:`, err);

    // * Handle invalid token
    if (err?.response?.status === 401) {
      UserHelper.deleteUserSession(req.body.id_token);
      return unauthorizedResponse(res);
    }

    return serverErrorResponse(
      res,
      `Error while authorizing with Ringover: ${err.message}`
    );
  }
};

// * Sign out
const signOutFromRingover = async (req, res) => {
  try {
    const { access_token } = req.agent;
    UserHelper.deleteUserSession(access_token);
    return successResponse(res, 'Signed out from Ringover successfully.');
  } catch (err) {
    logger.error(`Error while signing out from Ringover: `, err);
    return serverErrorResponse(
      res,
      `Error while signing out from Ringover: ${err.message}`
    );
  }
};

const RingoverController = {
  redirectToRingover,
  authorizeRingover,
  getAccessToken,
  signOutFromRingover,
};

module.exports = RingoverController;
