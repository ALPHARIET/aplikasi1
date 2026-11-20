// Konfigurasi JWT. Server menolak berjalan tanpa JWT_SECRET, karena secret
// cadangan yang ditulis di kode bisa dipakai siapa saja untuk memalsukan token.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || !JWT_SECRET.trim()) {
  throw new Error('JWT_SECRET belum diatur. Tambahkan JWT_SECRET ke backend/.env lalu jalankan ulang server.');
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
};
