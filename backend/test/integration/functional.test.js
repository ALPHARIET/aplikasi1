// Pengujian fungsional (black-box lewat API) untuk fitur kelola mahasiswa, portal mahasiswa,
// dan alur permintaan transkrip. ID kasus uji (F-...) dipakai di laporan pengujian.
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, fixture, hasFixtures } = require('../helpers/testServer');

const skip = hasFixtures() ? false : 'Fixture demo belum ada. Jalankan npm run seed:demo dulu.';

let srv;
let adminToken;
const MHS = {
  email: 'sari@test.univ.edu', password: 'sandiawal123', studentIdNumber: 'G1A099301',
  fullName: 'Sari Fungsional', faculty: 'Teknik', program: 'Informatika', graduationYear: 2026
};
let studentId;
let studentToken;

before(async () => {
  if (skip) return;
  srv = await startTestServer();
  adminToken = await srv.login(srv.admin.email, srv.admin.password, 'admin');
});
after(async () => { await srv?.close(); });
beforeEach(() => srv?.clearEvidence());
afterEach((t) => srv?.recordEvidence(t));

const asAdmin = (method, url, body) => srv.api(method, url, { token: adminToken, body });
const asStudent = (method, url, body) => srv.api(method, url, { token: studentToken, body });

// ---------------- Kelola mahasiswa (admin) ----------------

test('F-ADM-01 Tambah mahasiswa dengan data lengkap', { skip }, async () => {
  const res = await asAdmin('POST', '/students', MHS);
  assert.equal(res.status, 201);
  studentId = res.data.studentId;
  assert.ok(studentId);
});

test('F-ADM-02 Tambah mahasiswa dengan field wajib kosong ditolak', { skip }, async () => {
  const res = await asAdmin('POST', '/students', { ...MHS, email: 'lain@test.univ.edu', studentIdNumber: 'G1A099302', fullName: '' });
  assert.equal(res.status, 400);
});

test('F-ADM-03 Tambah mahasiswa dengan email yang sudah dipakai ditolak', { skip }, async () => {
  const res = await asAdmin('POST', '/students', { ...MHS, studentIdNumber: 'G1A099303' });
  assert.equal(res.status, 409);
});

test('F-ADM-04 Tambah mahasiswa dengan NIM yang sudah dipakai ditolak', { skip }, async () => {
  const res = await asAdmin('POST', '/students', { ...MHS, email: 'beda@test.univ.edu' });
  assert.equal(res.status, 409);
});

test('F-ADM-05 Daftar mahasiswa memuat mahasiswa baru', { skip }, async () => {
  const res = await asAdmin('GET', '/students');
  assert.equal(res.status, 200);
  assert.ok(res.data.students.some((s) => s.student_id_number === MHS.studentIdNumber));
});

test('F-ADM-06 Ubah data mahasiswa', { skip }, async () => {
  const res = await asAdmin('PUT', `/students/${studentId}`, { ...MHS, program: 'Sistem Informasi' });
  assert.equal(res.status, 200);
  const detail = await asAdmin('GET', `/students/${studentId}`);
  assert.equal(detail.data.student.program, 'Sistem Informasi');
});

test('F-ADM-07 Reset kata sandi mahasiswa oleh admin', { skip }, async () => {
  const res = await asAdmin('PUT', `/students/${studentId}/password`, { newPassword: 'sandibaru456' });
  assert.equal(res.status, 200);
  assert.equal(res.data.newPassword, 'sandibaru456');
  MHS.password = 'sandibaru456';
  studentToken = await srv.login(MHS.studentIdNumber, MHS.password, 'student');
});

test('F-ADM-08 Reset kata sandi tanpa isian membuat sandi acak 8 karakter', { skip }, async () => {
  const res = await asAdmin('PUT', `/students/${studentId}/password`, {});
  assert.equal(res.status, 200);
  assert.match(res.data.newPassword, /^[A-Za-z0-9]{8}$/);
  MHS.password = res.data.newPassword;
  studentToken = await srv.login(MHS.studentIdNumber, MHS.password, 'student');
});

// ---------------- Portal mahasiswa ----------------

test('F-MHS-01 Mahasiswa melihat profilnya sendiri', { skip }, async () => {
  const res = await asStudent('GET', '/student/me');
  assert.equal(res.status, 200);
  assert.equal(JSON.stringify(res.data).includes(MHS.studentIdNumber), true);
});

test('F-MHS-02 Ganti kata sandi: sandi lama salah ditolak', { skip }, async () => {
  const res = await asStudent('PUT', '/student/password', { currentPassword: 'salah', newPassword: 'sandiku789', confirmPassword: 'sandiku789' });
  assert.equal(res.status, 400);
});

test('F-MHS-03 Ganti kata sandi: konfirmasi tidak sama ditolak', { skip }, async () => {
  const res = await asStudent('PUT', '/student/password', { currentPassword: MHS.password, newPassword: 'sandiku789', confirmPassword: 'sandiku000' });
  assert.equal(res.status, 400);
});

test('F-MHS-04 Ganti kata sandi: kurang dari 6 karakter ditolak', { skip }, async () => {
  const res = await asStudent('PUT', '/student/password', { currentPassword: MHS.password, newPassword: '12345', confirmPassword: '12345' });
  assert.equal(res.status, 400);
});

test('F-MHS-05 Ganti kata sandi berhasil, sandi baru bisa dipakai masuk', { skip }, async () => {
  const res = await asStudent('PUT', '/student/password', { currentPassword: MHS.password, newPassword: 'sandiku789', confirmPassword: 'sandiku789' });
  assert.equal(res.status, 200);
  MHS.password = 'sandiku789';
  studentToken = await srv.login(MHS.studentIdNumber, MHS.password, 'student');
});

