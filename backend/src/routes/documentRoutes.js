const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const ScannerController = require('../controllers/scannerController');
const upload = require('../middleware/uploadMiddleware');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Public routes (No auth required)
router.get('/verify/:verificationId', DocumentController.verify);
router.post('/verify-file', upload.single('document'), DocumentController.verifyByFile);

// Protected routes (Require Auth)
router.use(verifyToken);

// Student routes
router.get('/my-documents', DocumentController.getMyDocuments);
router.get('/:verificationId/download', DocumentController.download);

// Admin routes
router.post('/issue', isAdmin, upload.single('document'), DocumentController.uploadAndIssue);
router.post('/revoke/:verificationId', isAdmin, DocumentController.revoke);
router.get('/', isAdmin, DocumentController.getAll);

// OCR / Scanner route
router.post('/scan', isAdmin, upload.single('document'), ScannerController.scanDocument);

module.exports = router;
