const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getReplicationStatus,
  getCurrentLag,
  simulateReplication,
  getReplicationStats
} = require('../controllers/replicationController');

router.get('/',          auth, getReplicationStatus);
router.get('/current',   auth, getCurrentLag);
router.get('/stats',     auth, getReplicationStats);
router.post('/simulate', auth, simulateReplication);

module.exports = router;