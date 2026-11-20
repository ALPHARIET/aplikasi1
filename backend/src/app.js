const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const adminTranscriptRoutes = require('./routes/adminTranscriptRoutes');

const app = express();

// Jangan umumkan teknologi server (header X-Powered-By: Express)
app.disable('x-powered-by');

// Header keamanan HTTP: X-Content-Type-Options, X-Frame-Options, Content-Security-Policy,
// Strict-Transport-Security, dan lainnya. CORP "same-site" agar frontend di localhost
// (port berbeda, situs sama) tetap bisa memuat aset dari backend.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

// CORS hanya untuk origin frontend. Daftar bisa diubah lewat CORS_ORIGINS (pisahkan dengan koma).
// Permintaan tanpa header Origin (curl, server lain, test) tidak terpengaruh CORS.
const DEFAULT_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173';
const allowedOrigins = (process.env.CORS_ORIGINS || DEFAULT_ORIGINS)
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  exposedHeaders: ['Content-Disposition', 'Retry-After']
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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

// Rute yang tidak ada
app.use((req, res) => {
  res.status(404).json({ error: 'Alamat API tidak ditemukan' });
});

// Penangan galat terakhir. Galat dari klien (unggahan, JSON rusak) dijawab 4xx dengan pesan
// yang bisa dipahami; galat server dijawab 500 tanpa membocorkan pesan atau stack internal.
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: [413, 'Ukuran berkas melebihi 5 MB. Perkecil berkasnya, lalu unggah lagi.'],
  LIMIT_FILE_COUNT: [400, 'Unggah satu berkas saja.'],
  LIMIT_UNEXPECTED_FILE: [400, 'Berkas harus dikirim di kolom "document".']
};
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const [status, error] = MULTER_MESSAGES[err.code] || [400, 'Unggahan berkas tidak valid.'];
    return res.status(status).json({ error });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Format data tidak valid (JSON rusak).' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Data yang dikirim terlalu besar.' });
  }
  const status = Number(err.status || err.statusCode);
  if (err.expose && status >= 400 && status < 500) {
    return res.status(status).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan di server. Coba lagi beberapa saat lagi.' });
});

module.exports = app;
