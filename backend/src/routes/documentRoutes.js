const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const upload = require('../middleware/uploadMiddleware');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Public routes (No auth required)
router.get('/verify/:verificationId', DocumentController.verify);
router.post('/verify-file', upload.single('document'), DocumentController.verifyByFile);

// Protected routes (Require Auth)
router.use(verifyToken);

// Student routes
router.get('/my-documents', DocumentController.getMyDocuments);

// Admin routes
router.post('/issue', isAdmin, upload.single('document'), DocumentController.uploadAndIssue);
router.post('/revoke/:verificationId', isAdmin, DocumentController.revoke);
router.get('/', isAdmin, DocumentController.getAll);

module.exports = router;
