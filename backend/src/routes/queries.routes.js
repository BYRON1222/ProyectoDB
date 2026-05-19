const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  logQuery,
  getQueries,
  getTopSlowQueries,
  getQueryStats,
  simulateQueries
} = require('../controllers/queryController');

router.post('/',          auth, logQuery);
router.get('/',           auth, getQueries);
router.get('/top-slow',   auth, getTopSlowQueries);
router.get('/stats',      auth, getQueryStats);
router.post('/simulate',  auth, simulateQueries);

module.exports = router;
