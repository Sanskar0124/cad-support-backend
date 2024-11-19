// Packages
const express = require('express');
const router = express();

// Middlewares
const {
  auth,
} = require('../../../../../cadence-support-brain/src/middlewares/auth.middlewares');

// Controllers
const ringoverController = require('../../../controllers/agent/authentication/ringover.controller');

// Routes
router.get('/redirect', ringoverController.redirectToRingover);
router.get('/authorize', ringoverController.authorizeRingover);
router.post('/access-token', ringoverController.getAccessToken);
router.get('/signout', auth, ringoverController.signOutFromRingover);

module.exports = router;
