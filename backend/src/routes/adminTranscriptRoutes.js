const express = require('express');
const router = express.Router();
const AdminTranscriptController = require('../controllers/adminTranscriptController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Semua rute admin memerlukan autentikasi dan peran 'admin'
router.use(verifyToken, isAdmin);

router.get('/', AdminTranscriptController.getAllRequests);
router.get('/pending-count', AdminTranscriptController.getPendingCount);
router.patch('/:id/reject', AdminTranscriptController.rejectRequest);

module.exports = router;

