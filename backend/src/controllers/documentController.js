const DocumentModel = require('../models/documentModel');
const StudentModel = require('../models/studentModel');
const HashService = require('../utils/hashService');
const BlockchainService = require('../services/blockchainService');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const DocumentController = {
  // 1. Upload dan Issue Dokumen ke Blockchain
  uploadAndIssue: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { studentId, docType, docTitle } = req.body;
      if (!studentId || !docType || !docTitle) {
        // Hapus file yang terlanjur diupload jika validasi gagal
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Pastikan student ada
      const student = await StudentModel.getById(studentId);
      if (!student) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Student not found' });
      }

      // Generate Verification ID (misal: DOC-2026-STUDENTID-RANDOM)
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const verificationId = `DOC-${new Date().getFullYear()}-${student.student_id_number}-${randomStr}`;

      // 1. Generate SHA-256 Hash dari file
      const fileHash = await HashService.hashFile(req.file.path);

      // 2. Simpan ke database dengan status "pending"
      const filePath = req.file.path.replace(/\\/g, '/'); // Normalize path
      await DocumentModel.create({
        verificationId,
        studentId,
        docType,
        docTitle,
        filePath,
        fileHash
      });

      // 3. Issue ke Blockchain
      const bcReceipt = await BlockchainService.issueDocument(verificationId, fileHash);

      // 4. Generate QR Code
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verifyUrl = `${frontendUrl}/verify/${verificationId}`;
      const qrPath = path.join(__dirname, '../../../uploads', `${verificationId}-qr.png`);
      
      await QRCode.toFile(qrPath, verifyUrl, {
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      // 5. Update status di database menjadi "issued"
      const qrRelativePath = qrPath.replace(/\\/g, '/');
      await DocumentModel.updateIssueStatus(
        verificationId, 
        bcReceipt.txHash, 
        bcReceipt.blockNumber, 
        bcReceipt.issuer,
        qrRelativePath
      );

      res.status(201).json({
        message: 'Document successfully issued on blockchain',
        verificationId,
        fileHash,
        txHash: bcReceipt.txHash,
        verifyUrl
      });

    } catch (error) {
      console.error('Upload & Issue Error:', error);
      res.status(500).json({ error: error.message || 'Failed to issue document' });
    }
  },

  // 2. Revoke Dokumen
  revoke: async (req, res) => {
    try {
      const { verificationId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Revocation reason is required' });
      }

      const doc = await DocumentModel.getByVerificationId(verificationId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (doc.status === 'revoked') {
        return res.status(400).json({ error: 'Document is already revoked' });
      }

      // 1. Revoke di Blockchain
      await BlockchainService.revokeDocument(verificationId);

      // 2. Update status di database
      await DocumentModel.updateRevokeStatus(verificationId, reason);

      res.json({ message: 'Document successfully revoked' });
    } catch (error) {
      console.error('Revoke Error:', error);
      res.status(500).json({ error: error.message || 'Failed to revoke document' });
    }
  },

  // 3. Verify Dokumen (Public Route)
  verify: async (req, res) => {
    try {
      const { verificationId } = req.params;

      // 1. Ambil data dari database
      const doc = await DocumentModel.getByVerificationId(verificationId);
      if (!doc) {
        return res.status(404).json({ isValid: false, error: 'Document not found in database' });
      }

      // 2. Cek ke Blockchain apakah valid
      const isValidOnChain = await BlockchainService.isDocumentValid(verificationId);
      
      // 3. Cek Hash (Hanya memastikan hash-nya masih match dengan yang di-upload awal)
      // Dalam implementasi nyata, frontend bisa upload file untuk di-hash ulang dan dicocokkan dengan blockchain
      const isHashValid = await BlockchainService.verifyHash(verificationId, doc.file_hash);

      res.json({
        isValid: isValidOnChain && isHashValid,
        status: doc.status,
        documentInfo: {
          verificationId: doc.verification_id,
          docType: doc.doc_type,
          docTitle: doc.doc_title,
          studentName: doc.full_name,
          studentId: doc.student_id_number,
          faculty: doc.faculty,
          program: doc.program,
          graduationYear: doc.graduation_year,
          issuedAt: doc.issued_at,
          txHash: doc.tx_hash
        },
        revocationReason: doc.status === 'revoked' ? doc.revocation_reason : null
      });

    } catch (error) {
      console.error('Verify Error:', error);
      res.status(500).json({ error: 'Failed to verify document' });
    }
  },

  // 4. Verifikasi dengan Upload File Baru (Cocokkan Hash)
  verifyByFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded for verification' });
      }
      
      const { verificationId } = req.body;
      if (!verificationId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Verification ID is required' });
      }

      // Hash file yang baru diupload
      const uploadedFileHash = await HashService.hashFile(req.file.path);
      
      // Hapus file temp karena tidak perlu disimpan
      fs.unlinkSync(req.file.path);

      // Verifikasi Hash ke Blockchain
      const isHashValid = await BlockchainService.verifyHash(verificationId, uploadedFileHash);
      const isDocValid = await BlockchainService.isDocumentValid(verificationId);

      if (isHashValid && isDocValid) {
        // Ambil info dokumen
        const doc = await DocumentModel.getByVerificationId(verificationId);
        return res.json({
          isValid: true,
          message: 'Document is authentic and unmodified',
          documentInfo: doc
        });
      } else if (!isHashValid) {
        return res.json({
          isValid: false,
          message: 'Document has been modified or is fake. Hash does not match.'
        });
      } else if (!isDocValid) {
        return res.json({
          isValid: false,
          message: 'Document hash matches, but the document has been revoked by the issuer.'
        });
      }

    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('Verify By File Error:', error);
      res.status(500).json({ error: 'Failed to verify document via file' });
    }
  },

  // 5. Get All (Admin)
  getAll: async (req, res) => {
    try {
      const docs = await DocumentModel.getAll();
      res.json({ documents: docs });
    } catch (error) {
      console.error('Get All Docs Error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  },

  // 6. Get By Student (Student View)
  getMyDocuments: async (req, res) => {
    try {
      // req.user.id adalah ID user yang sedang login
      const student = await StudentModel.getByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const docs = await DocumentModel.getByStudentId(student.id);
      res.json({ documents: docs });
    } catch (error) {
      console.error('Get My Docs Error:', error);
      res.status(500).json({ error: 'Failed to fetch your documents' });
    }
  }
};

module.exports = DocumentController;
