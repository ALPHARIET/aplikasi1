const db = require('../config/database');

const UserModel = {
  // Find a user by email
  findByEmail: async (email) => {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  // Find a user by student NIM
  findByNIM: async (nim) => {
    const query = `
      SELECT u.*, s.id AS student_id, s.student_id_number, s.full_name, s.faculty, s.program, s.graduation_year
      FROM users u
      JOIN students s ON s.user_id = u.id
      WHERE s.student_id_number = ?
    `;
    const [rows] = await db.query(query, [nim]);
    return rows[0];
  },

  // Find a user by ID
  findById: async (id) => {
    const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  // Create a new user
  create: async (userData) => {
    const { name, email, passwordHash, role } = userData;
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role || 'student']
    );
    return result.insertId;
  },

  // Update password hash
  updatePassword: async (userId, newPasswordHash) => {
    const [result] = await db.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );
    return result.affectedRows;
  }
};

module.exports = UserModel;
