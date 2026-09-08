const db = require('../config/database');

const UserModel = {
  // Find a user by email
  findByEmail: async (email) => {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
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
  }
};

module.exports = UserModel;
