const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getBackups,
  runBackup,
  createSnapshot,
  simulateDisaster,
  getBackupStats
} = require('../controllers/backupController');

router.get('/',               auth, getBackups);
router.get('/stats',          auth, getBackupStats);
router.post('/run',           auth, runBackup);
router.post('/snapshot',      auth, createSnapshot);
router.post('/simulate-disaster', auth, simulateDisaster);

module.exports = router;