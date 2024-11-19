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
const companyControllers = require('../../controllers/dashboard/company.controllers');

// Routes

router.get(
  '/integrations',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companyControllers.fetchIntegrations
);

router.get('/add-ons', [
  auth,
  AccessControlMiddleware.checkAccess(
    RBAC_ACTIONS.READ_ANY,
    RBAC_RESOURCES.USER
  ),
  companyControllers.fetchAddOns,
]);

router.get('/health-check', [
  auth,
  AccessControlMiddleware.checkAccess(
    RBAC_ACTIONS.READ_ANY,
    RBAC_RESOURCES.USER
  ),
  companyControllers.checkServiceHealth,
]);

router.get('/status', [
  auth,
  AccessControlMiddleware.checkAccess(
    RBAC_ACTIONS.READ_ANY,
    RBAC_RESOURCES.USER
  ),
  companyControllers.getComapnyStatusCount,
]);

router.get(
  '/activity',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companyControllers.getActivity
);

router.post(
  '/create-company',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companyControllers.createCompany
);

router.post(
  '/update-integration',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companyControllers.updateIntegration
);

router.get(
  '/get-integration/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companyControllers.getIntegration
);

module.exports = router;
