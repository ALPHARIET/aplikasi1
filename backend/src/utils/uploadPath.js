const path = require('path');

// Folder tempat semua berkas unggahan disimpan: <root proyek>/uploads
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');

/**
 * Nilai yang disimpan ke kolom documents.file_path.
 * Hanya nama berkas, supaya tetap valid walaupun folder proyek dipindah.
 */
const toStoredPath = (absolutePath) => path.basename(absolutePath);

/**
 * Ubah nilai documents.file_path menjadi path absolut di UPLOAD_DIR.
 * Data lama yang masih menyimpan path absolut (mis. "z:/.../uploads/x.pdf")
 * ikut tertangani karena hanya nama berkasnya yang dipakai. Ini juga mencegah
 * path traversal ke luar folder uploads.
 */
const resolveStoredPath = (storedPath) => {
  if (!storedPath) return null;
  const fileName = path.basename(String(storedPath).replace(/\\/g, '/'));
  return path.join(UPLOAD_DIR, fileName);
};

module.exports = { UPLOAD_DIR, toStoredPath, resolveStoredPath };
