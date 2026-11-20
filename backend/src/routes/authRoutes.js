const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Pendaftaran akun hanya boleh dilakukan Admin. Tanpa ini siapa pun bisa
// mendaftar dengan role 'admin' lalu menerbitkan/mencabut dokumen.
router.post('/register', verifyToken, isAdmin, AuthController.register);

// Public routes
router.post('/login', AuthController.login);
router.post('/student/login', AuthController.studentLogin);

// Protected routes
router.get('/profile', verifyToken, AuthController.getProfile);

module.exports = router;
