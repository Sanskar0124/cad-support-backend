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
const profileControllers = require('../../../controllers/company/teams/profile.controllers');

// Routes
router.get(
  '/settings/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_OWN,
      RBAC_RESOURCES.USER
    ),
  ],
  profileControllers.fetchGeneralSettings
);

router.get(
  '/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_OWN,
      RBAC_RESOURCES.USER
    ),
  ],
  profileControllers.fetchProfile
);

module.exports = router;
