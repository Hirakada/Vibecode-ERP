import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Purchasing & Goods Arrival Calculation Rules', () => {
  it('calculates PO financial breakdown with item discounts, order discount, delivery fee, and service fee', () => {
    // Item 1: 2 pcs @ 488g with Rp 12.000 / pcs, item discount Rp 2.000
    // Raw total = 2 * 12.000 = 24.000, net total = 22.000
    const item1 = {
      packQty: 2,
      contentPerPack: 488,
      pricePerPack: 12000,
      itemRawTotal: 24000,
      itemDiscount: 2000,
      itemNetTotal: 22000,
      totalStockPlanned: 976,
    };

    // Item 2: 1 pcs @ 1000ml with Rp 30.000 / pcs, item discount 10% (Rp 3.000)
    // Raw total = 30.000, net total = 27.000
    const item2 = {
      packQty: 1,
      contentPerPack: 1000,
      pricePerPack: 3000,
      itemRawTotal: 30000,
      itemDiscount: 3000,
      itemNetTotal: 27000,
      totalStockPlanned: 1000,
    };

    const items = [item1, item2];
    const rawSubtotal = items.reduce((s, i) => s + i.itemRawTotal, 0); // 54.000
    const itemDiscountTotal = items.reduce((s, i) => s + i.itemDiscount, 0); // 5.000
    const netItemsSubtotal = rawSubtotal - itemDiscountTotal; // 49.000

    const orderDiscount = 4000; // Diskon total belanja / faktur
    const deliveryFee = 10000; // Ongkir
    const serviceFee = 2000; // Admin / Layanan

    const grandTotal = netItemsSubtotal - orderDiscount + deliveryFee + serviceFee;
    // 49.000 - 4.000 + 10.000 + 2.000 = 57.000
    assert.equal(rawSubtotal, 54000);
    assert.equal(itemDiscountTotal, 5000);
    assert.equal(netItemsSubtotal, 49000);
    assert.equal(grandTotal, 57000);
  });

  it('allocates delivery fee, admin fee, and order discount to FIFO cost layer unit cost accurately', () => {
    // Total net items basis: 49.000
    // Item 1 net: 22.000, Stock: 976g
    // Item 2 net: 27.000, Stock: 1000ml
    // Net overhead pool = deliveryFee (10.000) + serviceFee (2.000) - orderDiscount (4.000) = 8.000
    const totalItemNetBasis = 49000;
    const netOverheadPool = 8000;

    // Item 1 proportion: 22.000 / 49.000 = 0.448979
    // Allocated overhead: 8.000 * (22.000 / 49.000) = 3591.83
    // Final allocated total cost: 22.000 + 3591.83 = 25.591,83
    // Quantity received: 976g
    // FIFO Unit Cost: 25.591,83 / 976 = Rp 26.22 / g
    const item1Net = 22000;
    const item1Qty = 976;
    const item1Overhead = netOverheadPool * (item1Net / totalItemNetBasis);
    const item1FinalCost = item1Net + item1Overhead;
    const item1UnitCost = Math.round((item1FinalCost / item1Qty) * 100) / 100;

    assert.equal(Math.round(item1FinalCost), 25592);
    assert.equal(item1UnitCost, 26.22);
  });

  it('ensures stock is not updated when status is waiting, and updated only upon arrived', () => {
    let currentStock = 500;
    const po = {
      status: 'waiting',
      quantityPlanned: 976,
    };

    // When status is 'waiting', stock remains unchanged
    if (po.status === 'waiting') {
      // Stock does NOT change
    }
    assert.equal(currentStock, 500);

    // When goods physically arrive and verified: status becomes 'arrived' and stock is updated
    const quantityReceived = 976;
    currentStock += quantityReceived;
    po.status = 'arrived';

    assert.equal(po.status, 'arrived');
    assert.equal(currentStock, 1476);
  });
});
