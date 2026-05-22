const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getReplicationStatus,
  getCurrentLag,
  simulateReplication,
  getReplicationStats
} = require('../controllers/replicationController');

/**
 * @swagger
 * /api/replication:
 *   get:
 *     summary: Obtener historial de estados de replicación
 *     tags: [Replication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de registros de replicación con lag y estado
 */
router.get('/', auth, getReplicationStatus);

/**
 * @swagger
 * /api/replication/current:
 *   get:
 *     summary: Obtener lag de replicación actual en tiempo real
 *     tags: [Replication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lag actual en segundos y estado (ACCEPTABLE/WARNING/CRITICAL)
 */
router.get('/current', auth, getCurrentLag);

/**
 * @swagger
 * /api/replication/stats:
 *   get:
 *     summary: Estadísticas de replicación y análisis CAP
 *     tags: [Replication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Promedio de lag por escenario y análisis del Teorema CAP
 */
router.get('/stats', auth, getReplicationStats);

/**
 * @swagger
 * /api/replication/simulate:
 *   post:
 *     summary: Simular escenarios de replicación (carga normal, media, alta)
 *     tags: [Replication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               escenario:
 *                 type: string
 *                 enum: [normal, media, alta]
 *                 example: normal
 *     responses:
 *       200:
 *         description: Simulación completada con lag medido (2s/5s/20s)
 */
router.post('/simulate', auth, simulateReplication);

module.exports = router;