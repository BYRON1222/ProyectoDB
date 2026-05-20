const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAlerts,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  evaluateAlerts,
  resolveAlert,
  getAlertStats
} = require('../controllers/alertsController');

router.get('/',              auth, getAlerts);
router.get('/stats',         auth, getAlertStats);
router.get('/rules',         auth, getAlertRules);
router.post('/rules',        auth, createAlertRule);
router.patch('/rules/:id',   auth, updateAlertRule);
router.post('/evaluate',     auth, evaluateAlerts);
router.patch('/:id/resolve', auth, resolveAlert);

module.exports = router;