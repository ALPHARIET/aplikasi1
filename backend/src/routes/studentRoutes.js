const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// All student routes require authentication
router.use(verifyToken);

// Admin only routes
router.post('/', isAdmin, StudentController.create);
router.put('/:id', isAdmin, StudentController.update);
router.delete('/:id', isAdmin, StudentController.delete);

// Shared routes (Admin can view all, maybe we want to restrict students to only view themselves later)
router.get('/', isAdmin, StudentController.getAll);
router.get('/:id', StudentController.getById);

module.exports = router;
