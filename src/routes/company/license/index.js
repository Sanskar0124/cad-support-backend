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
const LicenseController = require('../../../controllers/company/license/license.controllers');

// Routes
router.get(
  '/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY_SETTINGS
    ),
  ],
  LicenseController.fetchCompanyLicense
);

router.put(
  '/',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY_SETTINGS
    ),
  ],
  LicenseController.updateCompanyLicense
);

module.exports = router;
