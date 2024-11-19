// Packages
const express = require('express');
const router = express.Router();

// Controllers
const teamsRoutes = require('./teams.routes');
const userRoutes = require('./user.routes');
const activityRoutes = require('./activity.routes');
const taskRoutes = require('./task.routes');
const cadenceRoutes = require('./cadence.routes');
const leadRoutes = require('./lead.routes');
const profileRoutes = require('./profile.routes');

router.use('/team', teamsRoutes);
router.use('/user', userRoutes);
router.use('/activity', activityRoutes);
router.use('/task', taskRoutes);
router.use('/cadence', cadenceRoutes);
router.use('/lead', leadRoutes);
router.use('/profile', profileRoutes);

module.exports = router;
