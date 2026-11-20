// Login, pengecekan tab peran, dan pendaftaran akun yang hanya boleh oleh admin
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers/testServer');

let srv;
let adminToken;
const STUDENT = {
  email: 'uji.001@test.univ.edu',
  password: 'sandiuji123',
  studentIdNumber: 'G1A099001',
  fullName: 'Mahasiswa Uji',
  faculty: 'Teknik',
  program: 'Informatika',
  graduationYear: 2026
};

before(async () => {
  srv = await startTestServer();
  adminToken = await srv.login(srv.admin.email, srv.admin.password, 'admin');
  const created = await srv.api('POST', '/students', { token: adminToken, body: STUDENT });
  assert.equal(created.status, 201, JSON.stringify(created.data));
});
after(async () => { await srv?.close(); });
beforeEach(() => srv?.clearEvidence());
afterEach((t) => srv?.recordEvidence(t));

const login = (body) => srv.api('POST', '/auth/login', { body });

test('admin masuk dari tab Administrator', async () => {
  const res = await login({ identifier: srv.admin.email, password: srv.admin.password, role: 'admin' });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.role, 'admin');
  assert.ok(res.data.token);
});

test('mahasiswa masuk dengan NIM dari tab Mahasiswa', async () => {
  const res = await login({ identifier: STUDENT.studentIdNumber, password: STUDENT.password, role: 'student' });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.role, 'student');
});

test('mahasiswa juga bisa masuk dengan email', async () => {
  const res = await login({ identifier: STUDENT.email, password: STUDENT.password, role: 'student' });
  assert.equal(res.status, 200);
});

test('akun admin ditolak di tab Mahasiswa', async () => {
  const res = await login({ identifier: srv.admin.email, password: srv.admin.password, role: 'student' });
  assert.equal(res.status, 403);
  assert.equal(res.data.code, 'ROLE_MISMATCH');
  assert.equal(res.data.actualRole, 'admin');
  assert.equal(res.data.token, undefined);
});

test('akun mahasiswa ditolak di tab Administrator', async () => {
  const res = await login({ identifier: STUDENT.studentIdNumber, password: STUDENT.password, role: 'admin' });
  assert.equal(res.status, 403);
  assert.equal(res.data.actualRole, 'student');
});

test('peran tidak dicek sebelum kata sandi benar (tidak membocorkan peran)', async () => {
  const res = await login({ identifier: srv.admin.email, password: 'salah', role: 'student' });
  assert.equal(res.status, 401);
  assert.equal(res.data.code, undefined);
});

test('kata sandi salah dan akun tidak dikenal sama-sama 401', async () => {
  assert.equal((await login({ identifier: srv.admin.email, password: 'salah' })).status, 401);
  assert.equal((await login({ identifier: 'G1A000000', password: 'apa saja' })).status, 401);
});

test('login tanpa role tetap diterima (pemanggil lama)', async () => {
  const res = await login({ identifier: srv.admin.email, password: srv.admin.password });
  assert.equal(res.status, 200);
});

test('role selain admin/student ditolak', async () => {
  const res = await login({ identifier: srv.admin.email, password: srv.admin.password, role: 'superuser' });
  assert.equal(res.status, 400);
});

test('identitas atau kata sandi kosong ditolak', async () => {
  assert.equal((await login({ identifier: '', password: 'x' })).status, 400);
  assert.equal((await login({ identifier: 'x' })).status, 400);
});

// Pengguna yang masuk dengan benar tidak pernah tertahan; penahan hanya menghitung sandi salah
// (lihat security.test.js S-15 untuk sisi penahanannya)
test('login berulang dengan sandi benar tidak pernah diblokir', async () => {
  for (let i = 0; i < 25; i++) {
    const res = await login({ identifier: srv.admin.email, password: srv.admin.password });
    assert.equal(res.status, 200);
  }
});

test('salah ketik sandi beberapa kali lalu benar tetap bisa masuk', async () => {
  for (let i = 0; i < 9; i++) {
    assert.equal((await login({ identifier: srv.admin.email, password: 'salah' })).status, 401);
  }
  assert.equal((await login({ identifier: srv.admin.email, password: srv.admin.password })).status, 200);
});

test('/register tanpa token ditolak', async () => {
  const res = await srv.api('POST', '/auth/register', {
    body: { name: 'Penyusup', email: 'x@x.com', password: 'x', role: 'admin' }
  });
  assert.equal(res.status, 401);
});

test('/register dengan token mahasiswa ditolak', async () => {
  const token = await srv.login(STUDENT.studentIdNumber, STUDENT.password, 'student');
  const res = await srv.api('POST', '/auth/register', {
    token,
    body: { name: 'Penyusup', email: 'y@y.com', password: 'x', role: 'admin' }
  });
  assert.equal(res.status, 403);
});

test('/register oleh admin menolak role yang tidak dikenal', async () => {
  const res = await srv.api('POST', '/auth/register', {
    token: adminToken,
    body: { name: 'Uji', email: 'z@z.com', password: 'sandi123', role: 'root' }
  });
  assert.equal(res.status, 400);
});

test('/profile mengembalikan pengguna sesuai token', async () => {
  const res = await srv.api('GET', '/auth/profile', { token: adminToken });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.email, srv.admin.email);
});

test('token palsu ditolak', async () => {
  const res = await srv.api('GET', '/auth/profile', { token: 'bukan.token.asli' });
  assert.ok([401, 403].includes(res.status), `status ${res.status}`);
});
