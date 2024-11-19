// Packages
const express = require('express');
const router = express.Router();

// Controllers
const companiesRoutes = require('../company/companies');
const teamsRoutes = require('../company/teams');
const integrationRoutes = require('./integrations');
const cadenceRoutes = require('../company/cadences');
const enrichmentsRoutes = require('../company/enrichments');
const licenseRoutes = require('../company/license');

router.use('/', companiesRoutes);
router.use('/teams', teamsRoutes);
router.use('/integration', integrationRoutes);
router.use('/cadences', cadenceRoutes);
router.use('/enrichments', enrichmentsRoutes);
router.use('/license', licenseRoutes);

module.exports = router;
