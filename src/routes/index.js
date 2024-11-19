// Package imports
const express = require('express');
const app = express();

// Route imports
const agentRoutes = require('./agent');
const companyRoutes = require('./company');
const dashboardRoutes = require('./dashboard');
const webhooksRoutes = require('./webhooks');
const userRoutes = require('./user');

// Routes
app.use('/agent', agentRoutes);
app.use('/company', companyRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/webhook', webhooksRoutes);
app.use('/user', userRoutes);

module.exports = app;
