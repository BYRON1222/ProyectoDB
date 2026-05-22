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

/**
 * @swagger
 * /api/backups:
 *   get:
 *     summary: Obtener historial de backups
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de backups con estado y SLA
 */
router.get('/', auth, getBackups);

/**
 * @swagger
 * /api/backups/stats:
 *   get:
 *     summary: Estadísticas de backups (RPO, RTO, cumplimiento SLA)
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas de cumplimiento de SLA
 */
router.get('/stats', auth, getBackupStats);

/**
 * @swagger
 * /api/backups/run:
 *   post:
 *     summary: Ejecutar un backup (FULL, DIFF o INC)
 *     tags: [Backups]
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
 *               tipo:
 *                 type: string
 *                 enum: [FULL, DIFF, INC]
 *                 example: FULL
 *     responses:
 *       200:
 *         description: Backup ejecutado exitosamente
 */
router.post('/run', auth, runBackup);

/**
 * @swagger
 * /api/backups/snapshot:
 *   post:
 *     summary: Crear snapshot del entorno (PRE_DEPLOY, PRE_TEST, PRE_IMPORT)
 *     tags: [Backups]
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
 *               nombre:
 *                 type: string
 *                 enum: [PRE_DEPLOY, PRE_TEST, PRE_IMPORT]
 *                 example: PRE_DEPLOY
 *     responses:
 *       200:
 *         description: Snapshot creado exitosamente
 */
router.post('/snapshot', auth, createSnapshot);

/**
 * @swagger
 * /api/backups/simulate-disaster:
 *   post:
 *     summary: Simular desastre (DROP TABLE) y restaurar desde snapshot
 *     tags: [Backups]
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
 *     responses:
 *       200:
 *         description: Desastre simulado y restauración completada con RPO y RTO
 */
router.post('/simulate-disaster', auth, simulateDisaster);

module.exports = router;