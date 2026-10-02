const db = require('../config/database');

const DocumentModel = {
  // Ambil semua dokumen
  getAll: async () => {
    const query = `
      SELECT d.*, s.student_id_number, s.full_name, s.faculty 
      FROM documents d
      JOIN students s ON d.student_id = s.id
      ORDER BY d.created_at DESC, d.id DESC
    `;
    const [rows] = await db.query(query);
    return rows;
  },

  // Ambil dokumen berdasarkan ID Mahasiswa
  getByStudentId: async (studentId) => {
    const query = `
      SELECT * FROM documents 
      WHERE student_id = ?
      ORDER BY created_at DESC, id DESC
    `;
    const [rows] = await db.query(query, [studentId]);
    return rows;
  },

  // Ambil dokumen berdasarkan Verification ID (Public route)
  getByVerificationId: async (verificationId) => {
    const query = `
      SELECT d.*, s.student_id_number, s.full_name, s.faculty, s.program, s.graduation_year 
      FROM documents d
      JOIN students s ON d.student_id = s.id
      WHERE d.verification_id = ?
    `;
    const [rows] = await db.query(query, [verificationId]);
    return rows[0];
  },

  // Cari dokumen terbit berdasarkan hash file (untuk mendeteksi Verification ID yang tertukar)
  getByFileHash: async (fileHash) => {
    const query = `
      SELECT verification_id, doc_title, doc_type, status
      FROM documents
      WHERE file_hash = ? AND status = 'issued'
      ORDER BY id DESC
      LIMIT 1
    `;
    const [rows] = await db.query(query, [fileHash]);
    return rows[0];
  },

  // Simpan dokumen baru ke database (sebelum di-issue ke blockchain)
  create: async (docData) => {
    const { 
      verificationId, studentId, docType, docTitle, filePath, fileHash 
    } = docData;

    const query = `
      INSERT INTO documents 
      (verification_id, student_id, doc_type, doc_title, file_path, file_hash, status) 
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `;
    
    const [result] = await db.query(query, [
      verificationId, studentId, docType, docTitle, filePath, fileHash
    ]);
    return result.insertId;
  },

  // Update status dokumen setelah berhasil di-issue ke blockchain
  updateIssueStatus: async (verificationId, txHash, blockNumber, issuerAddress, qrCodePath) => {
    const query = `
      UPDATE documents 
      SET status = 'issued', tx_hash = ?, block_number = ?, issuer_address = ?, qr_code_path = ?, issued_at = NOW()
      WHERE verification_id = ?
    `;
    const [result] = await db.query(query, [
      txHash, blockNumber, issuerAddress, qrCodePath, verificationId
    ]);
    return result.affectedRows;
  },

  // Update status dokumen saat di-revoke
  updateRevokeStatus: async (verificationId, reason) => {
    const query = `
      UPDATE documents 
      SET status = 'revoked', revocation_reason = ?, revoked_at = NOW()
      WHERE verification_id = ?
    `;
    const [result] = await db.query(query, [reason, verificationId]);
    return result.affectedRows;
  }
};

module.exports = DocumentModel;