let requestA;
test('F-MHS-06 Ajukan permintaan transkrip', { skip }, async () => {
  const res = await asStudent('POST', '/student/transcript-requests', { purpose: 'Melamar kerja' });
  assert.equal(res.status, 201);
  requestA = res.data.requestId ?? res.data.id;
  assert.ok(requestA, JSON.stringify(res.data));
});

test('F-MHS-07 Permintaan kedua saat masih ada yang pending ditolak', { skip }, async () => {
  const res = await asStudent('POST', '/student/transcript-requests', { purpose: 'Beasiswa' });
  assert.equal(res.status, 400);
});

test('F-MHS-08 Batalkan permintaan yang masih pending', { skip }, async () => {
  const res = await asStudent('PATCH', `/student/transcript-requests/${requestA}/cancel`);
  assert.equal(res.status, 200);
  const list = await asStudent('GET', '/student/transcript-requests');
  const req = JSON.stringify(list.data);
  assert.ok(req.includes('cancelled'), req);
});

test('F-MHS-09 Permintaan yang sudah dibatalkan tidak bisa dibatalkan lagi', { skip }, async () => {
  const res = await asStudent('PATCH', `/student/transcript-requests/${requestA}/cancel`);
  assert.equal(res.status, 400);
});

// ---------------- Proses permintaan oleh admin ----------------

let requestB;
test('F-ADM-09 Admin melihat permintaan pending dan jumlahnya', { skip }, async () => {
  const created = await asStudent('POST', '/student/transcript-requests', { purpose: 'Beasiswa' });
  requestB = created.data.requestId ?? created.data.id;
  const count = await asAdmin('GET', '/admin/transcript-requests/pending-count');
  assert.equal(count.status, 200);
  assert.ok(JSON.stringify(count.data).match(/[1-9]/));
  const list = await asAdmin('GET', '/admin/transcript-requests');
  assert.ok(JSON.stringify(list.data).includes('Beasiswa'));
});

test('F-ADM-10 Tolak permintaan tanpa alasan ditolak', { skip }, async () => {
  const res = await asAdmin('PATCH', `/admin/transcript-requests/${requestB}/reject`, { reason: '  ' });
  assert.equal(res.status, 400);
});

test('F-ADM-11 Tolak permintaan dengan alasan', { skip }, async () => {
  const res = await asAdmin('PATCH', `/admin/transcript-requests/${requestB}/reject`, { reason: 'Nilai semester 8 belum lengkap' });
  assert.equal(res.status, 200);
  const again = await asAdmin('PATCH', `/admin/transcript-requests/${requestB}/reject`, { reason: 'lagi' });
  assert.equal(again.status, 400, 'permintaan yang sudah ditolak tidak bisa ditolak lagi');
});

let issuedId;
test('F-ADM-12 Terbitkan transkrip dari permintaan: permintaan otomatis selesai', { skip }, async () => {
  const created = await asStudent('POST', '/student/transcript-requests', { purpose: 'Melanjutkan S2' });
  const requestC = created.data.requestId ?? created.data.id;
  const res = await srv.api('POST', '/documents/issue', {
    token: adminToken,
    body: srv.pdfForm(fixture('asli', '09-putri-ayu-lestari.pdf'), { studentId, docType: 'transkrip', docTitle: 'Transkrip Akademik', requestId: requestC })
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  issuedId = res.data.verificationId;
  const [[row]] = await srv.pool.query('SELECT status, document_id FROM transcript_requests WHERE id = ?', [requestC]);
  assert.equal(row.status, 'issued');
  assert.ok(row.document_id);
});

test('F-MHS-10 Mahasiswa melihat dan mengunduh transkripnya dari portal', { skip }, async () => {
  const docs = await asStudent('GET', '/student/documents');
  assert.equal(docs.status, 200);
  const doc = (docs.data.documents || []).find((d) => d.verification_id === issuedId);
  assert.ok(doc, JSON.stringify(docs.data));
  const dl = await asStudent('GET', `/student/documents/${doc.id}/download`);
  assert.equal(dl.status, 200);
  assert.match(dl.headers.get('content-type'), /pdf/);
});

test('F-MHS-11 Mahasiswa tidak bisa mengunduh transkrip milik orang lain lewat portal', { skip }, async () => {
  const other = await asAdmin('POST', '/students', {
    email: 'lain2@test.univ.edu', password: 'sandiuji123', studentIdNumber: 'G1A099304',
    fullName: 'Mahasiswa Lain', faculty: 'Teknik', program: 'Informatika', graduationYear: 2026
  });
  const otherDoc = await srv.api('POST', '/documents/issue', {
    token: adminToken,
    body: srv.pdfForm(fixture('asli', '10-yoga-pratama-putra.pdf'), { studentId: other.data.studentId, docType: 'transkrip', docTitle: 'T' })
  });
  const [[row]] = await srv.pool.query('SELECT id FROM documents WHERE verification_id = ?', [otherDoc.data.verificationId]);
  const dl = await asStudent('GET', `/student/documents/${row.id}/download`);
  assert.equal(dl.status, 403);
});

test('F-ADM-13 Hapus mahasiswa', { skip }, async () => {
  const res = await asAdmin('DELETE', `/students/${studentId}`);
  assert.equal(res.status, 200);
  const login = await srv.api('POST', '/auth/login', { body: { identifier: MHS.studentIdNumber, password: MHS.password, role: 'student' } });
  assert.equal(login.status, 401, 'akun mahasiswa yang dihapus tidak bisa masuk lagi');
});
