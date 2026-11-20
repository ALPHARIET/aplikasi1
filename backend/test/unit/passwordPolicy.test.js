const { test } = require('node:test');
const assert = require('node:assert/strict');
const { passwordProblem, randomPassword, wholeSecondNow } = require('../../src/utils/passwordPolicy');

test('kata sandi minimal 8 karakter, spasi saja tidak dihitung', () => {
  assert.match(passwordProblem('1234567'), /minimal 8/);
  assert.match(passwordProblem('        '), /minimal 8/);
  assert.match(passwordProblem(undefined), /minimal 8/);
  assert.equal(passwordProblem('12345678'), null);
});

test('kata sandi lebih dari 72 byte ditolak (batas bcrypt)', () => {
  assert.equal(passwordProblem('a'.repeat(72)), null);
  assert.match(passwordProblem('a'.repeat(73)), /terlalu panjang/);
  assert.match(passwordProblem('é'.repeat(37)), /terlalu panjang/); // 74 byte UTF-8
});

test('kata sandi acak: 10 karakter tanpa huruf yang mirip, dan berbeda tiap panggilan', () => {
  const a = randomPassword();
  assert.match(a, /^[A-HJ-NP-Za-km-np-z2-9]{10}$/);
  assert.notEqual(a, randomPassword());
});

test('wholeSecondNow membuang milidetik', () => {
  assert.equal(wholeSecondNow().getMilliseconds(), 0);
});
