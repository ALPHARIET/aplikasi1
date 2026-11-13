const db = require('../config/database');

const TranscriptRequestModel = {
  // Ambil request berdasarkan ID
  getById: async (id) => {
    const query = `
      SELECT tr.*, s.student_id_number, s.full_name, s.faculty, s.program,
             u.name AS processor_name, d.verification_id
      FROM transcript_requests tr
      JOIN students s ON tr.student_id = s.id
      LEFT JOIN users u ON tr.processed_by = u.id
      LEFT JOIN documents d ON tr.document_id = d.id
      WHERE tr.id = ?
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0];
  },

  // Cek apakah mahasiswa sedang memiliki request berstatus 'pending'
  getActivePendingByStudentId: async (studentId) => {
    const query = `
      SELECT * FROM transcript_requests 
      WHERE student_id = ? AND status = 'pending'
      LIMIT 1
    `;
    const [rows] = await db.query(query, [studentId]);
    return rows[0];
  },

  // Buat request baru
  create: async ({ studentId, purpose }) => {
    const query = `
      INSERT INTO transcript_requests (student_id, purpose, status)
      VALUES (?, ?, 'pending')
    `;
    const [result] = await db.query(query, [studentId, purpose || null]);
    return result.insertId;
  },

  // Ambil semua request milik mahasiswa tertentu
  getByStudentId: async (studentId) => {
    const query = `
      SELECT tr.*, d.verification_id, d.tx_hash, d.status AS doc_status, d.issued_at AS doc_issued_at
      FROM transcript_requests tr
      LEFT JOIN documents d ON tr.document_id = d.id
      WHERE tr.student_id = ?
      ORDER BY tr.requested_at DESC, tr.id DESC
    `;
    const [rows] = await db.query(query, [studentId]);
    return rows;
  },

  // Batalkan request oleh mahasiswa (hanya jika masih pending)
  cancel: async (id, studentId) => {
    const query = `
      UPDATE transcript_requests
      SET status = 'cancelled', processed_at = NOW()
      WHERE id = ? AND student_id = ? AND status = 'pending'
    `;
    const [result] = await db.query(query, [id, studentId]);
    return result.affectedRows > 0;
  },

  // Ambil semua request untuk Admin (dengan filter status dan pencarian)
  getAllAdmin: async ({ status = 'all', search = '' }) => {
    let query = `
      SELECT tr.*, s.student_id_number, s.full_name, s.faculty, s.program,
             u.name AS processor_name, d.verification_id
      FROM transcript_requests tr
      JOIN students s ON tr.student_id = s.id
      LEFT JOIN users u ON tr.processed_by = u.id
      LEFT JOIN documents d ON tr.document_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND tr.status = ?`;
      params.push(status);
    }

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      query += ` AND (s.full_name LIKE ? OR s.student_id_number LIKE ?)`;
      params.push(q, q);
    }

    query += ` ORDER BY (tr.status = 'pending') DESC, tr.requested_at DESC, tr.id DESC`;

    const [rows] = await db.query(query, params);
    return rows;
  },

  // Hitung jumlah request berstatus pending (untuk badge & stat card)
  getPendingCount: async () => {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS count FROM transcript_requests WHERE status = 'pending'"
    );
    return rows[0]?.count || 0;
  },

  // Tolak request oleh Admin
  reject: async (id, adminUserId, reason) => {
    const query = `
      UPDATE transcript_requests
      SET status = 'rejected', reject_reason = ?, processed_at = NOW(), processed_by = ?
      WHERE id = ? AND status = 'pending'
    `;
    const [result] = await db.query(query, [reason || null, adminUserId, id]);
    return result.affectedRows > 0;
  },

  // Tandai request sebagai 'issued' setelah dokumen berhasil terbit di blockchain
  markIssued: async (id, studentId, documentId, adminUserId) => {
    const query = `
      UPDATE transcript_requests
      SET status = 'issued', document_id = ?, processed_at = NOW(), processed_by = ?
      WHERE id = ? AND student_id = ? AND status = 'pending'
    `;
    const [result] = await db.query(query, [documentId, adminUserId, id, studentId]);
    return result.affectedRows > 0;
  }
};

module.exports = TranscriptRequestModel;

