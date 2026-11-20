const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimit } = require('../../src/middleware/rateLimit');

function hit(limit, ip = '10.0.0.1') {
  const res = { headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  let passed = false;
  limit({ ip }, res, () => { passed = true; });
  return passed ? 200 : res.statusCode;
}

test('permintaan ke-(max+1) dalam satu jendela dijawab 429 dengan Retry-After', () => {
  const limit = createRateLimit({ max: 3, windowMs: 60_000, message: (s) => `tunggu ${s}` });
  assert.deepEqual([hit(limit), hit(limit), hit(limit), hit(limit)], [200, 200, 200, 429]);
});

test('IP lain punya kuota sendiri dan kuota pulih setelah jendela habis', () => {
  let now = 0;
  const limit = createRateLimit({ max: 1, windowMs: 1000, message: () => 'x', now: () => now });
  assert.equal(hit(limit, 'a'), 200);
  assert.equal(hit(limit, 'a'), 429);
  assert.equal(hit(limit, 'b'), 200);
  now = 1001;
  assert.equal(hit(limit, 'a'), 200);
});
