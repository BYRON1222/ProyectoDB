const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getTransactions,
  getConcurrencyStats,
  simulateConcurrency,
  resolveDeadlocks
} = require('../controllers/concurrencyController');

/**
 * @swagger
 * /api/concurrency:
 *   get:
 *     summary: Obtener registro de transacciones concurrentes
 *     tags: [Concurrency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de transacciones con lock_type y wait_time
 */
router.get('/', auth, getTransactions);

/**
 * @swagger
 * /api/concurrency/stats:
 *   get:
 *     summary: Estadísticas de concurrencia (deadlocks, timeouts, etc.)
 *     tags: [Concurrency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteo por tipo de lock y tiempos promedio
 */
router.get('/stats', auth, getConcurrencyStats);

/**
 * @swagger
 * /api/concurrency/simulate:
 *   post:
 *     summary: Simular 100 usuarios concurrentes con operaciones mixtas
 *     tags: [Concurrency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Simulación completada con detección de deadlocks
 */
router.post('/simulate', auth, simulateConcurrency);

/**
 * @swagger
 * /api/concurrency/resolve-deadlocks:
 *   patch:
 *     summary: Resolver deadlocks detectados automáticamente
 *     tags: [Concurrency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deadlocks resueltos exitosamente
 */
router.patch('/resolve-deadlocks', auth, resolveDeadlocks);

module.exports = router;