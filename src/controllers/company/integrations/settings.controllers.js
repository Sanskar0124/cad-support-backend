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
  SETTING_LEVELS,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// Repositories
const Repository = require('../../../../../cadence-support-brain/src/repository');

// Helpers and services
const SettingsHelpers = require('../../../../../cadence-support-brain/src/helper/settings');

const fetchCompanySettings = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required.');

    // Fetch all Settings
    const automatedSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.AUTOMATED_TASK_SETTINGS,
      query: { company_id: company_id },
      include: {
        [DB_TABLES.SUB_DEPARTMENT]: {
          attributes: ['name'],
        },
      },
    });

    const unsubscribeMailSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.UNSUBSCRIBE_MAIL_SETTINGS,
      query: { company_id: company_id },
      include: {
        [DB_TABLES.SUB_DEPARTMENT]: {
          attributes: ['name'],
        },
      },
    });

    const bouncedMailSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.BOUNCED_MAIL_SETTINGS,
      query: { company_id: company_id },
      include: {
        [DB_TABLES.SUB_DEPARTMENT]: {
          attributes: ['name'],
        },
      },
    });

    const taskSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.TASK_SETTINGS,
      query: { company_id: company_id },
      include: {
        [DB_TABLES.SUB_DEPARTMENT]: {
          attributes: ['name'],
        },
      },
    });

    const skipSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.SKIP_SETTINGS,
      query: { company_id },
    });

    const leadScoreSettingsPromise = Repository.fetchAll({
      tableName: DB_TABLES.LEAD_SCORE_SETTINGS,
      query: { company_id },
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
        `Error while fetching skip settings: ${errForSkipSettings}`
      );
    if (errForLeadScoreSettings)
      return serverErrorResponse(
        res,
        `Error while lead score settings: ${errForLeadScoreSettings}`
      );

    // automated task settings

    let automated_task_setting = null;
    let automatedTaskSettingExceptions = automatedTaskSettings?.filter(
      (setting) => {
        if (setting.priority === SETTING_LEVELS.ADMIN)
          automated_task_setting = setting;
        else return setting;
      }
    );

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

    //  unsubscribe mail settings

    let unsubscribe_mail_setting = [];
    const unsubscribe_mail_exceptions = unsubscribeMailSettings?.filter(
      (setting) => {
        if (setting.priority === SETTING_LEVELS.ADMIN)
          unsubscribe_mail_setting = setting;
        else return setting;
      }
    );

    // bounced mail settings

    // Fetch company domain
    let extrasForCompanySettings = {
      attributes: [
        'custom_domain',
        'unsubscribe_link_madatory_for_semi_automated_mails',
        'unsubscribe_link_madatory_for_automated_mails',
        'default_unsubscribe_link_text',
      ],
    };
    const [companyDomainSettings, errForCompanyDomainSettings] =
      await Repository.fetchOne({
        tableName: DB_TABLES.COMPANY_SETTINGS,
        query: { company_id },
        extras: extrasForCompanySettings,
      });

    let domain, errForDomain;
    const extrasForCd = {
      attributes: ['cd_id', 'domain_name', 'domain_status'],
    };
    if (companyDomainSettings && !errForCompanyDomainSettings) {
      [domain, errForDomain] = await Repository.fetchOne({
        tableName: DB_TABLES.CUSTOM_DOMAIN,
        query: { company_id },
        extras: extrasForCd,
      });
    }
    if (errForDomain)
      return serverErrorResponse(
        res,
        `Error while fetching custom domain: ${errForDomain}`
      );
    let bounced_mail_setting = [];
    const bounced_mail_exceptions = bouncedMailSettings?.filter((setting) => {
      if (setting.priority === SETTING_LEVELS.ADMIN)
        bounced_mail_setting = setting;
      else return setting;
    });

    // Task Settings
    let task_settings;
    const task_settings_exceptions = taskSettings?.filter((setting) => {
      if (setting.priority === SETTING_LEVELS.ADMIN) task_settings = setting;
      else return setting;
    });

    // Skip Settings
    let skip_setting;
    const skip_exceptions = skipSettings?.filter((setting) => {
      if (setting.priority === SETTING_LEVELS.ADMIN) skip_setting = setting;
      else return setting;
    });

    // Skip Settings

    let lead_score_setting;
    const lead_score_exceptions = leadScoreSettings?.filter((setting) => {
      if (setting.priority === SETTING_LEVELS.ADMIN)
        lead_score_setting = setting;
      else return setting;
    });

    const data = {
      Automated_Task_Settings: {
        ...automated_task_setting,
        exceptions: automatedTaskSettingExceptions,
      },
      Unsubscribe_Mail_Settings: {
        ...unsubscribe_mail_setting,
        exceptions: unsubscribe_mail_exceptions,
        ...companyDomainSettings,
      },
      Bounced_Mail_Settings: {
        ...bounced_mail_setting,
        exceptions: bounced_mail_exceptions,
      },
      Task_Settings: {
        ...task_settings,
        exceptions: task_settings_exceptions,
      },
      Custom_Domain_Settings: {
        ...domain,
      },
      Skip_Settings: {
        ...skip_setting,
        exceptions: skip_exceptions,
      },
      Lead_Score_Settings: {
        ...lead_score_setting,
        exceptions: lead_score_exceptions,
      },
    };

    return successResponse(
      res,
      'Successfully fetched company settings for admin.',
      data
    );
  } catch (err) {
    logger.error('Error while fetching company settings. ', err);
    return serverErrorResponse(
      res,
      `Error while fetching company settings. ${err.message}`
    );
  }
};

