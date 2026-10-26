import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateFifoLayers, calculateInventoryValuation } from './fifo';
import { InventoryCostLayer } from '../types';
import { formatIDR, calculateChange } from './currency';
import { convertUnit } from './units';
import { hasPermission } from './permissions';

test('FIFO allocation consumes oldest batch first (Section 9.C Example)', () => {
  // Master Prompt Section 9.C scenario:
  // Batch A: 500 g received first at Rp 100/g
  // Batch B: 300 g received later at Rp 120/g
  // Sale consumes 600 g:
  // 500 g from Batch A = Rp 50.000
  // 100 g from Batch B = Rp 12.000
  // Total COGS = Rp 62.000
  // Remaining Batch B = 200 g
  const mockLayers: InventoryCostLayer[] = [
    {
      id: 'layer-b',
      ingredientId: 'ing-coffee',
      batchNumber: 'BATCH-B',
      receivedAt: '2026-10-25T10:00:00Z',
      initialQuantity: 300,
      remainingQuantity: 300,
      unitCost: 120,
      isDepleted: false,
    },
    {
      id: 'layer-a',
      ingredientId: 'ing-coffee',
      batchNumber: 'BATCH-A',
      receivedAt: '2026-10-25T08:00:00Z', // older
      initialQuantity: 500,
      remainingQuantity: 500,
      unitCost: 100,
      isDepleted: false,
    },
  ];

  const result = allocateFifoLayers(mockLayers, 600);

  assert.equal(result.isSufficient, true);
  assert.equal(result.totalCogs, 62000);
  assert.equal(result.allocations.length, 2);

  // First allocation from Batch A
  assert.equal(result.allocations[0].layerId, 'layer-a');
  assert.equal(result.allocations[0].quantityConsumed, 500);
  assert.equal(result.allocations[0].totalCost, 50000);

  // Second allocation from Batch B
  assert.equal(result.allocations[1].layerId, 'layer-b');
  assert.equal(result.allocations[1].quantityConsumed, 100);
  assert.equal(result.allocations[1].totalCost, 12000);

  // Check updated remaining quantities
  const updatedA = result.updatedLayers.find((l) => l.id === 'layer-a');
  const updatedB = result.updatedLayers.find((l) => l.id === 'layer-b');
  assert.equal(updatedA?.remainingQuantity, 0);
  assert.equal(updatedA?.isDepleted, true);
  assert.equal(updatedB?.remainingQuantity, 200);
  assert.equal(updatedB?.isDepleted, false);
});

test('FIFO allocation rejects overconsumption when negative stock is disallowed', () => {
  const mockLayers: InventoryCostLayer[] = [
    {
      id: 'layer-1',
      ingredientId: 'ing-milk',
      batchNumber: 'BATCH-01',
      receivedAt: '2026-10-25T08:00:00Z',
      initialQuantity: 100,
      remainingQuantity: 100,
      unitCost: 20,
      isDepleted: false,
    },
  ];

  const result = allocateFifoLayers(mockLayers, 150, false);
  assert.equal(result.isSufficient, false);
  assert.equal(result.shortage, 50);
  assert.equal(result.allocations.length, 0);
});

test('calculateInventoryValuation sums remaining quantity * unitCost', () => {
  const mockLayers: InventoryCostLayer[] = [
    {
      id: 'l1',
      ingredientId: 'i1',
      batchNumber: 'B1',
      receivedAt: '2026-10-25T01:00:00Z',
      initialQuantity: 100,
      remainingQuantity: 50,
      unitCost: 200, // 50 * 200 = 10,000
      isDepleted: false,
    },
    {
      id: 'l2',
      ingredientId: 'i2',
      batchNumber: 'B2',
      receivedAt: '2026-10-25T02:00:00Z',
      initialQuantity: 200,
      remainingQuantity: 100,
      unitCost: 150, // 100 * 150 = 15,000
      isDepleted: false,
    },
  ];

  const val = calculateInventoryValuation(mockLayers);
  assert.equal(val, 25000);
});

test('IDR currency formatting and change calculation', () => {
  assert.equal(formatIDR(25000), 'Rp 25.000');
  const changeRes = calculateChange(50000, 32000);
  assert.equal(changeRes.isSufficient, true);
  assert.equal(changeRes.change, 18000);

  const insufficientRes = calculateChange(20000, 32000);
  assert.equal(insufficientRes.isSufficient, false);
  assert.equal(insufficientRes.change, 0);
});

test('Unit conversions work correctly for mass and volume', () => {
  assert.equal(convertUnit(1.5, 'kg', 'g'), 1500);
  assert.equal(convertUnit(2000, 'g', 'kg'), 2);
  assert.equal(convertUnit(2, 'L', 'ml'), 2000);
  assert.equal(convertUnit(500, 'ml', 'L'), 0.5);
  assert.equal(convertUnit(2, 'pack', 'pcs', 50), 100);
});

test('Role permissions enforce least privilege', () => {
  assert.equal(hasPermission('cashier', 'access_pos'), true);
  assert.equal(hasPermission('cashier', 'access_admin'), false);
  assert.equal(hasPermission('cashier', 'manage_expenses'), false);

  assert.equal(hasPermission('inventory', 'access_admin'), true);
  assert.equal(hasPermission('inventory', 'receive_purchases'), true);
  assert.equal(hasPermission('inventory', 'view_financial_reports'), false);

  assert.equal(hasPermission('owner', 'access_admin'), true);
  assert.equal(hasPermission('owner', 'view_financial_reports'), true);
});
