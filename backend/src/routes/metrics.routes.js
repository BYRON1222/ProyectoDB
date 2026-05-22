const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  getMetrics, 
  getMetricHistory, 
  getHealthSummary 
} = require('../controllers/metricsController');

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Obtener métricas actuales de todas las BDs
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de métricas (CPU, RAM, conexiones, locks)
 */
router.get('/', auth, getMetrics);

/**
 * @swagger
 * /api/metrics/summary:
 *   get:
 *     summary: Resumen de salud de todas las BDs (Healthy/Warning/Critical)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen con conteo por estado
 */
router.get('/summary', auth, getHealthSummary);

/**
 * @swagger
 * /api/metrics/{id}/history:
 *   get:
 *     summary: Historial de métricas de una BD
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la conexión
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 60
 *         description: Número de registros a retornar
 *     responses:
 *       200:
 *         description: Historial de métricas ordenado por tiempo
 */
router.get('/:id/history', auth, getMetricHistory);

module.exports = router;