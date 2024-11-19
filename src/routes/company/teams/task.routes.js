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
const taskControllers = require('../../../controllers/company/teams/task.controllers');

// Routes
router.post(
  '/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.TASK
    ),
  ],
  taskControllers.fetchTask
);

router.get(
  '/count/summary/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.TASK
    ),
  ],
  taskControllers.getCountSummaryForTasksView
);

router.get(
  '/node-stats/:node_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.TASK
    ),
  ],
  taskControllers.getNodeStats
);

router.get(
  '/get-cadences/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.TASK
    ),
  ],
  taskControllers.getCadencesForTaskFilter
);

module.exports = router;
