// Package imports
const express = require('express');
const router = express();

// Middlwares
const {
  auth,
} = require('../../../../cadence-support-brain/src/middlewares/auth.middlewares');

// Route imports
const authRoutes = require('./auth/authentication.routes');
const ringoverRoutes = require('./auth/ringover.routes');

// Routes
router.use('/auth', authRoutes);
router.use('/ringover', ringoverRoutes);

module.exports = router;
