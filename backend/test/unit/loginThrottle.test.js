// Penahan tebak kata sandi: dihitung hanya dari login gagal, dan lepas setelah jendela waktu habis
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createLoginThrottle } = require('../../src/middleware/loginThrottle');

// Simulasikan satu permintaan login yang dijawab dengan status tertentu
function attempt(throttle, identifier, status, ip = '10.0.0.1') {
  const res = new EventEmitter();
  res.headers = {};
  res.set = (k, v) => { res.headers[k] = v; return res; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  let passed = false;
  throttle({ ip, body: { identifier } }, res, () => { passed = true; });
  if (!passed) return res.statusCode;
  res.statusCode = status;
  res.emit('finish');
  return status;
}

test('akun ditahan setelah batas gagal, akun lain dan IP lain tidak', () => {
  const throttle = createLoginThrottle({ maxPerAccount: 3, maxPerIp: 100, windowMs: 60_000 });
  for (let i = 0; i < 3; i++) assert.equal(attempt(throttle, 'G1A1', 401), 401);
  assert.equal(attempt(throttle, 'G1A1', 200), 429);
  assert.equal(attempt(throttle, 'G1A2', 401), 401);
  assert.equal(attempt(throttle, 'G1A1', 401, '10.0.0.2'), 401);
});

test('identitas dibandingkan tanpa peduli huruf besar dan spasi', () => {
  const throttle = createLoginThrottle({ maxPerAccount: 2, maxPerIp: 100, windowMs: 60_000 });
  attempt(throttle, 'Admin@Univ.edu', 401);
  attempt(throttle, ' admin@univ.edu ', 401);
  assert.equal(attempt(throttle, 'ADMIN@UNIV.EDU', 200), 429);
});

test('batas per IP menahan tebakan ke banyak akun', () => {
  const throttle = createLoginThrottle({ maxPerAccount: 100, maxPerIp: 5, windowMs: 60_000 });
  for (let i = 0; i < 5; i++) attempt(throttle, `akun${i}`, 401);
  assert.equal(attempt(throttle, 'akun-baru', 200), 429);
});

test('penahanan lepas setelah jendela waktu habis', () => {
  let now = 0;
  const throttle = createLoginThrottle({ maxPerAccount: 2, maxPerIp: 100, windowMs: 1000, now: () => now });
  attempt(throttle, 'x', 401); attempt(throttle, 'x', 401);
  assert.equal(attempt(throttle, 'x', 200), 429);
  now = 1001;
  assert.equal(attempt(throttle, 'x', 200), 200);
});

test('login berhasil dan galat selain 401 tidak menambah hitungan', () => {
  const throttle = createLoginThrottle({ maxPerAccount: 2, maxPerIp: 100, windowMs: 60_000 });
  attempt(throttle, 'y', 401);
  attempt(throttle, 'y', 200); // hitungan akun dihapus
  attempt(throttle, 'y', 400); attempt(throttle, 'y', 403);
  attempt(throttle, 'y', 401);
  assert.equal(attempt(throttle, 'y', 200), 200);
});
