// Logika halaman verifikasi yang tidak bergantung pada React, supaya bisa dites langsung.

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // sama dengan batas unggah di backend
export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Tentukan jenis hasil dari respons POST /documents/verify-file.
 * Backend mengirim pesan berbahasa Inggris; halaman menampilkan teks Indonesia sendiri.
 * Kata "revoked" dan "not registered" di pesan backend dikunci oleh test integrasi
 * backend (test/integration/documents.test.js), jadi aman dibaca di sini.
 * @returns {'valid'|'swapped'|'revoked'|'unregistered'|'modified'}
 */
export function classifyResult(result) {
  if (result.isValid) return 'valid';
  if (result.matchedDocument) return 'swapped';
  if (result.revocationReason || /revoked/i.test(result.message || '')) return 'revoked';
  if (/not registered/i.test(result.message || '')) return 'unregistered';
  return 'modified';
}

export const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Periksa berkas sebelum diunggah.
 * @returns {string} pesan galat, atau string kosong kalau berkas boleh dipakai
 */
export function validateVerifyFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Format berkas tidak didukung. Gunakan PDF, JPG, atau PNG.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Berkas ${formatSize(file.size)}, melebihi batas 5 MB. Gunakan berkas PDF asli dari pemilik transkrip.`;
  }
  return '';
}
