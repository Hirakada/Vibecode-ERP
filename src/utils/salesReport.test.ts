import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterSalesByDate,
  calculateDailySalesSummary,
  getTopSellingProducts,
  calculatePieChartSlices,
  calculatePaymentBreakdown,
  calculateHourlySalesBreakdown,
  exportSalesReportToCsv,
} from './salesReport';
import { Sale } from '../types';

const mockSales: Sale[] = [
  {
    id: 'sale-1',
    transactionNumber: 'CAOZY-20261025-001',
    createdAt: '2026-10-25T10:15:00.000Z',
    cashierId: 'usr-cashier',
    cashierName: 'Siti Rahma',
    shiftId: 'shift-1',
    items: [
      {
        id: 'item-1',
        productId: 'prod-kopsus-aren',
        productName: 'Kopi Susu Gula Aren',
        unitPrice: 22000,
        quantity: 3,
        selectedModifiers: [],
        itemTotal: 66000,
      },
      {
        id: 'item-2',
        productId: 'prod-matcha-latte',
        productName: 'Matcha Latte Artisan',
        unitPrice: 28000,
        quantity: 1,
        selectedModifiers: [],
        itemTotal: 28000,
      },
    ],
    subtotal: 94000,
    discount: 4000,
    tax: 0,
    grandTotal: 90000,
    status: 'completed',
    syncStatus: 'synced',
    totalCogs: 30000,
    grossProfit: 60000,
    costAllocations: [],
    payment: {
      paymentId: 'pay-1',
      method: 'qris',
      amountPaid: 90000,
      change: 0,
      confirmedAt: '2026-10-25T10:16:00.000Z',
      confirmedBy: 'Siti Rahma',
    },
  },
  {
    id: 'sale-2',
    transactionNumber: 'CAOZY-20261025-002',
    createdAt: '2026-10-25T14:30:00.000Z',
    cashierId: 'usr-cashier',
    cashierName: 'Siti Rahma',
    shiftId: 'shift-1',
    items: [
      {
        id: 'item-3',
        productId: 'prod-kopsus-aren',
        productName: 'Kopi Susu Gula Aren',
        unitPrice: 22000,
        quantity: 2,
        selectedModifiers: [],
        itemTotal: 44000,
      },
      {
        id: 'item-4',
        productId: 'prod-earlgrey-tea',
        productName: 'Earl Grey Milk Tea Boba',
        unitPrice: 26000,
        quantity: 2,
        selectedModifiers: [],
        itemTotal: 52000,
      },
    ],
    subtotal: 96000,
    discount: 0,
    tax: 0,
    grandTotal: 96000,
    status: 'completed',
    syncStatus: 'synced',
    totalCogs: 32000,
    grossProfit: 64000,
    costAllocations: [],
    payment: {
      paymentId: 'pay-2',
      method: 'cash',
      amountPaid: 100000,
      change: 4000,
      confirmedAt: '2026-10-25T14:31:00.000Z',
      confirmedBy: 'Siti Rahma',
    },
  },
  {
    id: 'sale-void',
    transactionNumber: 'CAOZY-20261025-VOID',
    createdAt: '2026-10-25T11:00:00.000Z',
    cashierId: 'usr-cashier',
    cashierName: 'Siti Rahma',
    shiftId: 'shift-1',
    items: [
      {
        id: 'item-void',
        productId: 'prod-coldbrew',
        productName: 'Classic Cold Brew Black',
        unitPrice: 20000,
        quantity: 5,
        selectedModifiers: [],
        itemTotal: 100000,
      },
    ],
    subtotal: 100000,
    discount: 0,
    tax: 0,
    grandTotal: 100000,
    status: 'void',
    syncStatus: 'synced',
    totalCogs: 20000,
    grossProfit: 80000,
    costAllocations: [],
  },
  {
    id: 'sale-yesterday',
    transactionNumber: 'CAOZY-20261024-001',
    createdAt: '2026-10-24T18:00:00.000Z',
    cashierId: 'usr-cashier',
    cashierName: 'Siti Rahma',
    shiftId: 'shift-0',
    items: [
      {
        id: 'item-y1',
        productId: 'prod-coldbrew',
        productName: 'Classic Cold Brew Black',
        unitPrice: 20000,
        quantity: 1,
        selectedModifiers: [],
        itemTotal: 20000,
      },
    ],
    subtotal: 20000,
    discount: 0,
    tax: 0,
    grandTotal: 20000,
    status: 'completed',
    syncStatus: 'synced',
    totalCogs: 5000,
    grossProfit: 15000,
    costAllocations: [],
  },
];

