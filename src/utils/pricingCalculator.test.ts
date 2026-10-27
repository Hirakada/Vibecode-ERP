import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { roundToNearest200, calculateRecommendedPrice } from './pricingCalculator.js';

describe('Pricing Calculator with 200 Rounding and Tax', () => {
  it('correctly rounds up to multiples of 200', () => {
    assert.equal(roundToNearest200(0), 0);
    assert.equal(roundToNearest200(15000), 15000);
    assert.equal(roundToNearest200(15001), 15200);
    assert.equal(roundToNearest200(15120), 15200);
    assert.equal(roundToNearest200(15200), 15200);
    assert.equal(roundToNearest200(15201), 15400);
  });

  it('enforces minimum 10% target profit margin', () => {
    const result = calculateRecommendedPrice(5000, 10, 5); // 5% passed, but minimum is 10%
    assert.equal(result.targetProfitMarginPercent, 10);
  });

  it('calculates operational cost as percentage of HPP and rounds recommended price to 200', () => {
    // HPP = 6000
    // Operational = 15% -> 900
    // Total Cost Base = 6900
    // Target Margin = 20% -> SellingPrice = 6900 / 0.80 = 8625
    // Rounded to nearest 200 -> Math.ceil(8625 / 200) * 200 = 8800
    // Tax 10% at POS -> 8800 * 1.10 = 9680
    const result = calculateRecommendedPrice(6000, 15, 20, 10);
    assert.equal(result.hpp, 6000);
    assert.equal(result.operationalCost, 900);
    assert.equal(result.totalCostBase, 6900);
    assert.equal(result.recommendedPrice, 8800);
    assert.equal(result.estimatedPosGrandTotal, 9680);
    assert.ok(result.actualGrossProfit >= 1900);
    assert.ok(result.actualMarginPercent >= 20);
  });

  it('handles zero HPP cleanly', () => {
    const result = calculateRecommendedPrice(0, 15, 20, 10);
    assert.equal(result.recommendedPrice, 0);
    assert.equal(result.estimatedPosGrandTotal, 0);
  });
});
