const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  getMetrics, 
  getMetricHistory, 
  getHealthSummary 
} = require('../controllers/metricsController');

router.get('/',           auth, getMetrics);
router.get('/summary',    auth, getHealthSummary);
router.get('/:id/history', auth, getMetricHistory);

module.exports = router;