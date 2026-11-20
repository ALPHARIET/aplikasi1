const DocumentModel = require('../models/documentModel');
const StudentModel = require('../models/studentModel');
const TranscriptRequestModel = require('../models/transcriptRequestModel');
const HashService = require('../utils/hashService');
const BlockchainService = require('../services/blockchainService');
const DocumentComparator = require('../services/documentComparator');
const { toStoredPath, resolveStoredPath } = require('../utils/uploadPath');
const path = require('path');
const fs = require('fs');

// Data dokumen yang aman ditampilkan di endpoint verifikasi publik.
// Jangan kirim baris database mentah: ada file_path, file_hash, id internal, dll.
const toPublicDocumentInfo = (doc) => ({
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
});

// Hapus berkas unggahan sementara dari disk. Aman dipanggil walau berkasnya sudah tidak ada.
const discardUpload = (file) => {
  if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
};

// Tolak permintaan unggah: buang berkasnya dulu, lalu kirim respons galat
const rejectUpload = (res, file, status, body) => {
  discardUpload(file);
  return res.status(status).json(body);
};

// Format: DOC-<tahun>-<NIM>-<6 karakter acak>, mis. DOC-2026-G1A022001-K3J9QZ
const generateVerificationId = (student) => {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DOC-${new Date().getFullYear()}-${student.student_id_number}-${randomStr}`;
};

// Permintaan transkrip hanya boleh dipakai kalau milik mahasiswa yang sama dan masih pending
const isUsableRequest = (transcriptReq, studentId) =>
  !!transcriptReq &&
  Number(transcriptReq.student_id) === Number(studentId) &&
  transcriptReq.status === 'pending';

// Berkas asli yang terdaftar dengan Verification ID lain (pengguna salah memasangkan ID)
const findSwappedDocument = async (fileHash, verificationId) => {
  const matchingDoc = await DocumentModel.getByFileHash(fileHash);
  if (!matchingDoc || matchingDoc.verification_id === verificationId) return null;
  const isAuthentic = await BlockchainService.verifyHash(matchingDoc.verification_id, fileHash);
  return isAuthentic ? matchingDoc : null;
};

// Bandingkan isi berkas unggahan dengan berkas asli untuk menandai field yang berbeda
const compareWithOriginal = async (doc, file) => {
  try {
    return await DocumentComparator.compareDocuments(resolveStoredPath(doc.file_path), file.path, file.mimetype);
  } catch (compareError) {
    console.error('Document Compare Error:', compareError);
    return { supported: false, reason: 'Dokumen tidak dapat dibaca untuk perbandingan.' };
  }
};

const DocumentController = {
  // 0. Cek apakah mahasiswa sudah punya dokumen aktif (dipanggil sebelum issue)
  checkExisting: async (req, res) => {
    try {
      const { studentId } = req.params;
      const existing = await DocumentModel.getActiveByStudentId(studentId);
      res.json({ hasExisting: !!existing, existing: existing || null });
    } catch (error) {
      console.error('Check Existing Error:', error);
      res.status(500).json({ error: 'Failed to check existing document' });
    }
  },

  // 1. Upload dan Issue Dokumen ke Blockchain
  uploadAndIssue: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Validasi gagal: berkas yang terlanjur diunggah dibuang. Setelah lolos validasi,
      // berkas dipertahankan karena itulah dokumen yang diterbitkan.
      const { studentId, docType, docTitle, requestId } = req.body;
      if (!studentId || !docType || !docTitle) {
        return rejectUpload(res, req.file, 400, { error: 'Missing required fields' });
      }

      const student = await StudentModel.getById(studentId);
      if (!student) {
        return rejectUpload(res, req.file, 404, { error: 'Student not found' });
      }

      if (requestId && !isUsableRequest(await TranscriptRequestModel.getById(requestId), studentId)) {
        return rejectUpload(res, req.file, 400, {
          error: 'Permintaan transkrip tidak valid, bukan milik mahasiswa ini, atau tidak berstatus pending.'
        });
      }

      const verificationId = generateVerificationId(student);

      // 1. Generate SHA-256 Hash dari file
      const fileHash = await HashService.hashFile(req.file.path);

      // 2. Simpan ke database dengan status "pending"
      // Simpan nama berkas saja (relatif terhadap folder uploads), bukan path absolut
      const filePath = toStoredPath(req.file.path);
      const docInsertId = await DocumentModel.create({
        verificationId,
        studentId,
        docType,
        docTitle,
        filePath,
        fileHash
      });

      // 3. Issue ke Blockchain
      const bcReceipt = await BlockchainService.issueDocument(verificationId, fileHash);

      // 4. Update status di database menjadi "issued"
      await DocumentModel.updateIssueStatus(
        verificationId,
        bcReceipt.txHash,
        bcReceipt.blockNumber,
        bcReceipt.issuer,
        null
      );

      // 5. Jika ada requestId dan blockchain sukses, ubah status permintaan menjadi 'issued'
      if (requestId) {
        await TranscriptRequestModel.markIssued(
          requestId,
          studentId,
          docInsertId,
          req.user.id
        );
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verifyUrl = `${frontendUrl}/verify/${verificationId}`;

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
        documentInfo: toPublicDocumentInfo(doc),
        revocationReason: doc.status === 'revoked' ? doc.revocation_reason : null
      });

    } catch (error) {
      console.error('Verify Error:', error);
      res.status(500).json({ error: 'Failed to verify document' });
    }
  },

  // 4. Verifikasi dengan Upload File Baru (Cocokkan Hash)
  // Berkas unggahan hanya dipakai untuk dicocokkan, jadi selalu dibuang di akhir (blok finally).
  // Isi "message" dibaca frontend (classifyResult di Verify.jsx): jangan diubah tanpa menyesuaikannya.
  verifyByFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded for verification' });
      }

      const { verificationId } = req.body;
      if (!verificationId) {
        return res.status(400).json({ error: 'Verification ID is required' });
      }

      // Hash file yang baru diupload
      const uploadedFileHash = await HashService.hashFile(req.file.path);

      // Verifikasi ke Blockchain. verifyHash hanya true jika hash cocok DAN dokumen aktif,
      // jadi status revoke dicek terpisah lewat isDocumentValid.
      const isDocValid = await BlockchainService.isDocumentValid(verificationId);
      const isHashValid = isDocValid && await BlockchainService.verifyHash(verificationId, uploadedFileHash);
      const doc = await DocumentModel.getByVerificationId(verificationId);

      if (isHashValid) {
        return res.json({
          isValid: true,
          message: 'Document is authentic and unmodified',
          documentInfo: doc ? toPublicDocumentInfo(doc) : null
        });
      }

      if (!isDocValid) {
        const isRevoked = doc && doc.status === 'revoked';
        return res.json({
          isValid: false,
          message: isRevoked
            ? 'Document has been revoked by the issuer.'
            : 'Document is not registered on the blockchain.',
          revocationReason: isRevoked ? doc.revocation_reason : null
        });
      }

      const matchingDoc = await findSwappedDocument(uploadedFileHash, verificationId);
      if (matchingDoc) {
        return res.json({
          isValid: false,
          message: 'This file is an authentic document, but it is registered under a different Verification ID.',
          matchedDocument: {
            verificationId: matchingDoc.verification_id,
            docTitle: matchingDoc.doc_title,
            docType: matchingDoc.doc_type
          }
        });
      }

      // Hash tidak cocok: tandai field yang berbeda dari berkas asli
      return res.json({
        isValid: false,
        message: 'Document has been modified or is fake. Hash does not match.',
        documentInfo: toPublicDocumentInfo(doc),
        comparison: await compareWithOriginal(doc, req.file)
      });

    } catch (error) {
      console.error('Verify By File Error:', error);
      res.status(500).json({ error: 'Failed to verify document via file' });
    } finally {
      discardUpload(req.file);
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

  // 6. Download file dokumen (Admin atau mahasiswa pemilik dokumen)
  download: async (req, res) => {
    try {
      const doc = await DocumentModel.getByVerificationId(req.params.verificationId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (req.user.role !== 'admin') {
        const student = await StudentModel.getByUserId(req.user.id);
        if (!student || student.id !== doc.student_id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const fileOnDisk = resolveStoredPath(doc.file_path);
      if (!fileOnDisk || !fs.existsSync(fileOnDisk)) {
        return res.status(404).json({ error: 'Document file not found' });
      }

      res.download(fileOnDisk, `${doc.verification_id}${path.extname(fileOnDisk)}`);
    } catch (error) {
      console.error('Download Error:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  },

  // 7. Get By Student (Student View)
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
  },

  // 8. Delete Dokumen dari database (Admin only - hanya untuk dokumen berstatus 'revoked')
  deleteDocument: async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await DocumentModel.getById(id);
      if (!doc) {
        return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
      }

      // Validasi: hanya dokumen yang sudah di-revoke yang boleh dihapus
      if (doc.status !== 'revoked') {
        return res.status(400).json({ 
          error: 'Dokumen hanya dapat dihapus jika statusnya sudah di-revoke.' 
        });
      }

      // Hapus file fisik dokumen jika ada
      const fileOnDisk = resolveStoredPath(doc.file_path);
      if (fileOnDisk && fs.existsSync(fileOnDisk)) {
        try {
          fs.unlinkSync(fileOnDisk);
        } catch (fileErr) {
          console.warn('Failed to delete physical file:', fileErr.message);
        }
      }

      await DocumentModel.deleteById(id);
      res.json({ message: 'Dokumen yang telah di-revoke berhasil dihapus' });
    } catch (error) {
      console.error('Delete Document Error:', error);
      res.status(500).json({ error: 'Gagal menghapus dokumen' });
    }
  }
};

module.exports = DocumentController;
