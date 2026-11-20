const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { loginThrottle } = require('../middleware/loginThrottle');

// Pendaftaran akun hanya boleh dilakukan Admin. Tanpa ini siapa pun bisa
// mendaftar dengan role 'admin' lalu menerbitkan/mencabut dokumen.
router.post('/register', verifyToken, isAdmin, AuthController.register);

// Public routes. loginThrottle hanya menghitung kata sandi yang salah (lihat middleware).
router.post('/login', loginThrottle, AuthController.login);
router.post('/student/login', loginThrottle, AuthController.studentLogin);

// Protected routes
router.get('/profile', verifyToken, AuthController.getProfile);

module.exports = router;