test('filterSalesByDate filters by YYYY-MM-DD and excludes voided sales', () => {
  const filtered = filterSalesByDate(mockSales, '2026-10-25');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].id, 'sale-1');
  assert.equal(filtered[1].id, 'sale-2');

  const yesterday = filterSalesByDate(mockSales, '2026-10-24');
  assert.equal(yesterday.length, 1);
  assert.equal(yesterday[0].id, 'sale-yesterday');

  const empty = filterSalesByDate(mockSales, '2026-10-20');
  assert.equal(empty.length, 0);
});

test('calculateDailySalesSummary aggregates financial metrics accurately', () => {
  const salesToday = filterSalesByDate(mockSales, '2026-10-25');
  const summary = calculateDailySalesSummary(salesToday, '2026-10-25');

  assert.equal(summary.date, '2026-10-25');
  assert.equal(summary.transactionCount, 2);
  assert.equal(summary.totalGross, 190000); // 94000 + 96000
  assert.equal(summary.totalDiscounts, 4000);
  assert.equal(summary.grandTotal, 186000); // 90000 + 96000
  assert.equal(summary.totalCogs, 62000); // 30000 + 32000
  assert.equal(summary.grossProfit, 124000); // 60000 + 64000
  assert.equal(summary.totalItemsSold, 8); // (3+1) + (2+2)
  assert.equal(summary.averageBasketSize, 93000); // 186000 / 2
  assert.equal(summary.averageItemsPerTransaction, 4.0); // 8 / 2
  assert.ok(summary.profitMarginPercent > 66 && summary.profitMarginPercent < 67);
});

test('calculateDailySalesSummary handles empty sales array safely without NaN', () => {
  const summary = calculateDailySalesSummary([], '2026-10-20');
  assert.equal(summary.transactionCount, 0);
  assert.equal(summary.grandTotal, 0);
  assert.equal(summary.profitMarginPercent, 0);
  assert.equal(summary.averageBasketSize, 0);
  assert.equal(summary.totalItemsSold, 0);
});

test('getTopSellingProducts correctly groups, ranks, and calculates percentages', () => {
  const salesToday = filterSalesByDate(mockSales, '2026-10-25');
  const topProducts = getTopSellingProducts(salesToday, 'quantity');

  assert.equal(topProducts.length, 3);
  // Kopi Susu Aren sold 3 + 2 = 5 cups
  assert.equal(topProducts[0].productId, 'prod-kopsus-aren');
  assert.equal(topProducts[0].quantitySold, 5);
  assert.equal(topProducts[0].totalRevenue, 110000);
  assert.equal(topProducts[0].transactionCount, 2);
  assert.equal(topProducts[0].quantitySharePercent, 62.5); // 5 / 8 * 100

  // Earl Grey sold 2 cups
  assert.equal(topProducts[1].productId, 'prod-earlgrey-tea');
  assert.equal(topProducts[1].quantitySold, 2);
  assert.equal(topProducts[1].quantitySharePercent, 25); // 2 / 8 * 100

  // Matcha sold 1 cup
  assert.equal(topProducts[2].productId, 'prod-matcha-latte');
  assert.equal(topProducts[2].quantitySold, 1);
  assert.equal(topProducts[2].quantitySharePercent, 12.5); // 1 / 8 * 100

  // Total quantity shares sum close to 100%
  const totalShare = topProducts.reduce((sum, p) => sum + p.quantitySharePercent, 0);
  assert.equal(totalShare, 100);
});

test('getTopSellingProducts supports sorting by revenue', () => {
  const salesToday = filterSalesByDate(mockSales, '2026-10-25');
  const topByRevenue = getTopSellingProducts(salesToday, 'revenue');

  assert.equal(topByRevenue[0].productId, 'prod-kopsus-aren'); // 110000
  assert.equal(topByRevenue[1].productId, 'prod-earlgrey-tea'); // 52000
  assert.equal(topByRevenue[2].productId, 'prod-matcha-latte'); // 28000
});

