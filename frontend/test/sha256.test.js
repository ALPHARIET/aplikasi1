import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256Hex } from '../src/utils/sha256.js';

const nodeSha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

test('sha256Hex: vektor uji FIPS 180-2', () => {
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('sha256Hex sama dengan crypto Node untuk teks multi-blok dan non-ASCII', () => {
  for (const s of ['a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(1000), 'IPK 3,77 — Rina Puspita Sari', '日本語']) {
    assert.equal(sha256Hex(s), nodeSha(s), `berbeda untuk panjang ${s.length}`);
  }
});
