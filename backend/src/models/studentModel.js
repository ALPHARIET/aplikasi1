const db = require('../config/database');

const StudentModel = {
  // Ambil semua data student beserta data usernya (menggunakan LEFT JOIN agar student tanpa user tetap tampil)
  getAll: async () => {
    const query = `
      SELECT s.*, u.email, u.name 
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `;
    const [rows] = await db.query(query);
    return rows;
  },

  // Ambil data student berdasarkan ID
  getById: async (id) => {
    const query = `
      SELECT s.*, u.email, u.name 
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0];
  },

  // Ambil data student berdasarkan student_id_number (NIM)
  getByStudentIdNumber: async (studentIdNumber) => {
    const query = `
      SELECT s.*, u.email, u.name 
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.student_id_number = ?
    `;
    const [rows] = await db.query(query, [studentIdNumber]);
    return rows[0];
  },

  // Ambil data student berdasarkan user_id (untuk login & profile mahasiswa)
  getByUserId: async (userId) => {
    const query = `
      SELECT s.*, u.email, u.name 
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `;
    const [rows] = await db.query(query, [userId]);
    return rows[0];
  },

  // Buat profil student baru
  create: async (studentData) => {
    const { userId, studentIdNumber, fullName, faculty, program, graduationYear } = studentData;
    const query = `
      INSERT INTO students 
      (user_id, student_id_number, full_name, faculty, program, graduation_year) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      userId, studentIdNumber, fullName, faculty, program, graduationYear || null
    ]);
    return result.insertId;
  },

  // Update profil student
  update: async (id, updateData) => {
    const { studentIdNumber, fullName, faculty, program, graduationYear } = updateData;
    const query = `
      UPDATE students 
      SET student_id_number = ?, full_name = ?, faculty = ?, program = ?, graduation_year = ?
      WHERE id = ?
    `;
    const [result] = await db.query(query, [
      studentIdNumber, fullName, faculty, program, graduationYear || null, id
    ]);
    return result.affectedRows;
  },

  // Reset password mahasiswa oleh admin
  resetPassword: async (studentId, newPasswordHash) => {
    const student = await StudentModel.getById(studentId);
    if (!student) return false;
    
    if (student.user_id) {
      const [result] = await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [
        newPasswordHash,
        student.user_id
      ]);
      return result.affectedRows > 0;
    }
    return false;
  },

  // Hapus student dari tabel students dan bersihkan akun usernya jika ada
  delete: async (id) => {
    const student = await StudentModel.getById(id);
    if (!student) return 0;
    
    const userId = student.user_id;

    // Hapus student terlebih dahulu dari tabel students
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [id]);

    // Jika memiliki akun user, hapus juga akun usernya
    if (userId) {
      await db.query('DELETE FROM users WHERE id = ?', [userId]);
    }

    return result.affectedRows;
  }
};

module.exports = StudentModel;
