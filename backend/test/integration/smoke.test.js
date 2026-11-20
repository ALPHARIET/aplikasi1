// Memastikan infrastruktur test jalan: database test, Hardhat node, dan app
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers/testServer');

let srv;
before(async () => { srv = await startTestServer(); });
after(async () => { await srv?.close(); });

test('API bisa dihubungi dan admin test bisa masuk', async () => {
  const token = await srv.login(srv.admin.email, srv.admin.password, 'admin');
  assert.ok(token);
});
