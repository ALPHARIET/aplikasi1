const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const upload = require('../middleware/uploadMiddleware');
const { checkFileSignature } = upload;
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Public routes (No auth required)
router.get('/verify/:verificationId', DocumentController.verify);
router.post('/verify-file', upload.single('document'), checkFileSignature, DocumentController.verifyByFile);

// Protected routes (Require Auth)
router.use(verifyToken);

// Student routes
router.get('/my-documents', DocumentController.getMyDocuments);
router.get('/:verificationId/download', DocumentController.download);

// Admin routes
router.get('/check-existing/:studentId', isAdmin, DocumentController.checkExisting);
router.post('/issue', isAdmin, upload.single('document'), checkFileSignature, DocumentController.uploadAndIssue);
router.post('/revoke/:verificationId', isAdmin, DocumentController.revoke);
router.get('/', isAdmin, DocumentController.getAll);
router.delete('/:id', isAdmin, DocumentController.deleteDocument);

module.exports = router;
