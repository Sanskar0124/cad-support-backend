// Utils
const {
  RBAC_ACTIONS,
  RBAC_RESOURCES,
} = require('../../../../cadence-support-brain/src/utils/enums');

// Packages
const express = require('express');
const router = express.Router();

// Middlewares
const {
  auth,
} = require('../../../../cadence-support-brain/src/middlewares/auth.middlewares');
const AccessControlMiddleware = require('../../../../cadence-support-brain/src/middlewares/accessControl.middlewares');

// Controllers
const userControllers = require('../../controllers/user/user.controllers');

// Routes

router.get(
  '/',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_OWN,
      RBAC_RESOURCES.USER
    ),
  ],
  userControllers.fetchUsers
);

router.get(
  '/ringover-users',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_OWN,
      RBAC_RESOURCES.USER
    ),
  ],
  userControllers.getUsersFromRingover
);

router.put(
  '/add',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.UPDATE_ANY,
      RBAC_RESOURCES.USER
    ),
  ],
  userControllers.addSupportAgent
);

router.put(
  '/remove/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.UPDATE_ANY,
      RBAC_RESOURCES.USER
    ),
  ],
  userControllers.removeUserFromSupport
);

router.patch(
  '/update/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.UPDATE_ANY,
      RBAC_RESOURCES.USER
    ),
  ],
  userControllers.updateSupportRole
);

router.put(
  '/complete-product-tour/:user_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  userControllers.markProductTourAsComplete
);

module.exports = router;
