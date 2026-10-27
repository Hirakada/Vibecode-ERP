import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OWNER_EMAIL,
  validateOwnerEmail,
  verifyOwnerPin,
  verifyOtpCode,
  generateRandomOtp,
} from './authService';

test('validateOwnerEmail: correctly authorizes owner email hirakada.id@gmail.com', () => {
  assert.equal(validateOwnerEmail('hirakada.id@gmail.com'), true);
  assert.equal(validateOwnerEmail('  HIRAKADA.ID@GMAIL.COM  '), true);
  assert.equal(validateOwnerEmail('Hirakada.ID@Gmail.Com'), true);
});

test('validateOwnerEmail: rejects unauthorized emails or empty strings', () => {
  assert.equal(validateOwnerEmail(''), false);
  assert.equal(validateOwnerEmail('other@gmail.com'), false);
  assert.equal(validateOwnerEmail('attacker@evil.com'), false);
  assert.equal(validateOwnerEmail('hirakada@gmail.com'), false); // missing .id
});

test('verifyOwnerPin: authorizes default PIN 1234', () => {
  assert.equal(verifyOwnerPin('1234'), true);
  assert.equal(verifyOwnerPin(' 1234 '), true);
  assert.equal(verifyOwnerPin('0000'), false);
  assert.equal(verifyOwnerPin(''), false);
  assert.equal(verifyOwnerPin('12345'), false);
});

test('verifyOtpCode: matches valid OTP and rejects mismatches', () => {
  assert.equal(verifyOtpCode('123456', '123456'), true);
  assert.equal(verifyOtpCode(' 654321 ', '654321'), true);
  assert.equal(verifyOtpCode('111111', '222222'), false);
  assert.equal(verifyOtpCode('', '123456'), false);
});

test('generateRandomOtp: returns 6-digit numeric string', () => {
  const otp = generateRandomOtp();
  assert.equal(typeof otp, 'string');
  assert.equal(otp.length, 6);
  assert.match(otp, /^\d{6}$/);
});
