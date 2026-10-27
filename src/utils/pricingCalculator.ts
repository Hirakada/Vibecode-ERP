/**
 * Pricing calculator utility for Caozy Beverage ERP & POS.
 *
 * Rules:
 * - Base selling prices are EXCLUSIVE of 10% PB1 tax (tax is added at POS checkout).
 * - Target profit margin is minimum 10% (can be customized).
 * - Operational overhead is computed as a percentage of HPP (COGS).
 * - Automatic price recommendation rounds up to the nearest multiple of 200 (pembulatan 200).
 * - Users can always override the price manually.
 */

export interface PricingBreakdown {
  hpp: number; // Raw material COGS
  operationalPercent: number; // % overhead added to HPP
  operationalCost: number; // Operational cost amount in IDR
  totalCostBase: number; // HPP + Operational cost
  targetProfitMarginPercent: number; // Target margin percentage (min 10%)
  unroundedPrice: number; // Raw target price
  recommendedPrice: number; // Target price rounded up to nearest 200
  actualGrossProfit: number; // recommendedPrice - totalCostBase
  actualMarginPercent: number; // (actualGrossProfit / recommendedPrice) * 100
  posTaxPercent: number; // 10%
  estimatedPosGrandTotal: number; // recommendedPrice * 1.10
}

/**
 * Rounds a number UP to the nearest multiple of 200.
 * Examples:
 * - 15,000 -> 15,000
 * - 15,010 -> 15,200
 * - 15,199 -> 15,200
 * - 15,200 -> 15,200
 * - 15,201 -> 15,400
 */
export function roundToNearest200(amount: number): number {
  if (amount <= 0) return 0;
  return Math.ceil(amount / 200) * 200;
}

/**
 * Calculates recommended selling price based on HPP, operational cost %, and target profit margin %.
 *
 * Formula:
 * 1. Operational Cost = HPP * (operationalPercent / 100)
 * 2. Total Cost Base = HPP + Operational Cost
 * 3. With target profit margin M% where M = (SellingPrice - CostBase) / SellingPrice:
 *    SellingPrice = CostBase / (1 - (M / 100))
 * 4. Recommended Price = roundToNearest200(SellingPrice)
 */
export function calculateRecommendedPrice(
  hpp: number,
  operationalPercent: number = 15,
  targetProfitMarginPercent: number = 20,
  posTaxPercent: number = 10
): PricingBreakdown {
  const safeHpp = Math.max(0, hpp);
  const safeOpPercent = Math.max(0, operationalPercent);
  // Guarantee min 10% target profit margin
  const safeMarginPercent = Math.min(95, Math.max(10, targetProfitMarginPercent));

  const operationalCost = Math.round(safeHpp * (safeOpPercent / 100));
  const totalCostBase = safeHpp + operationalCost;

  let unroundedPrice = 0;
  if (totalCostBase > 0) {
    const marginFraction = safeMarginPercent / 100;
    unroundedPrice = totalCostBase / (1 - marginFraction);
  }

  const recommendedPrice = roundToNearest200(unroundedPrice);
  const actualGrossProfit = Math.max(0, recommendedPrice - totalCostBase);
  const actualMarginPercent =
    recommendedPrice > 0 ? (actualGrossProfit / recommendedPrice) * 100 : 0;

  const estimatedPosGrandTotal = Math.round(
    recommendedPrice * (1 + posTaxPercent / 100)
  );

  return {
    hpp: safeHpp,
    operationalPercent: safeOpPercent,
    operationalCost,
    totalCostBase,
    targetProfitMarginPercent: safeMarginPercent,
    unroundedPrice,
    recommendedPrice,
    actualGrossProfit,
    actualMarginPercent,
    posTaxPercent,
    estimatedPosGrandTotal,
  };
}
