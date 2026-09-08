const db = require('../config/database');

const StudentModel = {
  // Ambil semua data student beserta data usernya
  getAll: async () => {
    const query = `
      SELECT s.*, u.email 
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `;
    const [rows] = await db.query(query);
    return rows;
  },

  // Ambil data student berdasarkan ID
  getById: async (id) => {
    const query = `
      SELECT s.*, u.email 
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0];
  },

  // Ambil data student berdasarkan user_id (untuk login mahasiswa)
  getByUserId: async (userId) => {
    const [rows] = await db.query('SELECT * FROM students WHERE user_id = ?', [userId]);
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

  // Hapus student (juga hapus user karena foreign key / cascade)
  delete: async (id) => {
    const student = await StudentModel.getById(id);
    if (!student) return 0;
    
    // Karena tabel documents ON DELETE CASCADE, dokumen akan terhapus.
    // Tapi kita perlu menghapus User-nya agar bersih.
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [student.user_id]);
    return result.affectedRows;
  }
};

module.exports = StudentModel;
