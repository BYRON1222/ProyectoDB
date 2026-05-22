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

/**
 * @swagger
 * /api/queries:
 *   post:
 *     summary: Registrar una query en el log
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               db_id:
 *                 type: integer
 *                 example: 1
 *               query_text:
 *                 type: string
 *                 example: SELECT * FROM users
 *               duration_ms:
 *                 type: integer
 *                 example: 1500
 *               rows_returned:
 *                 type: integer
 *                 example: 100
 *     responses:
 *       201:
 *         description: Query registrada exitosamente
 */
router.post('/', auth, logQuery);

/**
 * @swagger
 * /api/queries:
 *   get:
 *     summary: Obtener todas las queries registradas
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de queries clasificadas por categoría
 */
router.get('/', auth, getQueries);

/**
 * @swagger
 * /api/queries/top-slow:
 *   get:
 *     summary: Top 10 queries más lentas
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ranking de queries por duración descendente
 */
router.get('/top-slow', auth, getTopSlowQueries);

/**
 * @swagger
 * /api/queries/stats:
 *   get:
 *     summary: Estadísticas de queries por categoría
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteo de FAST, MEDIUM, SLOW, CRITICAL
 */
router.get('/stats', auth, getQueryStats);

/**
 * @swagger
 * /api/queries/simulate:
 *   post:
 *     summary: Simular queries de prueba para demostración
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queries simuladas insertadas correctamente
 */
router.post('/simulate', auth, simulateQueries);

module.exports = router;