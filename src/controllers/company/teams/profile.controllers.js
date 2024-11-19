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

// Package
const { Op } = require('sequelize');
const { sequelize } = require('../../../../../Cadence-Brain/src/db/models');

const {
  SETTING_LEVELS,
  TRACKING_ACTIVITIES,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');
// Helpers
const SettingsHelpers = require('../../../../../Cadence-Brain/src/helper/settings');
const TokenHelper = require('../../../../../cadence-support-brain/src/helper/token');

const fetchProfile = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'User id is required');

    const { integration_type } = req.query;
    if (!integration_type)
      return badRequestResponse(res, 'Integration type is required');

    const [tokensToFetch, errForTokensToFetch] =
      TokenHelper.tokenTable(integration_type);
    if (errForTokensToFetch)
      return serverErrorResponse(res, errForTokensToFetch);

    const userPromise = Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { user_id },
      include: {
        [DB_TABLES.USER_TOKEN]: {},
        [tokensToFetch]: {
          attributes: ['is_logged_out'],
        },
        [DB_TABLES.COMPANY]: {
          attributes: ['company_id'],
          [DB_TABLES.ENRICHMENTS]: {
            attributes: [
              'is_linkedin_activated',
              'is_lusha_activated',
              'lusha_api_calls',
              'is_kaspr_activated',
              'kaspr_api_calls',
              'is_hunter_activated',
              'hunter_api_calls',
              'is_dropcontact_activated',
              'dropcontact_api_calls',
              'is_snov_activated',
              'snov_api_calls',
            ],
          },
          [DB_TABLES.COMPANY_SETTINGS]: {
            attributes: [
              'mail_integration_type',
              'phone_system',
              'email_scope_level',
            ],
          },
        },
        [DB_TABLES.SIGNATURE]: {
          attributes: ['signature_id', 'signature', 'name', 'is_primary'],
        },
        [DB_TABLES.USER_TASK]: {
          attributes: [
            'lusha_calls_per_month',
            'kaspr_calls_per_month',
            'hunter_calls_per_month',
            'dropcontact_calls_per_month',
            'snov_calls_per_month',
          ],
        },
      },
    });

    const trackingPromise = Repository.fetchAll({
      tableName: DB_TABLES.TRACKING,
      query: {
        user_id,
        activity: {
          [Op.in]: [
            TRACKING_ACTIVITIES.GOOGLE_SIGN_IN,
            TRACKING_ACTIVITIES.OUTLOOK_SIGN_IN,
            TRACKING_ACTIVITIES.EXTENSION_SIGN_IN,
          ],
        },
      },
      extras: {
        attributes: [
          'activity',
          [sequelize.fn('MAX', sequelize.col('created_at')), 'created_at'],
        ],
        order: [['created_at', 'DESC']],
        group: ['Tracking.activity'],
      },
    });

    const [[user, errForUser], [tracking, errForTracking]] = await Promise.all([
      userPromise,
      trackingPromise,
    ]);
    if (user === null) return badRequestResponse(res, 'User does not exist');
    if (errForUser)
      return badRequestResponse(
        res,
        `Error while fetching user: ${errForUser}`
      );
    if (errForTracking)
      return serverErrorResponse(
        res,
        `Error while fetching tracking: ${errForTracking}`
      );
    const { User_Token: userToken } = user;
    if (!userToken)
      return serverErrorResponse(res, `Error while fetching user tokens.`);

    user.mail_integration_type =
      user?.Company?.Company_Setting?.mail_integration_type;
    user.phone_system = user?.Company?.Company_Setting?.phone_system;
    user.email_scope_level = user?.Company?.Company_Setting?.email_scope_level;
    user.is_salesforce_logged_out = userToken?.is_salesforce_logged_out;
    user.is_outlook_token_expired = userToken?.is_outlook_token_expired;
    user.is_google_token_expired = userToken?.is_google_token_expired;
    user.is_linkedin_activated =
      user?.Company?.Enrichment?.is_linkedin_activated;
    user.Enrichment = {};
    if (user?.Company?.Enrichment?.is_lusha_activated) {
      user.Enrichment.lusha_service_enabled = userToken?.lusha_service_enabled;
      user.Enrichment.lusha_api_calls = user?.User_Task?.lusha_calls_per_month;
    }
    if (user?.Company?.Enrichment?.is_kaspr_activated) {
      user.Enrichment.kaspr_service_enabled = userToken?.kaspr_service_enabled;
      user.Enrichment.kaspr_api_calls = user?.User_Task?.kaspr_calls_per_month;
    }
    if (user?.Company?.Enrichment?.is_hunter_activated) {
      user.Enrichment.hunter_service_enabled =
        userToken?.hunter_service_enabled;
      user.Enrichment.hunter_api_calls =
        user?.User_Task?.hunter_calls_per_month;
    }
    if (user?.Company?.Enrichment?.is_dropcontact_activated) {
      user.Enrichment.dropcontact_service_enabled =
        userToken?.dropcontact_service_enabled;
      user.Enrichment.dropcontact_api_calls =
        user?.User_Task?.dropcontact_calls_per_month;
    }
    if (user?.Company?.Enrichment?.is_snov_activated) {
      user.Enrichment.snov_service_enabled = userToken?.snov_service_enabled;
      user.Enrichment.snov_api_calls = user?.User_Task?.snov_calls_per_month;
    }
    user.tracking = tracking || null;
    user.extension_version = userToken?.extension_version;

    delete user?.password;
    delete user?.Company;
    delete user.User_Token;
    delete user?.created_at;
    delete user?.updated_at;
    delete user?.department_id;
    delete user?.last_login_at;

    return successResponse(res, 'User fetched successfully', user);
  } catch (err) {
    logger.error(`Error while fetching user profile: `, err);
    return serverErrorResponse(res, err.message);
  }
};

