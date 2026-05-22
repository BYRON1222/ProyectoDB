const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getConnections,
  getConnectionById,
  createConnection,
  updateConnectionStatus,
  deleteConnection
} = require('../controllers/connectionsController');

/**
 * @swagger
 * /api/connections:
 *   get:
 *     summary: Obtener todas las conexiones registradas
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de conexiones
 */
router.get('/', auth, getConnections);

/**
 * @swagger
 * /api/connections/{id}:
 *   get:
 *     summary: Obtener una conexión por ID
 *     tags: [Connections]
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
 *         description: Datos de la conexión
 *       404:
 *         description: Conexión no encontrada
 */
router.get('/:id', auth, getConnectionById);

/**
 * @swagger
 * /api/connections:
 *   post:
 *     summary: Registrar nueva conexión de base de datos
 *     tags: [Connections]
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
 *                 example: PostgreSQL Principal
 *               motor:
 *                 type: string
 *                 example: PostgreSQL
 *               host:
 *                 type: string
 *                 example: localhost
 *               port:
 *                 type: integer
 *                 example: 5432
 *               database_name:
 *                 type: string
 *                 example: dataops_db
 *               user_name:
 *                 type: string
 *                 example: dataops
 *               password:
 *                 type: string
 *                 example: dataops123
 *     responses:
 *       201:
 *         description: Conexión creada exitosamente
 */
router.post('/', auth, createConnection);

/**
 * @swagger
 * /api/connections/{id}/status:
 *   patch:
 *     summary: Actualizar estado de una conexión
 *     tags: [Connections]
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
 *               status:
 *                 type: string
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch('/:id/status', auth, updateConnectionStatus);

/**
 * @swagger
 * /api/connections/{id}:
 *   delete:
 *     summary: Eliminar una conexión
 *     tags: [Connections]
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
 *         description: Conexión eliminada
 *       404:
 *         description: Conexión no encontrada
 */
router.delete('/:id', auth, deleteConnection);

module.exports = router;