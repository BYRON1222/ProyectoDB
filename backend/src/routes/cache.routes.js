const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getCachedQuery,
  comparePerformance,
  getCacheStats,
  invalidateCache
} = require('../controllers/cacheController');

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Estadísticas de caché Redis (hit ratio, tiempos de respuesta)
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hit ratio, total hits, total misses y tiempos promedio
 */
router.get('/stats', auth, getCacheStats);

/**
 * @swagger
 * /api/cache/query/{key}:
 *   get:
 *     summary: Obtener resultado cacheado por clave
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Clave del cache en Redis
 *     responses:
 *       200:
 *         description: Resultado obtenido (cache hit o miss)
 *       404:
 *         description: Clave no encontrada en caché
 */
router.get('/query/:key', auth, getCachedQuery);

/**
 * @swagger
 * /api/cache/compare:
 *   post:
 *     summary: Comparar rendimiento con y sin caché
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 example: top_queries
 *     responses:
 *       200:
 *         description: Comparativa de tiempos sin caché (~400ms) vs con caché (~40ms)
 */
router.post('/compare', auth, comparePerformance);

/**
 * @swagger
 * /api/cache/invalidate:
 *   post:
 *     summary: Invalidar caché manualmente por clave o patrón
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 example: top_queries
 *     responses:
 *       200:
 *         description: Caché invalidado exitosamente
 */
router.post('/invalidate', auth, invalidateCache);

module.exports = router;