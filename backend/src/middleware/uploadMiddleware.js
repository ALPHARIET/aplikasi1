const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR: uploadDir } = require('../utils/uploadPath');

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Jenis berkas yang diterima: MIME yang diklaim klien, ekstensi yang wajar, dan tanda tangan
// (magic bytes) di awal isi berkas. Ketiganya harus cocok.
const FILE_TYPES = {
  'application/pdf': { exts: ['.pdf'], signature: [Buffer.from('%PDF-')] },
  'image/jpeg': { exts: ['.jpg', '.jpeg'], signature: [Buffer.from([0xff, 0xd8, 0xff])] },
  'image/jpg': { exts: ['.jpg', '.jpeg'], signature: [Buffer.from([0xff, 0xd8, 0xff])] },
  'image/png': { exts: ['.png'], signature: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])] }
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const uploadError = (message, status = 400) => Object.assign(new Error(message), { status, expose: true });

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nama acak + ekstensi dari daftar yang diizinkan; nama asli dari klien tidak pernah dipakai
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const type = FILE_TYPES[file.mimetype];
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (type && type.exts.includes(ext)) {
    cb(null, true);
  } else {
    cb(uploadError('Jenis berkas tidak didukung. Unggah PDF, JPG, atau PNG.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Dipasang setelah upload.single(): baca beberapa byte pertama berkas dan pastikan isinya
// benar-benar PDF/JPG/PNG seperti yang diklaim. Berkas yang menyamar langsung dihapus.
function checkFileSignature(req, res, next) {
  if (!req.file) return next();
  const { signature } = FILE_TYPES[req.file.mimetype];
  let head = Buffer.alloc(0);
  try {
    const fd = fs.openSync(req.file.path, 'r');
    try {
      head = Buffer.alloc(8);
      const read = fs.readSync(fd, head, 0, 8, 0);
      head = head.subarray(0, read);
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    return next(err);
  }
  if (signature.some((magic) => head.subarray(0, magic.length).equals(magic))) return next();

  fs.unlink(req.file.path, () => {});
  return res.status(400).json({ error: 'Isi berkas tidak sesuai jenisnya. Unggah berkas PDF, JPG, atau PNG yang asli.' });
}

module.exports = upload;
module.exports.checkFileSignature = checkFileSignature;
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
