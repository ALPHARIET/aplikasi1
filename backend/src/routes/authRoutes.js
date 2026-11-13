const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');

// Public routes dengan rate limiting 10 percobaan per 15 menit
router.post('/register', AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/student/login', loginRateLimiter, AuthController.studentLogin);

// Protected routes
router.get('/profile', verifyToken, AuthController.getProfile);

module.exports = router;
