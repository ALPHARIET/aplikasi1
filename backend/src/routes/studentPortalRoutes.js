const express = require('express');
const router = express.Router();
const StudentPortalController = require('../controllers/studentPortalController');
const { verifyToken, isStudent } = require('../middleware/authMiddleware');

// Semua rute mahasiswa wajib terautentikasi dan memiliki peran 'student'
router.use(verifyToken, isStudent);

// 1. Profil & Keamanan
router.get('/me', StudentPortalController.getMe);
router.put('/password', StudentPortalController.changePassword);

// 2. Permintaan Transkrip Nilai
router.post('/transcript-requests', StudentPortalController.requestTranscript);
router.get('/transcript-requests', StudentPortalController.getMyRequests);
router.patch('/transcript-requests/:id/cancel', StudentPortalController.cancelRequest);

// 3. Dokumen Transkrip & Unduhan Terautentikasi
router.get('/documents', StudentPortalController.getMyDocuments);
router.get('/documents/:id/download', StudentPortalController.downloadDocument);

module.exports = router;

