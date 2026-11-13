const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const adminTranscriptRoutes = require('./routes/adminTranscriptRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pengamanan Berkas Unggahan:
// Blokir akses publik langsung ke berkas dokumen PDF.
// Seluruh unduhan berkas PDF wajib melalui endpoint terautentikasi.
// Aset publik (seperti QR Code gambar PNG) tetap diizinkan bila ada.
app.use('/uploads', (req, res, next) => {
  if (req.path.toLowerCase().endsWith('.pdf')) {
    return res.status(403).json({
      error: 'Akses ditolak. Berkas dokumen hanya dapat diunduh melalui endpoint terautentikasi.'
    });
  }
  next();
}, express.static('uploads'));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/student', studentPortalRoutes);
app.use('/api/v1/admin/transcript-requests', adminTranscriptRoutes);

// Base route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Diploma Registry API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

module.exports = app;