const fetchWorkflow = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required.');

    const [workflow, errForWorkflow] = await Repository.fetchAll({
      tableName: DB_TABLES.WORKFLOW,
      query: { company_id, cadence_id: null },
    });
    if (errForWorkflow)
      return serverErrorResponse(res, `Error while fetching workflow: `, err);
    if (!workflow) res, `No workflow found.`, [];

    return successResponse(res, `Fetched workflow successfully.`, workflow);
  } catch (err) {
    logger.error(`Error while fetching workflow: `, err);
    return serverErrorResponse(
      res,
      `Error while fetching workflow: ${err.message}.`
    );
  }
};

const fetchAutomatedWorkflows = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required.');

    const [workflow, errForWorkflow] = await Repository.fetchAll({
      tableName: DB_TABLES.AUTOMATED_WORKFLOW,
      query: { company_id },
    });
    if (errForWorkflow)
      return serverErrorResponse(
        res,
        `Error while fetching automated workflows: `,
        errForWorkflow
      );

    // fetching cadence name
    let cadenceIds = workflow.map((data) => {
      let cadenceId = data?.actions[0]?.cadence_id;
      if (cadenceId) {
        return parseInt(cadenceId);
      }
    });

    if (cadenceIds?.length) {
      const [cadence, errForCadence] = await Repository.fetchAll({
        tableName: DB_TABLES.CADENCE,
        query: { cadence_id: cadenceIds },
        extras: {
          attributes: ['cadence_id', 'name'],
        },
      });
      if (errForCadence)
        return serverErrorResponse(
          res,
          `Error while fetching cadence: `,
          errForCadence
        );

      // adding cadence name in action

      workflow.forEach((data) => {
        let cadenceId = data?.actions[0]?.cadence_id;
        if (cadenceId) {
          let cadenceData = cadence?.find(
            (cadence) => cadence.cadence_id === parseInt(cadenceId)
          );
          data.actions[0].name = cadenceData?.name;
        }
      });
    }

    return successResponse(
      res,
      `Fetched automated workflows successfully.`,
      workflow
    );
  } catch (err) {
    logger.error(`Error while fetching automated workflows: `, err);
    return serverErrorResponse(
      res,
      `Error while fetching automated workflow: ${err.message}.`
    );
  }
};

const fetchCompanyWebhooks = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) return badRequestResponse(res, 'Company ID is required.');
    // * Fetch webhooks
    let [company, errFetchingWebhooks] = await Repository.fetchOne({
      tableName: DB_TABLES.COMPANY,
      query: {
        company_id: company_id,
      },
      include: {
        [DB_TABLES.COMPANY_SETTINGS]: {
          attributes: ['company_settings_id'],
          [DB_TABLES.WEBHOOK]: {
            required: false,
          },
        },
      },
      extras: {
        attributes: ['company_id', 'name'],
      },
    });
    if (errFetchingWebhooks)
      return serverErrorResponse(res, 'Unable to fetch webhooks');

    let webhooks = company.Company_Setting.Webhooks;

    return successResponse(res, 'Successfully fetched webhooks', webhooks);
  } catch (err) {
    logger.error(
      `An error occurred while trying to fetch webhooks for company: `,
      err
    );
    return serverErrorResponse(res, err.message);
  }
};

const settingControllers = {
  fetchCompanySettings,
  fetchWorkflow,
  fetchAutomatedWorkflows,
  fetchCompanyWebhooks,
};

module.exports = settingControllers;
