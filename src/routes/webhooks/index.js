// Pacakages
const express = require('express');
const router = express();

// Routes
const cadenceRoutes = require('./cadence.routes');

router.use('/cadence', cadenceRoutes);

module.exports = router;
