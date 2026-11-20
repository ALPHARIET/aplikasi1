const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const HashService = require('../../src/utils/hashService');

// SHA-256 dari "abc" (vektor uji FIPS 180-2)
const ABC_SHA256 = '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

test('hashString memberi SHA-256 berawalan 0x', () => {
  assert.equal(HashService.hashString('abc'), ABC_SHA256);
});

test('hashFile sama dengan hashString untuk isi yang sama', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hash-')), 'abc.txt');
  fs.writeFileSync(file, 'abc');
  assert.equal(await HashService.hashFile(file), ABC_SHA256);
});

test('hashFile menolak berkas yang tidak ada', async () => {
  await assert.rejects(HashService.hashFile(path.join(os.tmpdir(), 'tidak-ada-123.pdf')));
});
