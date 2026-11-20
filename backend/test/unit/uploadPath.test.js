const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { UPLOAD_DIR, toStoredPath, resolveStoredPath } = require('../../src/utils/uploadPath');

test('UPLOAD_DIR menunjuk ke <root proyek>/uploads', () => {
  assert.equal(UPLOAD_DIR, path.resolve(__dirname, '../../../uploads'));
});

test('toStoredPath hanya menyimpan nama berkas', () => {
  assert.equal(toStoredPath(path.join(UPLOAD_DIR, 'document-1-2.pdf')), 'document-1-2.pdf');
});

test('resolveStoredPath: nama berkas biasa', () => {
  assert.equal(resolveStoredPath('document-1-2.pdf'), path.join(UPLOAD_DIR, 'document-1-2.pdf'));
});

test('resolveStoredPath: data lama berupa path absolut Windows', () => {
  assert.equal(resolveStoredPath(String.raw`z:\lama\uploads\document-9.pdf`), path.join(UPLOAD_DIR, 'document-9.pdf'));
});

test('resolveStoredPath: path traversal tidak bisa keluar dari folder uploads', () => {
  assert.equal(resolveStoredPath('../../backend/.env'), path.join(UPLOAD_DIR, '.env'));
  assert.equal(resolveStoredPath(String.raw`..\..\secret.txt`), path.join(UPLOAD_DIR, 'secret.txt'));
});

test('resolveStoredPath: nilai kosong menghasilkan null', () => {
  assert.equal(resolveStoredPath(null), null);
  assert.equal(resolveStoredPath(''), null);
});