const fetchGeneralSettings = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return badRequestResponse(res, 'User Id is required');

    const [user, errForUser] = await Repository.fetchOne({
      tableName: DB_TABLES.USER,
      query: { user_id },
      extras: {
        attributes: ['company_id', 'sd_id'],
      },
    });
    if (errForUser)
      return serverErrorResponse(
        res,
        `Error while fetching user by query: ${errForUser}`
      );
    if (!user) return notFoundResponse(res, 'User not found.');

    const automatedSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.AUTOMATED_TASK_SETTINGS,
      query: {
        company_id: user.company_id,
        [Op.or]: {
          priority: SETTING_LEVELS.ADMIN,
          sd_id: user.sd_id,
        },
      },
    });

    const unsubscribeMailSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.UNSUBSCRIBE_MAIL_SETTINGS,
      query: {
        company_id: user.company_id,
        [Op.or]: {
          priority: SETTING_LEVELS.ADMIN,
          sd_id: user.sd_id,
        },
      },
    });

    const bouncedMailSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.BOUNCED_MAIL_SETTINGS,
      query: {
        company_id: user.company_id,
        [Op.or]: {
          priority: SETTING_LEVELS.ADMIN,
          sd_id: user.sd_id,
        },
      },
    });
    const taskSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.TASK_SETTINGS,
      query: {
        company_id: user.company_id,
        [Op.or]: {
          priority: SETTING_LEVELS.ADMIN,
          sd_id: user.sd_id,
        },
      },
    });

    const skipSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.SKIP_SETTINGS,
      query: {
        company_id: user.company_id,
        [Op.or]: {
          priority: SETTING_LEVELS.ADMIN,
          sd_id: user.sd_id,
        },
      },
    });

    const leadScoreSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.LEAD_SCORE_SETTINGS,
      query: {
        company_id: user.company_id,
        [Op.or]: {
          priority: SETTING_LEVELS.ADMIN,
          sd_id: user.sd_id,
        },
      },
    });

    const [
      [automatedTaskSettings, errForAtSettings],
      [unsubscribeMailSettings, errForUnsubscribeMailSettings],
      [bouncedMailSettings, errForBouncedMailSettings],
      [taskSettings, errForTaskSettings],
      [skipSettings, errForSkipSettings],
      [leadScoreSettings, errForLeadScoreSettings],
    ] = await Promise.all([
      automatedSettingsPromise,
      unsubscribeMailSettingsPromise,
      bouncedMailSettingsPromise,
      taskSettingsPromise,
      skipSettingsPromise,
      leadScoreSettingsPromise,
    ]);

    if (errForAtSettings)
      return serverErrorResponse(
        res,
        `Error while fetching automated task settings: ${errForAtSettings}`
      );
    if (errForUnsubscribeMailSettings)
      return serverErrorResponse(
        res,
        `Error while fetching unsubscribe mail settings: ${errForUnsubscribeMailSettings}`
      );
    if (errForBouncedMailSettings)
      return serverErrorResponse(
        res,
        `Error while fetching bounced mail settings: ${errForBouncedMailSettings}`
      );
    if (errForTaskSettings)
      return serverErrorResponse(
        res,
        `Error while fetching task settings: ${errForTaskSettings}`
      );
    if (errForSkipSettings)
      return serverErrorResponse(
        res,
        `Error while fetching skip task settings: ${errForSkipSettings}`
      );

    // Fetch automated task settings

    let admin_automated_task_setting = null,
      sd_automated_task_setting = null,
      automated_task_setting = null;
    let automatedTaskSettingExceptions = automatedTaskSettings?.filter(
      (setting) => {
        if (
          !automated_task_setting &&
          setting.priority === SETTING_LEVELS.ADMIN
        ) {
          admin_automated_task_setting = setting;

          // Send setting as subdepartment setting when fetched for subdepartment so that it can be used to update

          // automated_task_setting.priority = SETTING_LEVELS.SUB_DEPARTMENT;
        } else if (
          setting.sd_id === user.sd_id &&
          setting.priority === SETTING_LEVELS.SUB_DEPARTMENT
        )
          sd_automated_task_setting = setting;
        else return setting;
      }
    );
    if (sd_automated_task_setting)
      automated_task_setting = sd_automated_task_setting;
    else automated_task_setting = admin_automated_task_setting;

    // convert workind_days from numbers array to enums array
    const [workingDays, errForWorkingDays] =
      SettingsHelpers.convertWorkingDaysNumbersToEnumsArray(
        automated_task_setting.working_days
      );
    automated_task_setting.working_days = workingDays;
    automatedTaskSettingExceptions = automatedTaskSettingExceptions.map(
      (exception) => ({
        ...exception,
        working_days: SettingsHelpers.convertWorkingDaysNumbersToEnumsArray(
          exception.working_days
        )[0],
      })
    );

    // Fetch bounced mail settings

    let bounced_mail_setting = null,
      admin_bounced_mail_setting = null,
      sd_bounced_mail_setting = null;
    const bouncedMailSettingExceptions = bouncedMailSettings?.filter(
      (setting) => {
        if (
          !bounced_mail_setting &&
          setting.priority === SETTING_LEVELS.ADMIN
        ) {
          admin_bounced_mail_setting = setting;
          // bounced_mail_setting.priority = SETTING_LEVELS.SUB_DEPARTMENT;
        } else if (
          setting.sd_id === user.sd_id &&
          setting.priority === SETTING_LEVELS.SUB_DEPARTMENT
        )
          sd_bounced_mail_setting = setting;
        else return setting;
      }
    );

    if (sd_bounced_mail_setting) bounced_mail_setting = sd_bounced_mail_setting;
    else bounced_mail_setting = admin_bounced_mail_setting;

    // Fetch unsubscribe mail settings

    let unsubscribe_mail_setting = null,
      admin_unsubscribe_mail_setting = null,
      sd_unsubscribe_mail_setting = null;
    const unsubscribeMailSettingExceptions = unsubscribeMailSettings?.filter(
      (setting) => {
        if (
          !unsubscribe_mail_setting &&
          setting.priority === SETTING_LEVELS.ADMIN
        ) {
          admin_unsubscribe_mail_setting = setting;
          // unsubscribe_mail_setting.priority = SETTING_LEVELS.SUB_DEPARTMENT;
        } else if (
          setting.sd_id === user.sd_id &&
          setting.priority === SETTING_LEVELS.SUB_DEPARTMENT
        )
          sd_unsubscribe_mail_setting = setting;
        else return setting;
      }
    );

    if (sd_unsubscribe_mail_setting)
      unsubscribe_mail_setting = sd_unsubscribe_mail_setting;
    else unsubscribe_mail_setting = admin_unsubscribe_mail_setting;

    // Fetch task settings

    let task_setting = null,
      admin_task_setting = null,
      sd_task_setting = null;

    const taskSettingsExceptions = taskSettings?.filter((setting) => {
      if (!task_setting && setting.priority === SETTING_LEVELS.ADMIN) {
        admin_task_setting = setting;
        // task_setting.priority = SETTING_LEVELS.SUB_DEPARTMENT;
      } else if (
        setting.sd_id === user.sd_id &&
        setting.priority === SETTING_LEVELS.SUB_DEPARTMENT
      )
        sd_task_setting = setting;
      else return setting;
    });

    if (sd_task_setting) task_setting = sd_task_setting;
    else task_setting = admin_task_setting;

    // Fetch Skip Setting

    let skip_setting = null,
      admin_skip_setting = null,
      sd_skip_setting = null;
    const skipSettingExceptions = skipSettings?.filter((setting) => {
      if (!skip_setting && setting.priority === SETTING_LEVELS.ADMIN) {
        admin_skip_setting = setting;
        // skip_setting.priority = SETTING_LEVELS.SUB_DEPARTMENT;
      } else if (
        setting.sd_id === user.sd_id &&
        setting.priority === SETTING_LEVELS.SUB_DEPARTMENT
      )
        sd_skip_setting = setting;
      else return setting;
    });

    if (sd_skip_setting) skip_setting = sd_skip_setting;
    else skip_setting = admin_skip_setting;

    // Fetch Lead Score Settings

    let lead_score_setting = null,
      admin_lead_score_setting = null,
      sd_lead_score_setting = null;
    const leadScoreSettingExceptions = leadScoreSettings?.filter((setting) => {
      if (!lead_score_setting && setting.priority === SETTING_LEVELS.ADMIN) {
        admin_lead_score_setting = setting;
        // skip_setting.priority = SETTING_LEVELS.SUB_DEPARTMENT;
      } else if (
        setting.sd_id === user.sd_id &&
        setting.priority === SETTING_LEVELS.SUB_DEPARTMENT
      )
        sd_lead_score_setting = setting;
      else return setting;
    });

    if (sd_lead_score_setting) lead_score_setting = sd_lead_score_setting;
    else lead_score_setting = admin_lead_score_setting;

    const data = {
      Automated_Task_Settings: {
        ...automated_task_setting,
        exceptions: automatedTaskSettingExceptions,
      },
      Bounced_Mail_Settings: {
        ...bounced_mail_setting,
        exceptions: bouncedMailSettingExceptions,
      },
      Unsubscribe_Mail_Settings: {
        ...unsubscribe_mail_setting,
        exceptions: unsubscribeMailSettingExceptions,
      },
      Task_Settings: {
        ...task_setting,
        exceptions: taskSettingsExceptions,
      },
      Skip_Settings: {
        ...skip_setting,
        exceptions: skipSettingExceptions,
      },
      Lead_Score_Settings: {
        ...lead_score_setting,
        exceptions: leadScoreSettingExceptions,
      },
    };

    return successResponse(
      res,
      'Successfully fetched sub-department settings.',
      data
    );
  } catch (err) {
    logger.error('Error while fetching sub-department settings: ', err);
    return serverErrorResponse(
      res,
      `Error while fetching sub-department settings: ${err.message}`
    );
  }
};

const profileControllers = {
  fetchProfile,
  fetchGeneralSettings,
};

module.exports = profileControllers;
