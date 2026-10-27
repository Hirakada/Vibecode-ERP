import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssetDepreciation } from './assetService.js';

describe('Asset Depreciation Calculator', () => {
  it('calculates monthly depreciation correctly for 36 months useful life', () => {
    // Espresso Machine: 36,000,000 IDR, salvage value 0, 36 months
    const now = new Date().toISOString();
    const result = calculateAssetDepreciation(36000000, 0, 36, now);

    assert.equal(result.monthlyDepreciation, 1000000);
    assert.equal(result.monthsElapsed, 0);
    assert.equal(result.accumulatedDepreciation, 0);
    assert.equal(result.currentBookValue, 36000000);
  });

  it('calculates accumulated depreciation with salvage value', () => {
    // 24,000,000 IDR, salvage value 2,400,000 IDR -> depreciable 21,600,000
    // Useful life 24 months -> 900,000 IDR per month
    const purchaseDate = new Date();
    purchaseDate.setMonth(purchaseDate.getMonth() - 6); // 6 months ago

    const result = calculateAssetDepreciation(
      24000000,
      2400000,
      24,
      purchaseDate.toISOString()
    );

    assert.equal(result.monthlyDepreciation, 900000);
    assert.equal(result.monthsElapsed, 6);
    assert.equal(result.accumulatedDepreciation, 5400000);
    assert.equal(result.currentBookValue, 18600000);
  });

  it('clamps depreciation when useful life is exceeded', () => {
    const purchaseDate = new Date();
    purchaseDate.setFullYear(purchaseDate.getFullYear() - 5); // 5 years ago (60 months)

    const result = calculateAssetDepreciation(
      12000000,
      0,
      24, // 24 months life
      purchaseDate.toISOString()
    );

    assert.equal(result.monthsElapsed, 24);
    assert.equal(result.accumulatedDepreciation, 12000000);
    assert.equal(result.currentBookValue, 0);
  });
});
