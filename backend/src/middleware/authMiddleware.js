const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const UserModel = require('../models/userModel');

const authMiddleware = {
  // Verify JWT Token
  verifyToken: async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Akses ditolak. Token autentikasi tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      // Algoritma dikunci ke HS256 agar token "alg: none" atau algoritma lain tidak diterima
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (error) {
      return res.status(403).json({ error: 'Token tidak valid atau telah kedaluwarsa' });
    }

    try {
      // Token yang sah secara kriptografi tetap ditolak kalau akunnya sudah dihapus, perannya
      // berubah, atau kata sandinya diubah setelah token terbit.
      const account = await UserModel.findAuthState(decoded.id);
      if (!account || account.role !== decoded.role) {
        return res.status(401).json({ error: 'Sesi tidak berlaku lagi. Silakan masuk kembali.', code: 'SESSION_INVALID' });
      }
      if (account.password_changed_at) {
        const changedAtSec = Math.floor(new Date(account.password_changed_at).getTime() / 1000);
        if (!decoded.iat || decoded.iat < changedAtSec) {
          return res.status(401).json({ error: 'Kata sandi sudah diubah. Silakan masuk kembali.', code: 'SESSION_INVALID' });
        }
      }
      req.user = decoded; // Berisi id, email, role, sub, studentId
      next();
    } catch (error) {
      next(error);
    }
  },

  // Role-Based Access Control: Admin only
  isAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak. Hak akses Administrator diperlukan.' });
    }
    next();
  },

  // Role-Based Access Control: Student only
  isStudent: (req, res, next) => {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ error: 'Akses ditolak. Hak akses Mahasiswa diperlukan.' });
    }
    next();
  }
};

module.exports = authMiddleware;
