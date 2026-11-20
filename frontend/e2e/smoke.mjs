// Test asap E2E lewat Chrome headless (Chrome DevTools Protocol), tanpa dependensi tambahan.
//
// Prasyarat: frontend (npm run dev, :5173), backend (:5000), Hardhat node, dan data demo
// (npm run seed:demo di backend). Jalankan: npm run test:e2e
// Lokasi Chrome bisa diganti lewat variabel CHROME_PATH.
//
// Yang diperiksa:
//  1. Beranda: demo "ubah nilai" mengubah status menjadi tidak cocok
//  2. Verifikasi: berkas asli cocok, berkas palsu ditandai berubah
//  3. Login: akun admin di tab Mahasiswa ditolak, tombol pindah tab lalu masuk ke /admin
//  4. Terbitkan dokumen: terbit, modal duplikat (batal), cabut & terbitkan ulang
// Data uji di langkah 4 (mahasiswa dan dokumennya) dihapus lagi di akhir.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
const API = process.env.API_URL || 'http://localhost:5000/api/v1';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEMO_DIR = path.resolve(HERE, '../../backend/database/seeds/demo-transcripts');
const ADMIN = { email: 'admin@univ.edu', password: 'adminpassword123' };
const PORT = 9400 + Math.floor(Math.random() * 400);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? `  (${detail})` : ''}`);
};

// ---------- API helper (persiapan dan bersih-bersih data uji) ----------
async function api(method, url, token, body) {
  const res = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

// ---------- Chrome ----------
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); }
  catch { await sleep(200); }
}
if (!target) throw new Error(`Chrome tidak bisa dijalankan dari ${CHROME}`);

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const pageErrors = [];
const dialogs = [];
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description?.slice(0, 200));
  if (m.method === 'Page.javascriptDialogOpening') {
    // alert() di halaman admin berarti ada galat; catat lalu tutup supaya halaman tidak macet
    dialogs.push(m.params.message);
    send('Page.handleJavaScriptDialog', { accept: true });
  }
});
await send('Runtime.enable');
await send('Page.enable');
await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const evaluate = async (expression) => {
  const r = (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result;
  if (r.exceptionDetails) throw new Error(`${expression.slice(0, 80)}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
};
const goto = async (url) => { await send('Page.navigate', { url: FRONTEND + url }); await sleep(1500); };
const waitFor = async (expression, timeout = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression).catch(() => false)) return true;
    await sleep(150);
  }
  return false;
};
const bodyHas = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
const clickButton = (text) => evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((el) => el.innerText.trim().includes(${JSON.stringify(text)}));
  if (!b) throw new Error('Tombol tidak ditemukan: ' + ${JSON.stringify(text)});
  b.click(); return true;
})()`);
// Isi input/select lewat setter bawaan supaya state React ikut berubah
const setValue = (selector, value) => evaluate(`(() => {
  const el = ${selector};
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(String(value))});
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  return true;
})()`);
const setFile = async (cssSelector, filePath) => {
  const { result: { root } } = await send('DOM.getDocument', { depth: 0 });
  const { result: { nodeId } } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: cssSelector });
  if (!nodeId) throw new Error(`Input berkas tidak ditemukan: ${cssSelector}`);
  await send('DOM.setFileInputFiles', { nodeId, files: [filePath] });
};

let adminToken;
let e2eStudentId;
try {
  // ---------- 1. Beranda ----------
  await goto('/');
  await evaluate(`document.querySelectorAll('#coba input[type=checkbox]').forEach((c) => c.click()); true`);
  await sleep(300);
  const status = await evaluate(`document.querySelector('#coba [role=status]').textContent`);
  check('Beranda: demo ubah nilai menjadi tidak cocok', status.includes('Tidak cocok'), status.slice(0, 40));

  // ---------- 2. Verifikasi ----------
  const daftar = fs.readFileSync(path.join(DEMO_DIR, 'DAFTAR-VERIFICATION-ID.txt'), 'utf8');
  const rinaId = daftar.match(/01\. Rina[\s\S]*?Verification ID : (\S+)/)[1];
  for (const [kind, file, expected] of [
    ['asli', 'asli/01-rina-puspita-sari.pdf', 'Transkrip asli'],
    ['palsu', 'palsu/01-rina-puspita-sari-palsu.pdf', 'Berkas sudah diubah'],
  ]) {
    await goto(`/verify/${rinaId}`);
    await setFile('#document-file', path.join(DEMO_DIR, file));
    await sleep(200);
    await evaluate(`document.querySelector('form button[type=submit]').click(); true`);
    check(`Verifikasi: berkas ${kind} → "${expected}"`, await waitFor(bodyHas(expected), 20000));
  }

  // ---------- 3. Login ----------
  await goto('/login');
  await setValue(`document.querySelector('#login-nim')`, ADMIN.email);
  await setValue(`document.querySelector('#login-password')`, ADMIN.password);
  await evaluate(`document.querySelector('form button[type=submit]').click(); true`);
  check('Login: admin di tab Mahasiswa ditolak', await waitFor(bodyHas('Ini akun administrator, bukan akun mahasiswa.')));
  await clickButton('Pindah ke tab Administrator');
  await sleep(200);
  await evaluate(`document.querySelector('form button[type=submit]').click(); true`);
  check('Login: setelah pindah tab, admin masuk ke /admin', await waitFor(`location.pathname.startsWith('/admin')`));

  // ---------- 4. Terbitkan dokumen ----------
  adminToken = (await api('POST', '/auth/login', null, { identifier: ADMIN.email, password: ADMIN.password, role: 'admin' })).data.token;
  const nim = `E2E${Date.now().toString().slice(-7)}`;
  const created = await api('POST', '/students', adminToken, {
    email: `${nim.toLowerCase()}@e2e.test`, password: 'sandie2e123', studentIdNumber: nim,
    fullName: 'Mahasiswa E2E', faculty: 'Teknik', program: 'Informatika', graduationYear: 2026,
  });
  e2eStudentId = created.data.studentId;

  const fillIssueForm = async () => {
    await goto('/admin/issue');
    await waitFor(`[...document.querySelectorAll('select')[0].options].some((o) => o.value === '${e2eStudentId}')`);
    await setValue(`document.querySelectorAll('select')[0]`, e2eStudentId);
    await setFile('#file-upload-input', path.join(DEMO_DIR, 'asli/03-salsabila-nur-azizah.pdf'));
    await sleep(300);
  };
  const issuedId = () => evaluate(`(document.body.innerText.match(/DOC-\\d{4}-[A-Z0-9]{5}-[A-Z0-9]{5}/) || [])[0] || null`);

  await fillIssueForm();
  const title = await evaluate(`[...document.querySelectorAll('input')].find((i) => i.placeholder === 'Contoh: Transkrip Nilai Akademik').value`);
  check('Terbitkan: judul terisi otomatis setelah memilih berkas', title === 'Transkrip Nilai Akademik', title);
  check('Terbitkan: ringkasan menampilkan mahasiswa terpilih', await evaluate(bodyHas('Mahasiswa E2E')));
  await clickButton('Terbitkan Dokumen');
  const firstOk = await waitFor(bodyHas('Dokumen Berhasil Diterbitkan ke Blockchain!'), 20000);
  const firstId = await issuedId();
  check('Terbitkan: dokumen pertama terbit dan Verification ID tampil', firstOk && !!firstId, firstId || '');

  await fillIssueForm();
  await clickButton('Terbitkan Dokumen');
  check('Terbitkan: modal duplikat muncul untuk mahasiswa yang sudah punya transkrip',
    await waitFor(bodyHas('Mahasiswa Sudah Memiliki Transkrip Aktif')));
  check('Terbitkan: modal menampilkan dokumen yang sudah ada', await evaluate(bodyHas(firstId)));
  await clickButton('Batalkan Penerbitan');
  await sleep(300);
  check('Terbitkan: batal menutup modal tanpa menerbitkan',
    !(await evaluate(bodyHas('Mahasiswa Sudah Memiliki Transkrip Aktif'))) && !(await evaluate(bodyHas('Dokumen Berhasil Diterbitkan'))));

  await clickButton('Terbitkan Dokumen');
  await waitFor(bodyHas('Mahasiswa Sudah Memiliki Transkrip Aktif'));
  await clickButton('Cabut Dokumen Lama & Terbitkan yang Baru');
  const secondOk = await waitFor(bodyHas('Dokumen Berhasil Diterbitkan ke Blockchain!'), 20000);
  const secondId = await issuedId();
  check('Terbitkan: cabut & terbitkan ulang menghasilkan Verification ID baru', secondOk && !!secondId && secondId !== firstId, secondId || '');
  const old = await api('GET', `/documents/verify/${firstId}`);
  check('Terbitkan: dokumen lama tercatat dicabut', old.data?.status === 'revoked');

  check('Tidak ada alert() galat di halaman', dialogs.length === 0, dialogs.join(' | '));
  check('Tidak ada error JavaScript di halaman', pageErrors.length === 0, pageErrors.join(' | '));
} catch (err) {
  check(`Skrip berhenti: ${err.message}`, false);
} finally {
  // Bersihkan data uji: cabut dokumen yang masih aktif, hapus dokumen (beserta berkasnya), hapus mahasiswa
  if (adminToken && e2eStudentId) {
    const docs = (await api('GET', '/documents', adminToken)).data?.documents || [];
    for (const d of docs.filter((x) => String(x.student_id) === String(e2eStudentId))) {
      if (d.status !== 'revoked') await api('POST', `/documents/revoke/${d.verification_id}`, adminToken, { reason: 'Data uji E2E' });
      await api('DELETE', `/documents/${d.id}`, adminToken);
    }
    await api('DELETE', `/students/${e2eStudentId}`, adminToken);
  }
  ws.close();
  chrome.kill();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
