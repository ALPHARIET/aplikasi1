// Alur dokumen: terbit, verifikasi lewat ID dan berkas, cabut, unduh, hapus.
// Pesan verifikasi berbahasa Inggris ikut dikunci karena classifyResult di
// frontend/src/pages/Verify.jsx membaca teks pesan itu (/revoked/i, /not registered/i).
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { startTestServer, fixture, hasFixtures } = require('../helpers/testServer');
const { UPLOAD_DIR } = require('../../src/utils/uploadPath');

const skip = hasFixtures() ? false : 'Fixture demo belum ada. Jalankan npm run seed:demo dulu.';

let srv;
let adminToken;
const students = {};
const docs = {};

const STUDENTS = {
  rina: { email: 'rina@test.univ.edu', password: 'sandiuji123', studentIdNumber: 'G1A099101', fullName: 'Rina Uji', faculty: 'Teknik', program: 'Informatika', graduationYear: 2026 },
  dimas: { email: 'dimas@test.univ.edu', password: 'sandiuji123', studentIdNumber: 'G1A099102', fullName: 'Dimas Uji', faculty: 'Teknik', program: 'Informatika', graduationYear: 2026 }
};

const uploadsNow = () => new Set(fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []);
// Jalankan fn lalu pastikan tidak ada berkas sementara yang tertinggal di folder uploads
async function leavesNoUpload(fn) {
  const before = uploadsNow();
  const result = await fn();
  const added = [...uploadsNow()].filter((f) => !before.has(f));
  assert.deepEqual(added, [], 'berkas unggahan sementara tertinggal');
  return result;
}

const issue = (studentKey, file, extra = {}) => srv.api('POST', '/documents/issue', {
  token: adminToken,
  body: srv.pdfForm(file, { studentId: students[studentKey].id, docType: 'transkrip', docTitle: 'Transkrip Akademik', ...extra })
});
const verifyFile = (verificationId, file) => srv.api('POST', '/documents/verify-file', {
  body: srv.pdfForm(file, verificationId === undefined ? {} : { verificationId })
});

before(async () => {
  if (skip) return;
  srv = await startTestServer();
  adminToken = await srv.login(srv.admin.email, srv.admin.password, 'admin');
  for (const [key, data] of Object.entries(STUDENTS)) {
    const res = await srv.api('POST', '/students', { token: adminToken, body: data });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    students[key] = { ...data, id: res.data.studentId };
  }
  for (const [key, file] of [['rina', '01-rina-puspita-sari.pdf'], ['dimas', '02-dimas-arya-pratama.pdf']]) {
    const res = await issue(key, fixture('asli', file));
    assert.equal(res.status, 201, JSON.stringify(res.data));
    docs[key] = res.data;
  }
});
after(async () => { await srv?.close(); });
beforeEach(() => srv?.clearEvidence());
afterEach((t) => srv?.recordEvidence(t));

