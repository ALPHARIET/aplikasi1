// Uji regresi keamanan: setiap test menjaga satu perbaikan dari audit keamanan (S-xx di laporan).
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { startTestServer, fixture, hasFixtures } = require('../helpers/testServer');
const { UPLOAD_DIR } = require('../../src/utils/uploadPath');
const UserModel = require('../../src/models/userModel');

const skip = hasFixtures() ? false : 'Fixture demo belum ada. Jalankan npm run seed:demo dulu.';

let srv;
let adminToken;
let seq = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uploadsNow = () => new Set(fs.readdirSync(UPLOAD_DIR));
const newFiles = (before) => [...uploadsNow()].filter((f) => !before.has(f));

async function createStudent(password = 'sandiuji123') {
  seq += 1;
  const nim = `G1A0997${String(seq).padStart(2, '0')}`;
  const res = await srv.api('POST', '/students', {
    token: adminToken,
    body: { email: `${nim.toLowerCase()}@sec.univ.edu`, password, studentIdNumber: nim, fullName: `Keamanan ${nim}`, faculty: 'Teknik', program: 'Informatika', graduationYear: 2026 }
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return { id: res.data.studentId, nim, password };
}

const loginRaw = (identifier, password, role) => srv.api('POST', '/auth/login', { body: { identifier, password, role } });

const upload = (name, content, type) => {
  const form = new FormData();
  form.append('verificationId', 'DOC-2026-AAAAA-BBBBB');
  form.append('document', new Blob([content], { type }), name);
  return srv.api('POST', '/documents/verify-file', { body: form });
};

before(async () => {
  if (skip) return;
  srv = await startTestServer();
  adminToken = await srv.login(srv.admin.email, srv.admin.password, 'admin');
});
after(async () => { await srv?.close(); });
beforeEach(() => srv?.clearEvidence());
afterEach((t) => srv?.recordEvidence(t));

// ---------- Kontrol akses ----------

test('S-06 mahasiswa tidak bisa membaca data mahasiswa lain lewat GET /students/:id', { skip }, async () => {
  const a = await createStudent();
  const b = await createStudent();
  const tokA = await srv.login(a.nim, a.password, 'student');
  const res = await srv.api('GET', `/students/${b.id}`, { token: tokA });
  assert.equal(res.status, 403);
  assert.equal(JSON.stringify(res.data).includes('@sec.univ.edu'), false);
  // Admin tetap bisa
  assert.equal((await srv.api('GET', `/students/${b.id}`, { token: adminToken })).status, 200);
});

// ---------- Brute force login ----------

test('S-15 login ditahan setelah 10 kata sandi salah untuk akun yang sama', { skip }, async () => {
  const s = await createStudent();
  for (let i = 0; i < 10; i++) assert.equal((await loginRaw(s.nim, `tebak${i}`)).status, 401);
  const locked = await loginRaw(s.nim, 'tebak10');
  assert.equal(locked.status, 429);
  assert.equal(locked.data.code, 'LOGIN_LOCKED');
  assert.ok(Number(locked.headers.get('retry-after')) > 0);
  // Kata sandi yang benar pun ditahan selama masa tunggu, jadi penebak tidak bisa memastikan tebakannya
  assert.equal((await loginRaw(s.nim, s.password)).status, 429);
  // Akun lain tidak ikut tertahan
  assert.equal((await loginRaw(srv.admin.email, srv.admin.password, 'admin')).status, 200);
});

test('S-15b login yang berhasil menghapus hitungan kata sandi salah', { skip }, async () => {
  const s = await createStudent();
  for (let i = 0; i < 9; i++) await loginRaw(s.nim, `salah${i}`);
  assert.equal((await loginRaw(s.nim, s.password)).status, 200);
  for (let i = 0; i < 9; i++) assert.equal((await loginRaw(s.nim, `salah${i}`)).status, 401);
  assert.equal((await loginRaw(s.nim, s.password)).status, 200);
});

test('S-17 akun tidak dikenal dan kata sandi salah: pesan dan waktu respons setara', { skip }, async () => {
  const s = await createStudent();
  const time = async (identifier) => {
    const t0 = performance.now();
    const res = await loginRaw(identifier, 'bukan-sandinya');
    return { ms: performance.now() - t0, res };
  };
  const unknown = []; const wrong = [];
  for (let i = 0; i < 4; i++) {
    unknown.push(await time(`tidak.ada.${i}@sec.univ.edu`));
    wrong.push(await time(s.nim));
  }
  assert.deepEqual(unknown[0].res.data, wrong[0].res.data);
  const median = (xs) => xs.map((x) => x.ms).sort((p, q) => p - q)[Math.floor(xs.length / 2)];
  // Sebelum perbaikan akun tidak dikenal dijawab tanpa bcrypt (sekitar 30x lebih cepat)
  assert.ok(median(unknown) > median(wrong) * 0.5, `tidak dikenal ${median(unknown).toFixed(1)} ms vs salah ${median(wrong).toFixed(1)} ms`);
});

// ---------- Kebijakan kata sandi ----------

test('S-16 kata sandi kurang dari 8 karakter ditolak di semua jalur', { skip }, async () => {
  const create = await srv.api('POST', '/students', {
    token: adminToken,
    body: { email: 'pendek@sec.univ.edu', password: '1234567', studentIdNumber: 'G1A099799', fullName: 'Sandi Pendek', faculty: 'Teknik' }
  });
  assert.equal(create.status, 400);
  const register = await srv.api('POST', '/auth/register', { token: adminToken, body: { name: 'x', email: 'adm2@sec.univ.edu', password: '1', role: 'admin' } });
  assert.equal(register.status, 400);
  const s = await createStudent();
  const reset = await srv.api('PUT', `/students/${s.id}/password`, { token: adminToken, body: { newPassword: 'abc' } });
  assert.equal(reset.status, 400);
});

// ---------- Sesi berakhir setelah ganti sandi / akun dihapus ----------

test('S-35 token lama ditolak setelah mahasiswa mengganti kata sandi', { skip }, async () => {
  const s = await createStudent();
  const oldToken = await srv.login(s.nim, s.password, 'student');
  await sleep(1100); // iat token berpresisi detik
  const changed = await srv.api('PUT', '/student/password', { token: oldToken, body: { currentPassword: s.password, newPassword: 'sandibaru999', confirmPassword: 'sandibaru999' } });
  assert.equal(changed.status, 200);
  const reuse = await srv.api('GET', '/student/me', { token: oldToken });
  assert.equal(reuse.status, 401);
  assert.equal(reuse.data.code, 'SESSION_INVALID');
  const fresh = await srv.login(s.nim, 'sandibaru999', 'student');
  assert.equal((await srv.api('GET', '/student/me', { token: fresh })).status, 200);
});

test('S-36 token lama ditolak setelah admin mereset kata sandi', { skip }, async () => {
  const s = await createStudent();
  const oldToken = await srv.login(s.nim, s.password, 'student');
  await sleep(1100);
  assert.equal((await srv.api('PUT', `/students/${s.id}/password`, { token: adminToken, body: {} })).status, 200);
  assert.equal((await srv.api('GET', '/student/me', { token: oldToken })).status, 401);
});

test('S-37 token mahasiswa yang sudah dihapus tidak berlaku lagi', { skip }, async () => {
  const s = await createStudent();
  const token = await srv.login(s.nim, s.password, 'student');
  assert.equal((await srv.api('DELETE', `/students/${s.id}`, { token: adminToken })).status, 200);
  const res = await srv.api('GET', '/student/me', { token });
  assert.equal(res.status, 401);
});

// ---------- Unggah berkas ----------

test('S-23 berkas yang isinya bukan PDF ditolak walau mengaku application/pdf', { skip }, async () => {
  const before = uploadsNow();
  const res = await upload('bukan-pdf.pdf', '<html><script>alert(1)</script></html>', 'application/pdf');
  assert.equal(res.status, 400);
  assert.match(res.data.error, /tidak sesuai jenisnya/);
  assert.deepEqual(newFiles(before), [], 'berkas palsu tertinggal di uploads');
  // PNG asli yang diberi nama .pdf juga ditolak
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  assert.equal((await upload('gambar.pdf', png, 'application/pdf')).status, 400);
});

test('S-23b PDF asli tetap diterima', { skip }, async () => {
  const res = await upload('asli.pdf', fs.readFileSync(fixture('asli', '01-rina-puspita-sari.pdf')), 'application/pdf');
  // Lolos pemeriksaan isi dan sampai ke pengecekan blockchain; ID-nya memang tidak terdaftar
  assert.notEqual(res.status, 400, JSON.stringify(res.data));
  assert.equal(res.data.isValid, false);
  assert.match(res.data.message, /not registered/i);
});

test('S-24 berkas lebih dari 5 MB ditolak 413 tanpa pesan internal', { skip }, async () => {
  const before = uploadsNow();
  const res = await upload('besar.pdf', Buffer.alloc(5 * 1024 * 1024 + 1), 'application/pdf');
  assert.equal(res.status, 413);
  assert.match(res.data.error, /5 MB/);
  assert.equal('message' in res.data, false);
  assert.deepEqual(newFiles(before), []);
});

test('S-25 jenis berkas yang tidak diizinkan ditolak 400', { skip }, async () => {
  const res = await upload('a.txt', 'halo', 'text/plain');
  assert.equal(res.status, 400);
  assert.match(res.data.error, /PDF, JPG, atau PNG/);
});

// ---------- Penanganan galat ----------

test('S-38 JSON rusak dijawab 400, rute tak dikenal 404, galat server tidak membocorkan detail', { skip }, async (t) => {
  const bad = await fetch(`${srv.baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"identifier":' });
  assert.equal(bad.status, 400);
  assert.equal((await srv.api('GET', '/tidak-ada')).status, 404);

  t.mock.method(UserModel, 'findAuthState', async () => { throw new Error('ECONNREFUSED 127.0.0.1:3306 detail rahasia'); });
  const res = await srv.api('GET', '/documents', { token: adminToken });
  assert.equal(res.status, 500);
  assert.equal(JSON.stringify(res.data).includes('ECONNREFUSED'), false);
});

// ---------- Header HTTP dan CORS ----------

test('S-26 CORS hanya mengizinkan origin frontend', { skip }, async () => {
  const evil = await fetch(`${srv.baseUrl}/documents/verify/x`, { headers: { Origin: 'https://situs-jahat.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  const ok = await fetch(`${srv.baseUrl}/documents/verify/x`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const preflight = await fetch(`${srv.baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' }
  });
  assert.equal(preflight.status, 204);
});

test('S-27/S-28 header keamanan ada dan X-Powered-By hilang', { skip }, async () => {
  const res = await fetch(`${srv.baseUrl}/documents/verify/x`);
  assert.equal(res.headers.get('x-powered-by'), null);
  for (const h of ['x-content-type-options', 'x-frame-options', 'content-security-policy', 'strict-transport-security']) {
    assert.ok(res.headers.get(h), `header ${h} tidak ada`);
  }
});
