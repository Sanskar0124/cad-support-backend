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
const activityControllers = require('../../../controllers/company/teams/activity.controllers');

// Routes

router.get(
  '/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.ACTIVITY
    ),
  ],
  activityControllers.fetchActivity
);

module.exports = router;
