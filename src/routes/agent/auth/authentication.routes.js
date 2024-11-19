// Packages
const express = require('express');
const router = express();

// Controllers
const agentControllers = require('../../../controllers/agent/authentication/signin.controllers');

// Routes
router.post('/signup', agentControllers.registerAgent);
// router.post('/login', agentControllers.loginAgent);

module.exports = router;
