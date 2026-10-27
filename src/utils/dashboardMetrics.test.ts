import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDailyTrend,
  calculateHourlyTrend,
  calculateTopProducts,
  calculateCategoryBreakdown,
} from './dashboardMetrics';
import { Sale } from '../types';

test('Dashboard Metrics Aggregator', async (t) => {
  const mockSales: Sale[] = [
    {
      id: 's1',
      transactionNumber: 'TRX-001',
      createdAt: '2026-10-25T10:15:00.000Z',
      cashierId: 'c1',
      cashierName: 'Siti Rahma',
      shiftId: 'shift-1',
      syncStatus: 'synced',
      subtotal: 50000,
      discount: 5000,
      tax: 4500,
      grandTotal: 49500,
      totalCogs: 20000,
      grossProfit: 25000,
      costAllocations: [],
      items: [
        {
          id: 'i1',
          productId: 'p-matcha',
          productName: 'Signature Matcha Latte',
          unitPrice: 25000,
          quantity: 2,
          selectedModifiers: [],
          itemTotal: 50000,
        },
      ],
      payment: {
        paymentId: 'pay-1',
        method: 'qris',
        amountPaid: 49500,
        change: 0,
        confirmedAt: '2026-10-25T10:15:00.000Z',
        confirmedBy: 'c1',
      },
      status: 'completed',
    },
    {
      id: 's2',
      transactionNumber: 'TRX-002',
      createdAt: '2026-10-26T14:30:00.000Z',
      cashierId: 'c1',
      cashierName: 'Siti Rahma',
      shiftId: 'shift-1',
      syncStatus: 'synced',
      subtotal: 30000,
      discount: 0,
      tax: 3000,
      grandTotal: 33000,
      totalCogs: 12000,
      grossProfit: 18000,
      costAllocations: [],
      items: [
        {
          id: 'i2',
          productId: 'p-kopi',
          productName: 'Kopi Susu Gula Aren',
          unitPrice: 15000,
          quantity: 2,
          selectedModifiers: [],
          itemTotal: 30000,
        },
      ],
      payment: {
        paymentId: 'pay-2',
        method: 'cash',
        amountPaid: 50000,
        change: 17000,
        confirmedAt: '2026-10-26T14:30:00.000Z',
        confirmedBy: 'c1',
      },
      status: 'completed',
    },
    {
      id: 's3_void',
      transactionNumber: 'TRX-003-VOID',
      createdAt: '2026-10-26T15:00:00.000Z',
      cashierId: 'c1',
      cashierName: 'Siti Rahma',
      shiftId: 'shift-1',
      syncStatus: 'synced',
      subtotal: 100000,
      discount: 0,
      tax: 10000,
      grandTotal: 110000,
      totalCogs: 40000,
      grossProfit: 60000,
      costAllocations: [],
      items: [],
      status: 'void', // Void should be excluded
    },
  ];

  await t.test('calculateDailyTrend generates correct 7-day points and excludes void sales', () => {
    const trend = calculateDailyTrend(mockSales, 7, '2026-10-27');
    assert.equal(trend.length, 7);

    // Day 2026-10-25 has s1 (netSales = 45000, cogs = 20000, profit = 25000)
    const day25 = trend.find((p) => p.rawDate === '2026-10-25');
    assert.ok(day25);
    assert.equal(day25.netSales, 45000);
    assert.equal(day25.cogs, 20000);
    assert.equal(day25.grossProfit, 25000);
    assert.equal(day25.transactionCount, 1);
    assert.equal(day25.profitMargin, Math.round((25000 / 45000) * 100));

    // Day 2026-10-26 has s2 (s3 is void and must be ignored)
    const day26 = trend.find((p) => p.rawDate === '2026-10-26');
    assert.ok(day26);
    assert.equal(day26.netSales, 30000);
    assert.equal(day26.cogs, 12000);
    assert.equal(day26.grossProfit, 18000);
    assert.equal(day26.transactionCount, 1);
  });

  await t.test('calculateTopProducts correctly aggregates quantities and revenue', () => {
    const top = calculateTopProducts(mockSales, [], 5);
    assert.equal(top.length, 2);
    // Both sold 2 items, p-matcha had 45,000 net revenue, p-kopi had 30,000
    assert.equal(top[0].quantitySold, 2);
    assert.equal(top[1].quantitySold, 2);

    const matcha = top.find((p) => p.productId === 'p-matcha');
    assert.ok(matcha);
    assert.equal(matcha.productName, 'Signature Matcha Latte');
    assert.equal(matcha.totalRevenue, 45000);
    assert.equal(matcha.totalCogs, 20000);
    assert.equal(matcha.grossProfit, 25000);
  });

  await t.test('calculateCategoryBreakdown groups top products into categories', () => {
    const top = calculateTopProducts(mockSales, [], 5);
    const cat = calculateCategoryBreakdown(top);
    assert.ok(cat.length >= 1);
    const totalRev = cat.reduce((sum, c) => sum + c.totalRevenue, 0);
    assert.equal(totalRev, 75000);
  });
});