test('terbit: respons berisi Verification ID, hash, dan tautan verifikasi', { skip }, () => {
  const d = docs.rina;
  // Tanpa NIM: ID ini tercatat permanen di blockchain
  assert.match(d.verificationId, /^DOC-\d{4}-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(d.verificationId.includes('G1A099101'), false);
  assert.match(d.fileHash, /^0x[0-9a-f]{64}$/);
  assert.match(d.txHash, /^0x[0-9a-f]{64}$/);
  assert.ok(d.verifyUrl.endsWith(`/verify/${d.verificationId}`));
});

test('terbit: berkas disimpan sebagai nama berkas saja, bukan path absolut', { skip }, async () => {
  const [[row]] = await srv.pool.query('SELECT file_path, status FROM documents WHERE verification_id = ?', [docs.rina.verificationId]);
  assert.equal(row.status, 'issued');
  assert.match(row.file_path, /^document-[\d-]+\.pdf$/);
  assert.ok(fs.existsSync(`${UPLOAD_DIR}/${row.file_path}`));
});

test('terbit: field wajib kosong ditolak dan berkas dibuang', { skip }, async () => {
  const res = await leavesNoUpload(() => issue('rina', fixture('asli', '01-rina-puspita-sari.pdf'), { docTitle: '' }));
  assert.equal(res.status, 400);
});

test('terbit: mahasiswa tidak ada ditolak dan berkas dibuang', { skip }, async () => {
  const res = await leavesNoUpload(() => srv.api('POST', '/documents/issue', {
    token: adminToken,
    body: srv.pdfForm(fixture('asli', '01-rina-puspita-sari.pdf'), { studentId: 999999, docType: 'transkrip', docTitle: 'X' })
  }));
  assert.equal(res.status, 404);
});

test('terbit: requestId yang tidak valid ditolak dan berkas dibuang', { skip }, async () => {
  const res = await leavesNoUpload(() => issue('rina', fixture('asli', '01-rina-puspita-sari.pdf'), { requestId: 999999 }));
  assert.equal(res.status, 400);
});

test('terbit: tanpa berkas ditolak', { skip }, async () => {
  const form = new FormData();
  form.append('studentId', String(students.rina.id));
  const res = await srv.api('POST', '/documents/issue', { token: adminToken, body: form });
  assert.equal(res.status, 400);
});

test('terbit: hanya admin', { skip }, async () => {
  const token = await srv.login(STUDENTS.rina.studentIdNumber, STUDENTS.rina.password, 'student');
  const res = await srv.api('POST', '/documents/issue', { token, body: srv.pdfForm(fixture('asli', '01-rina-puspita-sari.pdf'), {}) });
  assert.equal(res.status, 403);
});

test('verifikasi ID: dokumen aktif valid dan hanya data publik yang dikirim', { skip }, async () => {
  const res = await srv.api('GET', `/documents/verify/${docs.rina.verificationId}`);
  assert.equal(res.status, 200);
  assert.equal(res.data.isValid, true);
  assert.equal(res.data.status, 'issued');
  assert.deepEqual(Object.keys(res.data.documentInfo).sort(), [
    'docTitle', 'docType', 'faculty', 'graduationYear', 'issuedAt', 'program', 'studentId', 'studentName', 'txHash', 'verificationId'
  ]);
  assert.equal(res.data.documentInfo.studentName, 'Rina Uji');
});

test('verifikasi ID: tidak terdaftar 404', { skip }, async () => {
  const res = await srv.api('GET', '/documents/verify/DOC-TIDAK-ADA');
  assert.equal(res.status, 404);
  assert.equal(res.data.isValid, false);
});

test('verifikasi berkas: berkas asli cocok', { skip }, async () => {
  const res = await leavesNoUpload(() => verifyFile(docs.rina.verificationId, fixture('asli', '01-rina-puspita-sari.pdf')));
  assert.equal(res.status, 200);
  assert.equal(res.data.isValid, true);
  assert.equal(res.data.message, 'Document is authentic and unmodified');
  assert.equal(res.data.documentInfo.verificationId, docs.rina.verificationId);
});

test('verifikasi berkas: berkas palsu ditolak dan field yang berubah dilaporkan', { skip }, async () => {
  const res = await leavesNoUpload(() => verifyFile(docs.rina.verificationId, fixture('palsu', '01-rina-puspita-sari-palsu.pdf')));
  assert.equal(res.data.isValid, false);
  assert.equal(res.data.message, 'Document has been modified or is fake. Hash does not match.');
  assert.equal(res.data.comparison.supported, true);
  assert.ok(res.data.comparison.summary.differences > 0);
  assert.equal(res.data.documentInfo.verificationId, docs.rina.verificationId);
  assert.equal(res.data.matchedDocument, undefined);
});

test('verifikasi berkas: ID tidak terdaftar', { skip }, async () => {
  const res = await leavesNoUpload(() => verifyFile('DOC-TIDAK-ADA', fixture('asli', '01-rina-puspita-sari.pdf')));
  assert.equal(res.data.isValid, false);
  assert.match(res.data.message, /not registered/i);
  assert.equal(res.data.revocationReason, null);
});

test('verifikasi berkas: berkas asli milik ID lain (ID tertukar)', { skip }, async () => {
  const res = await leavesNoUpload(() => verifyFile(docs.rina.verificationId, fixture('asli', '02-dimas-arya-pratama.pdf')));
  assert.equal(res.data.isValid, false);
  assert.equal(res.data.matchedDocument.verificationId, docs.dimas.verificationId);
  assert.deepEqual(Object.keys(res.data.matchedDocument).sort(), ['docTitle', 'docType', 'verificationId']);
});

test('verifikasi berkas: tanpa Verification ID ditolak', { skip }, async () => {
  const res = await leavesNoUpload(() => verifyFile(undefined, fixture('asli', '01-rina-puspita-sari.pdf')));
  assert.equal(res.status, 400);
});

test('unduh: admin boleh, pemilik boleh, mahasiswa lain ditolak', { skip }, async () => {
  const url = `/documents/${docs.rina.verificationId}/download`;
  const asAdmin = await srv.api('GET', url, { token: adminToken });
  assert.equal(asAdmin.status, 200);
  assert.match(asAdmin.headers.get('content-disposition'), new RegExp(`${docs.rina.verificationId}\\.pdf`));

  const rinaToken = await srv.login(STUDENTS.rina.studentIdNumber, STUDENTS.rina.password, 'student');
  assert.equal((await srv.api('GET', url, { token: rinaToken })).status, 200);

  const dimasToken = await srv.login(STUDENTS.dimas.studentIdNumber, STUDENTS.dimas.password, 'student');
  assert.equal((await srv.api('GET', url, { token: dimasToken })).status, 403);

  assert.equal((await srv.api('GET', url)).status, 401);
});

test('unduh: PDF tidak bisa diambil langsung dari /uploads', { skip }, async () => {
  const [[row]] = await srv.pool.query('SELECT file_path FROM documents WHERE verification_id = ?', [docs.rina.verificationId]);
  const res = await fetch(`${srv.baseUrl.replace('/api/v1', '')}/uploads/${row.file_path}`);
  assert.equal(res.status, 403);
});

test('dokumen saya: mahasiswa hanya melihat dokumennya sendiri', { skip }, async () => {
  const token = await srv.login(STUDENTS.dimas.studentIdNumber, STUDENTS.dimas.password, 'student');
  const res = await srv.api('GET', '/documents/my-documents', { token });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.documents.map((d) => d.verification_id), [docs.dimas.verificationId]);
});

