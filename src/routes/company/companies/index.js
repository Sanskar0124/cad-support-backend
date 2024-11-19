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
const companiesController = require('../../../controllers/company/companies/companies.controllers');

// Routes
router.get(
  '/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companiesController.fetchCompany
);

router.post(
  '/',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companiesController.fetchCompanies
);

router.get(
  '/payment-data/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companiesController.getPaymentData
);

router.get(
  '/get-users/:company_id',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companiesController.getUsers
);

router.post(
  '/search',
  [
    auth,
    AccessControlMiddleware.checkAccess(
      RBAC_ACTIONS.READ_ANY,
      RBAC_RESOURCES.COMPANY
    ),
  ],
  companiesController.searchCompanyAndUser
);

module.exports = router;
