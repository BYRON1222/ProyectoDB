const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAlerts,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  evaluateAlerts,
  resolveAlert,
  getAlertStats
} = require('../controllers/alertsController');

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Obtener todas las alertas registradas
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alertas con severidad y estado
 */
router.get('/', auth, getAlerts);

/**
 * @swagger
 * /api/alerts/stats:
 *   get:
 *     summary: Estadísticas de alertas (open, resolved, por severidad)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteo de alertas por estado y severidad
 */
router.get('/stats', auth, getAlertStats);

/**
 * @swagger
 * /api/alerts/rules:
 *   get:
 *     summary: Obtener reglas de alerta configuradas
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reglas activas e inactivas
 */
router.get('/rules', auth, getAlertRules);

/**
 * @swagger
 * /api/alerts/rules:
 *   post:
 *     summary: Crear nueva regla de alerta sin redeploy
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: CPU Alta
 *               metrica:
 *                 type: string
 *                 example: cpu
 *               operador:
 *                 type: string
 *                 example: ">"
 *               umbral:
 *                 type: number
 *                 example: 85
 *               severidad:
 *                 type: string
 *                 enum: [WARNING, CRITICAL, INFO]
 *                 example: WARNING
 *               accion:
 *                 type: string
 *                 enum: [EMAIL, DASHBOARD, BOTH]
 *                 example: EMAIL
 *     responses:
 *       201:
 *         description: Regla creada exitosamente
 */
router.post('/rules', auth, createAlertRule);

/**
 * @swagger
 * /api/alerts/rules/{id}:
 *   patch:
 *     summary: Actualizar regla de alerta existente
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activa:
 *                 type: boolean
 *                 example: false
 *               umbral:
 *                 type: number
 *                 example: 90
 *     responses:
 *       200:
 *         description: Regla actualizada exitosamente
 */
router.patch('/rules/:id', auth, updateAlertRule);

/**
 * @swagger
 * /api/alerts/evaluate:
 *   post:
 *     summary: Evaluar todas las reglas de alerta manualmente
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alertas generadas según métricas actuales
 */
router.post('/evaluate', auth, evaluateAlerts);

/**
 * @swagger
 * /api/alerts/{id}/resolve:
 *   patch:
 *     summary: Resolver una alerta abierta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alerta marcada como resuelta
 *       404:
 *         description: Alerta no encontrada
 */
router.patch('/:id/resolve', auth, resolveAlert);

module.exports = router;