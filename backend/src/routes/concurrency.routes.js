const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getTransactions,
  getConcurrencyStats,
  simulateConcurrency,
  resolveDeadlocks
} = require('../controllers/concurrencyController');

router.get('/',           auth, getTransactions);
router.get('/stats',      auth, getConcurrencyStats);
router.post('/simulate',  auth, simulateConcurrency);
router.patch('/resolve-deadlocks', auth, resolveDeadlocks);

module.exports = router;