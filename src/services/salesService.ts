import { db } from '../lib/storage';
import { allocateFifoLayers } from '../lib/fifo';
import { syncService } from './syncService';
import {
  Sale,
  SaleItem,
  PaymentMethod,
  PaymentRecord,
  StockMovement,
  SaleCostAllocation,
  InventoryCostLayer,
} from '../types';

export interface CheckoutRequest {
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountInfo?: import('../types').DiscountInfo;
  tax: number;
  grandTotal: number;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  externalReference?: string;
  notes?: string;
  isOffline?: boolean;
}

export async function processSale(req: CheckoutRequest): Promise<{ sale: Sale; success: boolean; error?: string }> {
  const transactionNumber = `CAOZY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
  const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // 1. Calculate required ingredients from recipes
  const ingredientRequirements: Record<string, number> = {};
  const recipes = await db.recipes.toArray();

  for (const item of req.items) {
    const product = await db.products.get(item.productId);
    if (!product || !product.recipeId) continue;
    const recipe = recipes.find((r) => r.id === product.recipeId);
    if (!recipe) continue;

    for (const recipeItem of recipe.items) {
      const needed = recipeItem.quantity * item.quantity;
      ingredientRequirements[recipeItem.ingredientId] =
        (ingredientRequirements[recipeItem.ingredientId] || 0) + needed;
    }
  }

  // 2. Perform FIFO allocation for each required ingredient
  const costAllocations: SaleCostAllocation[] = [];
  const stockMovements: StockMovement[] = [];
  let totalCogs = 0;
  const layersToUpdate: InventoryCostLayer[] = [];

  for (const [ingredientId, requiredQty] of Object.entries(ingredientRequirements)) {
    const ingredient = await db.ingredients.get(ingredientId);
    if (!ingredient) continue;

    const layers = await db.costLayers
      .where('ingredientId')
      .equals(ingredientId)
      .and((l) => !l.isDepleted && l.remainingQuantity > 0)
      .toArray();

    const fifoResult = allocateFifoLayers(layers, requiredQty, false);

    if (!fifoResult.isSufficient) {
      return {
        sale: null as any,
        success: false,
        error: `Stok bahan '${ingredient.name}' tidak mencukupi! Kurang ${fifoResult.shortage} ${ingredient.baseUnit}`,
      };
    }

    costAllocations.push(...fifoResult.allocations);
    totalCogs += fifoResult.totalCogs;
    layersToUpdate.push(...fifoResult.updatedLayers);

    // Update ingredient stock balance
    ingredient.currentStock = Math.max(0, ingredient.currentStock - requiredQty);
    await db.ingredients.put(ingredient);

    // Create stock movement record
    stockMovements.push({
      id: `mov-${saleId}-${ingredientId}`,
      ingredientId,
      ingredientName: ingredient.name,
      timestamp: now,
      type: 'sale_consumption',
      quantity: -requiredQty,
      unit: ingredient.baseUnit,
      referenceId: transactionNumber,
      notes: `Penjualan POS #${transactionNumber}`,
      performedBy: req.cashierName,
    });
  }

  // Persist updated FIFO layers
  for (const layer of layersToUpdate) {
    await db.costLayers.put(layer);
  }

  // Persist stock movements
  if (stockMovements.length > 0) {
    await db.stockMovements.bulkAdd(stockMovements);
  }

  // 3. Assemble Payment Record
  const payment: PaymentRecord = {
    paymentId: `pay-${saleId}`,
    method: req.paymentMethod,
    amountPaid: req.amountPaid,
    change: req.change,
    confirmedAt: now,
    confirmedBy: req.cashierName,
    externalReference: req.externalReference,
    notes: req.notes,
  };

  // 4. Assemble Sale entity
  const sale: Sale = {
    id: saleId,
    transactionNumber,
    createdAt: now,
    cashierId: req.cashierId,
    cashierName: req.cashierName,
    shiftId: req.shiftId,
    items: req.items,
    subtotal: req.subtotal,
    discount: req.discount,
    discountInfo: req.discountInfo,
    tax: req.tax,
    grandTotal: req.grandTotal,
    status: 'completed',
    syncStatus: req.isOffline ? 'pending_sync' : 'synced',
    payment,
    costAllocations,
    totalCogs: Math.round(totalCogs),
    grossProfit: Math.round(req.grandTotal - totalCogs),
    offlineCreated: req.isOffline,
  };

  await db.sales.put(sale);

  // 5. Update shift cash reconciliation
  const shift = await db.shifts.get(req.shiftId);
  if (shift && shift.status === 'open') {
    if (req.paymentMethod === 'cash') {
      shift.totalSalesCash += req.grandTotal;
      shift.expectedClosingCash += req.grandTotal;
    } else {
      shift.totalSalesNonCash += req.grandTotal;
    }
    await db.shifts.put(shift);
  }

  // 6. Audit log with discount detail
  const discountLog = req.discount > 0
    ? ` Diskon: Rp ${req.discount.toLocaleString('id-ID')} (${req.discountInfo?.reason || 'Diskon'}${
        req.discountInfo?.approvedBy ? `, Otorisasi: ${req.discountInfo.approvedBy}` : ''
      }).`
    : '';

  await db.auditLogs.add({
    id: `audit-${saleId}`,
    timestamp: now,
    actorId: req.cashierId,
    actorName: req.cashierName,
    action: 'CREATE_SALE',
    entity: 'sales',
    entityId: saleId,
    details: `Transaksi POS #${transactionNumber} senilai Rp ${req.grandTotal.toLocaleString(
      'id-ID'
    )} (${req.paymentMethod}) diselesaikan.${discountLog} HPP: Rp ${totalCogs.toLocaleString('id-ID')}`,
  });

  // 7. If offline, register to sync outbox
  if (req.isOffline) {
    await db.syncOutbox.add({
      id: `sync-${saleId}`,
      operationType: 'create_sale',
      payload: sale,
      createdAt: now,
      retryCount: 0,
      idempotencyKey: `idemp-${saleId}`,
    });
  }

  await syncService.refreshStatus();

  return { sale, success: true };
}

/**
 * Mark transaction as reprinted and increment audit counter
 */
export async function logReceiptReprint(saleId: string, performedBy: string): Promise<Sale | undefined> {
  const sale = await db.sales.get(saleId);
  if (!sale) return undefined;

  sale.isReprinted = true;
  sale.reprintCount = (sale.reprintCount || 0) + 1;
  await db.sales.put(sale);

  await db.auditLogs.add({
    id: `audit-reprint-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: 'cashier',
    actorName: performedBy,
    action: 'REPRINT_RECEIPT',
    entity: 'sales',
    entityId: saleId,
    details: `Cetak ulang struk #${sale.transactionNumber} (Reprint ke-${sale.reprintCount})`,
  });

  return sale;
}
