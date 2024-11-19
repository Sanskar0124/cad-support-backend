// Utils
const {
  RBAC_ACTIONS,
  RBAC_RESOURCES,
} = require('../../../../../cadence-support-brain/src/utils/enums');

// Packages
const express = require('express');
const router = express.Router();

// Middlewares
const {
  auth,
} = require('../../../../../cadence-support-brain/src/middlewares/auth.middlewares');
const AccessControlMiddleware = require('../../../../../cadence-support-brain/src/middlewares/accessControl.middlewares');

// Controllers
const settingController = require('../../../controllers/company/integrations/settings.controllers');

// Routes
router.get(
  '/company-settings/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY_SETTINGS
    ),
  ],
  settingController.fetchCompanySettings
);

router.get(
  '/workflow/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY_WORKFLOW
    ),
  ],
  settingController.fetchWorkflow
);

router.get(
  '/automated-workflow/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY_WORKFLOW
    ),
  ],
  settingController.fetchAutomatedWorkflows
);

router.get(
  '/webhook/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY_WORKFLOW
    ),
  ],
  settingController.fetchCompanyWebhooks
);

module.exports = router;
