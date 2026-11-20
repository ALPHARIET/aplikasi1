// Konsistensi antara database, berkas di disk, dan blockchain saat terjadi kegagalan atau penghapusan
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startTestServer, fixture, hasFixtures } = require('../helpers/testServer');
const { UPLOAD_DIR } = require('../../src/utils/uploadPath');
const blockchain = require('../../src/services/blockchainService');

const skip = hasFixtures() ? false : 'Fixture demo belum ada. Jalankan npm run seed:demo dulu.';

let srv;
let adminToken;
let nimSeq = 0;

const uploadsNow = () => new Set(fs.readdirSync(UPLOAD_DIR));
const newFiles = (before) => [...uploadsNow()].filter((f) => !before.has(f));

async function createStudent() {
  nimSeq += 1;
  const nim = `G1A0992${String(nimSeq).padStart(2, '0')}`;
  const res = await srv.api('POST', '/students', {
    token: adminToken,
    body: { email: `${nim.toLowerCase()}@test.univ.edu`, password: 'sandiuji123', studentIdNumber: nim, fullName: `Uji ${nim}`, faculty: 'Teknik', program: 'Informatika', graduationYear: 2026 }
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return res.data.studentId;
}

const issue = (studentId, file) => srv.api('POST', '/documents/issue', {
  token: adminToken,
  body: srv.pdfForm(file, { studentId, docType: 'transkrip', docTitle: 'Transkrip Akademik' })
});

before(async () => {
  if (skip) return;
  srv = await startTestServer();
  adminToken = await srv.login(srv.admin.email, srv.admin.password, 'admin');
});
after(async () => { await srv?.close(); });

test('verifikasi berkas: dokumen aktif di blockchain tapi barisnya hilang dari database tidak membuat server error', { skip }, async () => {
  const studentId = await createStudent();
  const issued = await issue(studentId, fixture('asli', '04-fajar-ramadhan.pdf'));
  assert.equal(issued.status, 201);
  const [[row]] = await srv.pool.query('SELECT file_path FROM documents WHERE verification_id = ?', [issued.data.verificationId]);
  await srv.pool.query('DELETE FROM documents WHERE verification_id = ?', [issued.data.verificationId]);
  fs.unlinkSync(path.join(UPLOAD_DIR, row.file_path));

  // Berkas asli tetap terbukti cocok dengan blockchain
  const asli = await srv.api('POST', '/documents/verify-file', {
    body: srv.pdfForm(fixture('asli', '04-fajar-ramadhan.pdf'), { verificationId: issued.data.verificationId })
  });
  assert.equal(asli.status, 200);
  assert.equal(asli.data.isValid, true);
  assert.equal(asli.data.documentInfo, null);

  // Berkas palsu dinyatakan tidak cocok, tanpa perbandingan per-field karena berkas asli tidak ada
  const palsu = await srv.api('POST', '/documents/verify-file', {
    body: srv.pdfForm(fixture('palsu', '04-fajar-ramadhan-palsu.pdf'), { verificationId: issued.data.verificationId })
  });
  assert.equal(palsu.status, 200, JSON.stringify(palsu.data));
  assert.equal(palsu.data.isValid, false);
  assert.equal(palsu.data.message, 'Document has been modified or is fake. Hash does not match.');
  assert.equal(palsu.data.documentInfo, null);
  assert.equal(palsu.data.comparison.supported, false);
});

test('terbit: kalau pencatatan ke blockchain gagal, baris pending dan berkasnya tidak tertinggal', { skip }, async (t) => {
  const studentId = await createStudent();
  t.mock.method(blockchain, 'issueDocument', async () => { throw new Error('RPC tidak bisa dihubungi'); });

  const before = uploadsNow();
  const res = await issue(studentId, fixture('asli', '05-nadia-kartika-putri.pdf'));
  assert.equal(res.status, 500);
  assert.equal(res.data.error, 'RPC tidak bisa dihubungi');

  const [rows] = await srv.pool.query('SELECT id FROM documents WHERE student_id = ?', [studentId]);
  assert.deepEqual(rows, [], 'baris dokumen pending tertinggal');
  assert.deepEqual(newFiles(before), [], 'berkas unggahan tertinggal');
});

test('terbit: permintaan transkrip tetap pending kalau blockchain gagal', { skip }, async (t) => {
  const studentId = await createStudent();
  const [ins] = await srv.pool.query(
    "INSERT INTO transcript_requests (student_id, purpose, status) VALUES (?, 'Uji', 'pending')", [studentId]
  );
  t.mock.method(blockchain, 'issueDocument', async () => { throw new Error('gagal'); });

  const res = await srv.api('POST', '/documents/issue', {
    token: adminToken,
    body: srv.pdfForm(fixture('asli', '05-nadia-kartika-putri.pdf'), { studentId, docType: 'transkrip', docTitle: 'T', requestId: ins.insertId })
  });
  assert.equal(res.status, 500);
  const [[req]] = await srv.pool.query('SELECT status, document_id FROM transcript_requests WHERE id = ?', [ins.insertId]);
  assert.equal(req.status, 'pending');
  assert.equal(req.document_id, null);
});

test('hapus mahasiswa: transkrip aktifnya dicabut di blockchain dan berkasnya dihapus', { skip }, async () => {
  const studentId = await createStudent();
  const issued = await issue(studentId, fixture('asli', '06-bagas-saputra.pdf'));
  assert.equal(issued.status, 201);
  const id = issued.data.verificationId;
  const [[row]] = await srv.pool.query('SELECT file_path FROM documents WHERE verification_id = ?', [id]);
  assert.equal(await blockchain.isDocumentValid(id), true);

  const del = await srv.api('DELETE', `/students/${studentId}`, { token: adminToken });
  assert.equal(del.status, 200, JSON.stringify(del.data));

  assert.equal(await blockchain.isDocumentValid(id), false, 'dokumen masih aktif di blockchain');
  assert.equal(fs.existsSync(path.join(UPLOAD_DIR, row.file_path)), false, 'berkas transkrip tertinggal');
  const [rows] = await srv.pool.query('SELECT id FROM documents WHERE student_id = ?', [studentId]);
  assert.deepEqual(rows, []);
});

test('hapus mahasiswa: dokumen yang sudah dicabut tidak dicabut ulang', { skip }, async () => {
  const studentId = await createStudent();
  const issued = await issue(studentId, fixture('asli', '07-aulia-rahmawati.pdf'));
  const id = issued.data.verificationId;
  const revoked = await srv.api('POST', `/documents/revoke/${id}`, { token: adminToken, body: { reason: 'Salah cetak' } });
  assert.equal(revoked.status, 200);

  const del = await srv.api('DELETE', `/students/${studentId}`, { token: adminToken });
  assert.equal(del.status, 200, JSON.stringify(del.data));
});

test('hapus mahasiswa: kalau pencabutan di blockchain gagal, mahasiswa dan dokumennya tidak dihapus', { skip }, async (t) => {
  const studentId = await createStudent();
  const issued = await issue(studentId, fixture('asli', '08-rizky-maulana-hakim.pdf'));
  assert.equal(issued.status, 201);
  t.mock.method(blockchain, 'revokeDocument', async () => { throw new Error('RPC tidak bisa dihubungi'); });

  const del = await srv.api('DELETE', `/students/${studentId}`, { token: adminToken });
  assert.equal(del.status, 500);

  const [students] = await srv.pool.query('SELECT id FROM students WHERE id = ?', [studentId]);
  assert.equal(students.length, 1, 'mahasiswa terhapus walau dokumennya masih aktif di blockchain');
  const [[doc]] = await srv.pool.query('SELECT status FROM documents WHERE verification_id = ?', [issued.data.verificationId]);
  assert.equal(doc.status, 'issued');
});

test('hapus mahasiswa: mahasiswa tanpa dokumen tetap bisa dihapus, dan yang tidak ada 404', { skip }, async () => {
  const studentId = await createStudent();
  assert.equal((await srv.api('DELETE', `/students/${studentId}`, { token: adminToken })).status, 200);
  assert.equal((await srv.api('DELETE', `/students/${studentId}`, { token: adminToken })).status, 404);
});
