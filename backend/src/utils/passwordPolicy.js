// Aturan kata sandi yang sama untuk semua jalur: pendaftaran oleh admin, tambah mahasiswa,
// reset oleh admin, dan ganti sandi di portal mahasiswa.
const crypto = require('crypto');

const MIN_PASSWORD_LENGTH = 8;
// bcrypt hanya memakai 72 byte pertama; sisanya diabaikan diam-diam, jadi ditolak saja
const MAX_PASSWORD_BYTES = 72;

// Kembalikan pesan galat kalau kata sandi tidak memenuhi aturan, atau null kalau lolos
function passwordProblem(password) {
  if (typeof password !== 'string' || password.trim().length < MIN_PASSWORD_LENGTH) {
    return `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return `Kata sandi terlalu panjang (maksimal ${MAX_PASSWORD_BYTES} byte).`;
  }
  return null;
}

// Kata sandi acak untuk reset oleh admin. Memakai crypto, bukan Math.random, agar tidak bisa ditebak.
const RANDOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
function randomPassword(length = 10) {
  return Array.from({ length }, () => RANDOM_CHARS[crypto.randomInt(RANDOM_CHARS.length)]).join('');
}

module.exports = { MIN_PASSWORD_LENGTH, passwordProblem, randomPassword };

// Waktu sekarang dibulatkan ke bawah ke detik penuh. Kolom DATETIME membulatkan milidetik
// ke atas, padahal "iat" token JWT dibulatkan ke bawah; tanpa ini token yang terbit tepat
// setelah ganti sandi bisa ikut tertolak.
module.exports.wholeSecondNow = () => new Date(Math.floor(Date.now() / 1000) * 1000);
