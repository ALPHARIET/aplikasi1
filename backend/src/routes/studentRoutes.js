const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// All student routes require authentication
router.use(verifyToken);

// Admin only routes
router.post('/', isAdmin, StudentController.create);
router.put('/:id', isAdmin, StudentController.update);
router.put('/:id/password', isAdmin, StudentController.resetPassword);
router.delete('/:id', isAdmin, StudentController.delete);

router.get('/', isAdmin, StudentController.getAll);
// Data mahasiswa (termasuk email) hanya untuk Admin. Mahasiswa membaca profilnya sendiri
// lewat GET /api/v1/student/me, yang mengambil ID dari token, bukan dari URL.
router.get('/:id', isAdmin, StudentController.getById);

module.exports = router;
