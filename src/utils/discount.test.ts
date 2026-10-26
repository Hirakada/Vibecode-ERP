import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscountAmount,
  isOverrideRequired,
  verifySupervisorPin,
  formatDiscountLabel,
  DEFAULT_DISCOUNT_LIMITS,
} from './discount';

test('calculateDiscountAmount: calculates correct percentage discount', () => {
  const subtotal = 50000;
  assert.equal(calculateDiscountAmount(subtotal, 'percent', 10), 5000);
  assert.equal(calculateDiscountAmount(subtotal, 'percent', 15), 7500);
  assert.equal(calculateDiscountAmount(subtotal, 'percent', 20), 10000);
  assert.equal(calculateDiscountAmount(subtotal, 'percent', 50), 25000);
  assert.equal(calculateDiscountAmount(subtotal, 'percent', 100), 50000);
});

test('calculateDiscountAmount: caps percentage at 100% and does not exceed subtotal', () => {
  const subtotal = 40000;
  assert.equal(calculateDiscountAmount(subtotal, 'percent', 120), 40000);
});

test('calculateDiscountAmount: calculates correct flat amount discount', () => {
  const subtotal = 75000;
  assert.equal(calculateDiscountAmount(subtotal, 'flat', 5000), 5000);
  assert.equal(calculateDiscountAmount(subtotal, 'flat', 15000), 15000);
  assert.equal(calculateDiscountAmount(subtotal, 'flat', 25000), 25000);
});

test('calculateDiscountAmount: caps flat discount to subtotal (cannot be greater than cart)', () => {
  const subtotal = 30000;
  assert.equal(calculateDiscountAmount(subtotal, 'flat', 50000), 30000);
});

test('calculateDiscountAmount: handles negative, zero, and non-finite inputs safely', () => {
  assert.equal(calculateDiscountAmount(0, 'percent', 10), 0);
  assert.equal(calculateDiscountAmount(-10000, 'percent', 10), 0);
  assert.equal(calculateDiscountAmount(50000, 'percent', -10), 0);
  assert.equal(calculateDiscountAmount(50000, 'flat', -5000), 0);
  assert.equal(calculateDiscountAmount(NaN, 'percent', 10), 0);
  assert.equal(calculateDiscountAmount(50000, 'percent', Infinity), 0);
});

test('isOverrideRequired: owner and manager never require override', () => {
  // Owner 50% discount
  assert.equal(isOverrideRequired(25000, 'percent', 50, 'owner'), false);
  // Manager flat Rp 100.000 discount
  assert.equal(isOverrideRequired(100000, 'flat', 100000, 'manager'), false);
});

test('isOverrideRequired: cashier within standard limit does not require override', () => {
  // 10% <= 15% and 5000 <= 20000
  assert.equal(isOverrideRequired(5000, 'percent', 10, 'cashier'), false);
  // 15% <= 15% and 15000 <= 20000
  assert.equal(isOverrideRequired(15000, 'percent', 15, 'cashier'), false);
  // Flat Rp 10.000 <= Rp 20.000
  assert.equal(isOverrideRequired(10000, 'flat', 10000, 'cashier'), false);
});

test('isOverrideRequired: cashier exceeding percentage limit (>15%) requires override', () => {
  assert.equal(isOverrideRequired(10000, 'percent', 20, 'cashier'), true);
  assert.equal(isOverrideRequired(25000, 'percent', 50, 'cashier'), true);
});

test('isOverrideRequired: cashier exceeding flat limit (>Rp 20.000) requires override', () => {
  assert.equal(isOverrideRequired(25000, 'flat', 25000, 'cashier'), true);
  assert.equal(isOverrideRequired(50000, 'flat', 50000, 'cashier'), true);
});

test('isOverrideRequired: zero or empty discount never requires override', () => {
  assert.equal(isOverrideRequired(0, 'percent', 0, 'cashier'), false);
  assert.equal(isOverrideRequired(0, 'flat', 0, 'cashier'), false);
});

test('verifySupervisorPin: successfully authorizes valid owner and manager PINs', () => {
  // Owner PIN
  const ownerRes = verifySupervisorPin('1234');
  assert.equal(ownerRes.isValid, true);
  assert.equal(ownerRes.approver?.name, 'Budi Santoso');
  assert.equal(ownerRes.approver?.role, 'owner');

  // Manager PIN
  const mgrRes = verifySupervisorPin('2345');
  assert.equal(mgrRes.isValid, true);
  assert.equal(mgrRes.approver?.name, 'Dewi Lestari');
  assert.equal(mgrRes.approver?.role, 'manager');
});

test('verifySupervisorPin: rejects invalid PINs or empty inputs', () => {
  const emptyRes = verifySupervisorPin('');
  assert.equal(emptyRes.isValid, false);
  assert.match(emptyRes.error || '', /wajib diisi/i);

  const invalidRes = verifySupervisorPin('9999');
  assert.equal(invalidRes.isValid, false);
  assert.match(invalidRes.error || '', /tidak valid/i);
});

test('formatDiscountLabel formats percent and flat labels correctly', () => {
  assert.equal(
    formatDiscountLabel({
      type: 'percent',
      value: 10,
      amount: 5000,
      reason: 'Promo',
      requiresOverride: false,
    }),
    '10% (-Rp 5.000)'
  );

  assert.equal(
    formatDiscountLabel({
      type: 'flat',
      value: 15000,
      amount: 15000,
      reason: 'Voucher',
      requiresOverride: false,
    }),
    'Rp 15.000'
  );
});
