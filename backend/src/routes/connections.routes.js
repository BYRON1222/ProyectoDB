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

router.get('/',     auth, getConnections);
router.get('/:id',  auth, getConnectionById);
router.post('/',    auth, createConnection);
router.patch('/:id/status', auth, updateConnectionStatus);
router.delete('/:id', auth, deleteConnection);

module.exports = router;