test('cek dokumen aktif sebelum terbit', { skip }, async () => {
  const res = await srv.api('GET', `/documents/check-existing/${students.rina.id}`, { token: adminToken });
  assert.equal(res.data.hasExisting, true);
});

test('hapus: dokumen yang belum dicabut tidak boleh dihapus', { skip }, async () => {
  const [[row]] = await srv.pool.query('SELECT id FROM documents WHERE verification_id = ?', [docs.dimas.verificationId]);
  const res = await srv.api('DELETE', `/documents/${row.id}`, { token: adminToken });
  assert.equal(res.status, 400);
});

test('cabut lalu verifikasi: dilaporkan dicabut beserta alasannya, lalu boleh dihapus', { skip }, async () => {
  const id = docs.dimas.verificationId;
  assert.equal((await srv.api('POST', `/documents/revoke/${id}`, { token: adminToken, body: {} })).status, 400, 'alasan wajib');

  const revoked = await srv.api('POST', `/documents/revoke/${id}`, { token: adminToken, body: { reason: 'Salah cetak' } });
  assert.equal(revoked.status, 200);
  assert.equal((await srv.api('POST', `/documents/revoke/${id}`, { token: adminToken, body: { reason: 'lagi' } })).status, 400, 'sudah dicabut');

  const byId = await srv.api('GET', `/documents/verify/${id}`);
  assert.equal(byId.data.isValid, false);
  assert.equal(byId.data.status, 'revoked');
  assert.equal(byId.data.revocationReason, 'Salah cetak');

  const byFile = await leavesNoUpload(() => verifyFile(id, fixture('asli', '02-dimas-arya-pratama.pdf')));
  assert.equal(byFile.data.isValid, false);
  assert.match(byFile.data.message, /revoked/i);
  assert.equal(byFile.data.revocationReason, 'Salah cetak');

  const [[row]] = await srv.pool.query('SELECT id, file_path FROM documents WHERE verification_id = ?', [id]);
  const del = await srv.api('DELETE', `/documents/${row.id}`, { token: adminToken });
  assert.equal(del.status, 200);
  assert.equal(fs.existsSync(`${UPLOAD_DIR}/${row.file_path}`), false, 'berkas fisik ikut dihapus');
});

test('daftar semua dokumen hanya untuk admin', { skip }, async () => {
  assert.equal((await srv.api('GET', '/documents', { token: adminToken })).status, 200);
  const token = await srv.login(STUDENTS.rina.studentIdNumber, STUDENTS.rina.password, 'student');
  assert.equal((await srv.api('GET', '/documents', { token })).status, 403);
});
