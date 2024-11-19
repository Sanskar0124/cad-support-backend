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
const cadenceController = require('../../../controllers/company/cadences/cadence.controller');

// Routes
router.get(
  '/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.CADENCE
    ),
  ],
  cadenceController.getAdminCadences
);

router.get(
  '/steps/:cadence_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.CADENCE
    ),
  ],
  cadenceController.getCadence
);

router.get(
  '/leads/:cadence_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.CADENCE
    ),
  ],
  cadenceController.getAllLeadsForCadence
);

router.get(
  '/statistics/:cadence_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.CADENCE
    ),
  ],
  cadenceController.getCadenceStatistics
);

router.get(
  '/stats/:node_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.CADENCE
    ),
  ],
  cadenceController.getNodeStats
);

module.exports = router;
