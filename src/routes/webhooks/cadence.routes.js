// Middlewares
const {
  auth,
} = require('../../../../cadence-support-brain/src/middlewares/auth.middlewares');
const {
  devAuth,
} = require('../../../../cadence-support-brain/src/middlewares/dev.middlewares');

// Controllers
const CadenceController = require('../../controllers/webhooks/cadence.controllers');

// Packages
const express = require('express');
const router = express.Router();

// Person routes
router.post('/createActivity', devAuth, CadenceController.createCompany);

module.exports = router;
