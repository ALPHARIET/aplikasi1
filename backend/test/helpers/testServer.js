// Jalankan app Express di port acak dengan database test.
// Butuh MySQL dan Hardhat node (npx hardhat node + deploy) yang sedang menyala.
const fs = require('fs');
const path = require('path');
const { TEST_DB_NAME, ADMIN, resetTestDb } = require('./testDb');

// Harus diatur sebelum src/config/database.js dimuat: pool langsung dibuat saat require.
// dotenv tidak menimpa variabel yang sudah ada, jadi nilai ini yang dipakai.
process.env.DB_NAME = TEST_DB_NAME;

const FIXTURE_DIR = path.join(__dirname, '../../database/seeds/demo-transcripts');
const fixture = (kind, name) => path.join(FIXTURE_DIR, kind, name);
const hasFixtures = () => fs.existsSync(path.join(FIXTURE_DIR, 'asli'));

async function waitFor(check, label, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Menunggu ${label} terlalu lama. Pastikan layanannya menyala.`);
}

async function startTestServer() {
  await resetTestDb();

  const app = require('../../src/app');
  const pool = require('../../src/config/database');
  const blockchain = require('../../src/services/blockchainService');
  const { UPLOAD_DIR } = require('../../src/utils/uploadPath');

  await waitFor(() => blockchain.initialized, 'Blockchain Service (Hardhat node)');
  await blockchain.provider.getBlockNumber(); // gagal cepat kalau node tidak bisa dihubungi

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  // Mode bukti (TEST_EVIDENCE=1): setiap panggilan API dicatat, lalu ditulis sebagai
  // diagnostik TAP pada test yang memanggilnya (lihat recordEvidence). Token dipendekkan.
  const calls = [];
  const describeBody = (body) => {
    if (body instanceof FormData) {
      return Object.fromEntries([...body.entries()].map(([k, v]) =>
        [k, typeof v === 'string' ? v : `[berkas ${v.name}, ${v.size} byte, ${v.type}]`]));
    }
    if (body && typeof body === 'object' && 'password' in body) return { ...body, password: '***' };
    return body ?? null;
  };

  // Panggil API; body berupa objek (JSON) atau FormData (unggah berkas)
  async function api(method, url, { token, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(baseUrl + url, { method, headers, body: payload });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (process.env.TEST_EVIDENCE) {
      calls.push({
        request: `${method} /api/v1${url}`,
        auth: token ? `${token.slice(0, 12)}…` : null,
        body: describeBody(body),
        status: res.status,
        response: typeof data === 'string' ? `[${res.headers.get('content-type')}, ${text.length} byte]` : JSON.stringify(data).slice(0, 400)
      });
    }
    return { status: res.status, data, headers: res.headers };
  }

  // Dipanggil dari beforeEach: buang catatan panggilan dari setup (before) atau test sebelumnya
  function clearEvidence() {
    calls.length = 0;
  }

  // Dipanggil dari afterEach: tulis panggilan API test yang baru selesai sebagai diagnostik
  function recordEvidence(t) {
    for (const call of calls.splice(0)) t.diagnostic(`bukti ${JSON.stringify(call)}`);
  }

  async function login(identifier, password, role) {
    const res = await api('POST', '/auth/login', { body: { identifier, password, role } });
    if (res.status !== 200) throw new Error(`Login ${identifier} gagal: ${res.status} ${JSON.stringify(res.data)}`);
    return res.data.token;
  }

  const pdfForm = (filePath, fields = {}) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
    form.append('document', new Blob([fs.readFileSync(filePath)], { type: 'application/pdf' }), path.basename(filePath));
    return form;
  };

  async function close() {
    // Hapus berkas PDF yang diterbitkan selama test dari folder uploads
    const [rows] = await pool.query('SELECT file_path FROM documents');
    for (const { file_path: stored } of rows) {
      const onDisk = path.join(UPLOAD_DIR, path.basename(String(stored)));
      if (fs.existsSync(onDisk)) fs.unlinkSync(onDisk);
    }
    await new Promise((r) => server.close(r));
    await pool.end();
    blockchain.provider?.destroy();
  }

  return { baseUrl, api, login, pdfForm, pool, close, clearEvidence, recordEvidence, admin: ADMIN };
}

module.exports = { startTestServer, fixture, hasFixtures };
