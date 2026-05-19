const express = require('express');
const router = express.Router();
const { login, getProfile, createAdmin } = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile (protegida)
router.get('/profile', auth, getProfile);

router.post('/setup', createAdmin);
module.exports = router;