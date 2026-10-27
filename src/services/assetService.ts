import { db } from '../lib/storage';
import {
  BusinessAsset,
  AssetCategory,
  AssetCondition,
  Expense,
  PaymentMethod,
} from '../types';

/**
 * Calculates straight-line depreciation for a fixed asset based on months elapsed.
 */
export function calculateAssetDepreciation(
  purchaseCost: number,
  salvageValue: number = 0,
  usefulLifeMonths: number = 36,
  purchaseDateStr: string = new Date().toISOString()
): {
  monthlyDepreciation: number;
  monthsElapsed: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
} {
  const safeCost = Math.max(0, purchaseCost);
  const safeSalvage = Math.max(0, Math.min(safeCost, salvageValue));
  const safeMonths = Math.max(1, usefulLifeMonths);

  const depreciableAmount = safeCost - safeSalvage;
  const monthlyDepreciation = Math.round(depreciableAmount / safeMonths);

  const purchaseDate = new Date(purchaseDateStr);
  const now = new Date();

  // Calculate elapsed months between purchase date and current date
  const yearDiff = now.getFullYear() - purchaseDate.getFullYear();
  const monthDiff = now.getMonth() - purchaseDate.getMonth();
  const rawMonthsElapsed = yearDiff * 12 + monthDiff;
  const monthsElapsed = Math.max(0, Math.min(safeMonths, rawMonthsElapsed));

  const accumulatedDepreciation = Math.min(
    depreciableAmount,
    monthlyDepreciation * monthsElapsed
  );
  const currentBookValue = Math.max(safeSalvage, safeCost - accumulatedDepreciation);

  return {
    monthlyDepreciation,
    monthsElapsed,
    accumulatedDepreciation,
    currentBookValue,
  };
}

export interface CreateAssetInput {
  name: string;
  code?: string;
  category: AssetCategory;
  purchaseCost: number;
  purchaseDate?: string;
  supplierName?: string;
  usefulLifeMonths?: number;
  salvageValue?: number;
  condition?: AssetCondition;
  location?: string;
  serialNumber?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  recordedBy?: string;
}

/**
 * Records a new fixed asset purchase (Capital Expenditure / Capex).
 * Automatically writes to both `db.assets` and `db.expenses` (as 'pembelian_alat')
 * so that cash outflows and financial reports reflect the investment accurately.
 */
export async function createAssetPurchase(
  input: CreateAssetInput
): Promise<{ asset: BusinessAsset; expense: Expense }> {
  const assetId = `asset-${Date.now()}`;
  const expenseId = `exp-asset-${Date.now()}`;
  const purchaseDate = input.purchaseDate || new Date().toISOString();
  const usefulLifeMonths = input.usefulLifeMonths || 36;
  const salvageValue = input.salvageValue || 0;
  const condition = input.condition || 'prima';
  const location = input.location || 'Bar Utama';
  const recordedBy = input.recordedBy || 'Hirakada (Owner)';

  let code = input.code?.trim();
  if (!code) {
    const count = await db.assets.count();
    const nextNum = count + 1;
    code = `AST-${nextNum < 10 ? '0' : ''}${nextNum}`;
  }

  const { monthlyDepreciation, accumulatedDepreciation, currentBookValue } =
    calculateAssetDepreciation(
      input.purchaseCost,
      salvageValue,
      usefulLifeMonths,
      purchaseDate
    );

  const newAsset: BusinessAsset = {
    id: assetId,
    code,
    name: input.name.trim(),
    category: input.category,
    purchaseDate,
    purchaseCost: Number(input.purchaseCost) || 0,
    supplierName: input.supplierName?.trim() || 'Vendor Toko',
    usefulLifeMonths,
    salvageValue,
    currentBookValue,
    monthlyDepreciation,
    accumulatedDepreciation,
    condition,
    location,
    serialNumber: input.serialNumber?.trim(),
    notes: input.notes?.trim(),
    expenseId,
  };

  // Add asset record
  await db.assets.put(newAsset);

  // Add corresponding expense record (Capex outflow)
  const newExpense: Expense = {
    id: expenseId,
    date: purchaseDate,
    category: 'pembelian_alat',
    amount: Number(input.purchaseCost) || 0,
    description: `Pembelian Aset Tetap: ${newAsset.name} (${newAsset.code}) - Vendor: ${newAsset.supplierName}`,
    paymentMethod: input.paymentMethod || 'cash',
    recordedBy,
    assetId,
  };
  await db.expenses.put(newExpense);

  // Add audit log
  await db.auditLogs.add({
    id: `audit-asset-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: 'usr-hirakada',
    actorName: recordedBy,
    action: 'PURCHASE_ASSET',
    entity: 'asset',
    entityId: newAsset.id,
    details: `Mencatat pembelian aset baru: ${newAsset.name} senilai Rp ${newAsset.purchaseCost.toLocaleString('id-ID')} (${newAsset.category})`,
  });

  return { asset: newAsset, expense: newExpense };
}

/**
 * Removes an asset and cleans up its linked expense if required.
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const asset = await db.assets.get(assetId);
  if (!asset) return;

  if (asset.expenseId) {
    await db.expenses.delete(asset.expenseId);
  }
  await db.assets.delete(assetId);

  await db.auditLogs.add({
    id: `audit-asset-del-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: 'usr-hirakada',
    actorName: 'Hirakada (Owner)',
    action: 'DELETE_ASSET',
    entity: 'asset',
    entityId: assetId,
    details: `Menghapus data aset: ${asset.name} (${asset.code})`,
  });
}
