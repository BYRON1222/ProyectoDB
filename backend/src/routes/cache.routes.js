const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getCachedQuery,
  comparePerformance,
  getCacheStats,
  invalidateCache
} = require('../controllers/cacheController');

router.get('/stats',         auth, getCacheStats);
router.get('/query/:key',    auth, getCachedQuery);
router.post('/compare',      auth, comparePerformance);
router.post('/invalidate',   auth, invalidateCache);

module.exports = router;