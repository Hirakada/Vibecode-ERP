import test from 'node:test';
import assert from 'node:assert/strict';
import { EscPosBuilder, buildReceiptEscPos, buildTestPrintEscPos, COMMANDS } from './escpos';
import { Sale, BusinessSettings } from '../types';

test('EscPosBuilder initializes with ESC @ commands', () => {
  const builder = new EscPosBuilder({ paperWidth: '58mm', charsPerLine: 32 });
  const bytes = builder.feedAndFinish();
  // Starts with ESC @ (0x1B, 0x40)
  assert.equal(bytes[0], 0x1b);
  assert.equal(bytes[1], 0x40);
});

test('EscPosBuilder formats two columns accurately with 32 character budget', () => {
  const builder = new EscPosBuilder({ paperWidth: '58mm', charsPerLine: 32 });
  builder.twoColumns('Kopi Susu Aren', 'Rp 22.000');
  const bytes = builder.feedAndFinish();
  const text = String.fromCharCode(...bytes);
  assert.match(text, /Kopi Susu Aren/);
  assert.match(text, /Rp 22\.000/);
});

test('buildReceiptEscPos generates valid byte stream with sale info', () => {
  const mockSale: Sale = {
    id: 's-1',
    transactionNumber: 'CAOZY-20261025-001',
    createdAt: '2026-10-25T12:00:00Z',
    cashierId: 'c1',
    cashierName: 'Siti Rahma',
    shiftId: 'sh-1',
    items: [
      {
        id: 'i1',
        productId: 'p1',
        productName: 'Kopi Susu Aren',
        unitPrice: 22000,
        quantity: 1,
        selectedModifiers: [],
        itemTotal: 22000,
      },
    ],
    subtotal: 22000,
    discount: 0,
    tax: 0,
    grandTotal: 22000,
    status: 'completed',
    syncStatus: 'synced',
    costAllocations: [],
    totalCogs: 6000,
    grossProfit: 16000,
    payment: {
      paymentId: 'pay-1',
      method: 'cash',
      amountPaid: 50000,
      change: 28000,
      confirmedAt: '2026-10-25T12:00:00Z',
      confirmedBy: 'Siti Rahma',
    },
  };

  const mockSettings: BusinessSettings = {
    businessName: 'Caozy Kedai Minuman',
    tagline: 'Artisan Drink',
    address: 'Jl. Senopati No. 42',
    phone: '0812-3456-7890',
    receiptPaperWidth: '58mm',
    taxRatePercent: 0,
    receiptHeader: '',
    receiptFooter: '',
    allowNegativeStock: false,
    offlineConfirmationAllowed: true,
  };

  const receiptBytes = buildReceiptEscPos(mockSale, mockSettings, '58mm', false);
  assert.ok(receiptBytes.length > 50);

  const text = String.fromCharCode(...receiptBytes);
  assert.match(text, /CAOZY KEDAI MINUMAN/);
  assert.match(text, /CAOZY-20261025-001/);
  assert.match(text, /Kopi Susu Aren/);
  assert.match(text, /Rp 22\.000/);
  assert.match(text, /LUNAS/);
});

test('buildTestPrintEscPos contains diagnostic message', () => {
  const bytes = buildTestPrintEscPos('Panda PRJ-58B', '58mm');
  const text = String.fromCharCode(...bytes);
  assert.match(text, /TEST PRINT BLUETOOTH OK/);
  assert.match(text, /Panda PRJ-58B/);
});
