const jwt = require('jsonwebtoken');

const authMiddleware = {
  // Verify JWT Token
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Akses ditolak. Token autentikasi tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = decoded; // Berisi id, email, role, sub, studentId
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Token tidak valid atau telah kedaluwarsa' });
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