test('calculatePieChartSlices generates accurate angles and valid SVG path strings', () => {
  const salesToday = filterSalesByDate(mockSales, '2026-10-25');
  const topProducts = getTopSellingProducts(salesToday, 'quantity');
  const slices = calculatePieChartSlices(topProducts, 'quantity', {
    maxSlices: 4,
    centerX: 150,
    centerY: 150,
    innerRadius: 60,
    outerRadius: 110,
  });

  assert.equal(slices.length, 3);
  // Slices should cover 360 degrees (approx 2 * PI radians)
  const angleSpan = slices[slices.length - 1].endAngle - slices[0].startAngle;
  assert.ok(Math.abs(angleSpan - 2 * Math.PI) < 0.001);

  // Each slice should have valid path data
  slices.forEach((slice) => {
    assert.ok(slice.pathData.startsWith('M'));
    assert.ok(slice.pathData.includes('A'));
    assert.ok(slice.pathData.endsWith('Z'));
    assert.ok(typeof slice.color === 'string');
    assert.ok(slice.percentage > 0);
  });
});

test('calculatePieChartSlices bundles extra products into "Lainnya" if maxSlices exceeded', () => {
  const dummyProducts = [
    { productId: '1', productName: 'A', quantitySold: 50, totalRevenue: 50, totalCogs: 10, grossProfit: 40, profitMarginPercent: 80, quantitySharePercent: 50, revenueSharePercent: 50, transactionCount: 1 },
    { productId: '2', productName: 'B', quantitySold: 20, totalRevenue: 20, totalCogs: 5, grossProfit: 15, profitMarginPercent: 75, quantitySharePercent: 20, revenueSharePercent: 20, transactionCount: 1 },
    { productId: '3', productName: 'C', quantitySold: 10, totalRevenue: 10, totalCogs: 2, grossProfit: 8, profitMarginPercent: 80, quantitySharePercent: 10, revenueSharePercent: 10, transactionCount: 1 },
    { productId: '4', productName: 'D', quantitySold: 10, totalRevenue: 10, totalCogs: 2, grossProfit: 8, profitMarginPercent: 80, quantitySharePercent: 10, revenueSharePercent: 10, transactionCount: 1 },
    { productId: '5', productName: 'E', quantitySold: 10, totalRevenue: 10, totalCogs: 2, grossProfit: 8, profitMarginPercent: 80, quantitySharePercent: 10, revenueSharePercent: 10, transactionCount: 1 },
  ];

  // maxSlices = 3 -> Top 2 + 1 Other slice
  const slices = calculatePieChartSlices(dummyProducts, 'quantity', { maxSlices: 3 });
  assert.equal(slices.length, 3);
  assert.equal(slices[0].label, 'A');
  assert.equal(slices[1].label, 'B');
  assert.ok(slices[2].isOther);
  assert.equal(slices[2].value, 30); // 10 + 10 + 10
});

test('calculatePaymentBreakdown groups payment methods properly', () => {
  const salesToday = filterSalesByDate(mockSales, '2026-10-25');
  const breakdown = calculatePaymentBreakdown(salesToday);

  assert.equal(breakdown.length, 2);
  const cash = breakdown.find((b) => b.method === 'cash');
  const qris = breakdown.find((b) => b.method === 'qris');

  assert.ok(cash);
  assert.equal(cash.count, 1);
  assert.equal(cash.totalAmount, 96000);

  assert.ok(qris);
  assert.equal(qris.count, 1);
  assert.equal(qris.totalAmount, 90000);
});

test('calculateHourlySalesBreakdown maps 24 hours with exact totals', () => {
  const salesToday = filterSalesByDate(mockSales, '2026-10-25');
  const hourly = calculateHourlySalesBreakdown(salesToday);

  assert.equal(hourly.length, 24);
  const totalCount = hourly.reduce((sum, h) => sum + h.count, 0);
  assert.equal(totalCount, 2);
});

test('exportSalesReportToCsv outputs formatted CSV with product ranking', () => {
  const salesToday = filterSalesByDate(mockSales, '2026-10-25');
  const summary = calculateDailySalesSummary(salesToday, '2026-10-25');
  const topProducts = getTopSellingProducts(salesToday, 'quantity');

  const csv = exportSalesReportToCsv('2026-10-25', summary, topProducts);
  assert.ok(csv.includes('LAPORAN PENJUALAN HARIAN - CAOZY ERP'));
  assert.ok(csv.includes('"Kopi Susu Gula Aren"'));
  assert.ok(csv.includes('"186000"'));
});
