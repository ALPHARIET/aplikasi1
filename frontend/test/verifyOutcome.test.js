import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyResult, formatSize, validateVerifyFile, MAX_FILE_SIZE } from '../src/utils/verifyOutcome.js';

// Bentuk respons diambil dari test integrasi backend (test/integration/documents.test.js)
test('classifyResult: kelima jenis hasil verifikasi', () => {
  assert.equal(classifyResult({ isValid: true, message: 'Document is authentic and unmodified' }), 'valid');
  assert.equal(classifyResult({ isValid: false, matchedDocument: { verificationId: 'DOC-1' } }), 'swapped');
  assert.equal(classifyResult({ isValid: false, message: 'Document has been revoked by the issuer.', revocationReason: 'Salah cetak' }), 'revoked');
  assert.equal(classifyResult({ isValid: false, message: 'Document is not registered on the blockchain.', revocationReason: null }), 'unregistered');
  assert.equal(classifyResult({ isValid: false, message: 'Document has been modified or is fake. Hash does not match.' }), 'modified');
});

test('classifyResult: dicabut tetap terdeteksi walau alasannya kosong', () => {
  assert.equal(classifyResult({ isValid: false, message: 'Document has been revoked by the issuer.', revocationReason: null }), 'revoked');
});

test('classifyResult: ID tertukar didahulukan dari pesan lain', () => {
  assert.equal(classifyResult({ isValid: false, matchedDocument: {}, message: 'not registered' }), 'swapped');
});

test('classifyResult: respons tanpa pesan dianggap berkas diubah', () => {
  assert.equal(classifyResult({ isValid: false }), 'modified');
});

test('formatSize memakai KB di bawah 1 MB dan MB di atasnya', () => {
  assert.equal(formatSize(1), '1 KB');
  assert.equal(formatSize(1536), '2 KB');
  assert.equal(formatSize(6 * 1024 * 1024), '6.0 MB');
});

test('validateVerifyFile: PDF, JPG, PNG di bawah 5 MB diterima', () => {
  for (const type of ['application/pdf', 'image/jpeg', 'image/png']) {
    assert.equal(validateVerifyFile({ type, size: 1000 }), '');
  }
  assert.equal(validateVerifyFile({ type: 'application/pdf', size: MAX_FILE_SIZE }), '');
});

test('validateVerifyFile: format lain ditolak', () => {
  assert.match(validateVerifyFile({ type: 'application/msword', size: 1000 }), /Format berkas tidak didukung/);
});

test('validateVerifyFile: berkas lebih dari 5 MB ditolak dengan ukurannya', () => {
  assert.equal(
    validateVerifyFile({ type: 'application/pdf', size: MAX_FILE_SIZE + 1 }),
    'Berkas 5.0 MB, melebihi batas 5 MB. Gunakan berkas PDF asli dari pemilik transkrip.'
  );
});
