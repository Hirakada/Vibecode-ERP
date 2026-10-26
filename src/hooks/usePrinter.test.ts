import test from 'node:test';
import assert from 'node:assert/strict';
import { bluetoothPrinterService } from '../services/bluetoothPrinterService';
import { buildReceiptEscPos, buildTestPrintEscPos, EscPosBuilder } from '../lib/escpos';
import { Sale, BusinessSettings } from '../types';

test('bluetoothPrinterService handles raw byte commands', async () => {
  bluetoothPrinterService.toggleSimulation(true);
  const status = bluetoothPrinterService.getStatus();
  assert.equal(status.isConnected, true);
  assert.equal(status.isSimulated, true);

  // Send raw ESC/POS command: [ESC, '@'] (Initialize)
  const rawBytes = new Uint8Array([0x1b, 0x40]);
  const res = await bluetoothPrinterService.printBytes(rawBytes);
  assert.equal(res.success, true);
});

test('usePrinter integration: encodes Sale to raw ESC/POS commands and prints', async () => {
  bluetoothPrinterService.toggleSimulation(true);

  const mockSale: Sale = {
    id: 's-hook-1',
    transactionNumber: 'CAOZY-HOOK-001',
    createdAt: new Date().toISOString(),
    cashierId: 'c1',
    cashierName: 'Budi Santoso',
    shiftId: 'sh-1',
    items: [
      {
        id: 'item-1',
        productId: 'prod-kopsus-aren',
        productName: 'Kopi Susu Gula Aren',
        variantName: 'Large 22oz',
        unitPrice: 27000,
        quantity: 2,
        selectedModifiers: [{ modifierId: 'm1', name: 'Boba Aren', price: 4000 }],
        itemTotal: 54000,
      },
    ],
    subtotal: 54000,
    discount: 4000,
    tax: 0,
    grandTotal: 50000,
    status: 'completed',
    syncStatus: 'synced',
    costAllocations: [],
    totalCogs: 14000,
    grossProfit: 36000,
    payment: {
      paymentId: 'pay-hook-1',
      method: 'cash',
      amountPaid: 50000,
      change: 0,
      confirmedAt: new Date().toISOString(),
      confirmedBy: 'Budi Santoso',
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
    receiptFooter: 'Follow IG: @caozy.id',
    allowNegativeStock: false,
    offlineConfirmationAllowed: true,
  };

  const receiptBytes = buildReceiptEscPos(mockSale, mockSettings, '58mm', false);
  assert.ok(receiptBytes instanceof Uint8Array);
  assert.ok(receiptBytes.length > 50);

  const printRes = await bluetoothPrinterService.printBytes(receiptBytes);
  assert.equal(printRes.success, true);
});
