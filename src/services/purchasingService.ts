import { db } from '../lib/storage';
import { GoodsReceipt, GoodsReceiptItem, InventoryCostLayer, StockMovement } from '../types';

export interface CreateGoodsReceiptInput {
  supplierId: string;
  items: GoodsReceiptItem[];
  notes?: string;
  receivedBy: string;
}

export async function processGoodsReceipt(input: CreateGoodsReceiptInput): Promise<GoodsReceipt> {
  const supplier = await db.suppliers.get(input.supplierId);
  const supplierName = supplier ? supplier.name : 'Pemasok Umum';
  const receiptNumber = `GR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    100 + Math.random() * 900
  )}`;
  const receiptId = `gr-${Date.now()}`;
  const now = new Date().toISOString();

  let totalAmount = 0;
  const newLayers: InventoryCostLayer[] = [];
  const stockMovements: StockMovement[] = [];

  for (const item of input.items) {
    const itemTotal = item.quantity * item.unitCost;
    totalAmount += itemTotal;

    const layerId = `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const batchNumber = item.batchNumber || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;

    const newLayer: InventoryCostLayer = {
      id: layerId,
      ingredientId: item.ingredientId,
      batchNumber,
      receivedAt: now,
      initialQuantity: item.quantity,
      remainingQuantity: item.quantity,
      unitCost: item.unitCost,
      supplierId: input.supplierId,
      supplierName,
      purchaseOrderId: receiptNumber,
      expiryDate: item.expiryDate,
      isDepleted: false,
    };
    newLayers.push(newLayer);

    const ingredient = await db.ingredients.get(item.ingredientId);
    if (ingredient) {
      ingredient.currentStock += item.quantity;
      await db.ingredients.put(ingredient);

      stockMovements.push({
        id: `mov-${receiptId}-${item.ingredientId}`,
        ingredientId: item.ingredientId,
        ingredientName: ingredient.name,
        timestamp: now,
        type: 'goods_receipt',
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        referenceId: receiptNumber,
        notes: `Penerimaan Barang #${receiptNumber} dari ${supplierName} (Batch: ${batchNumber})`,
        performedBy: input.receivedBy,
      });
    }
  }

  // Persist new FIFO layers
  await db.costLayers.bulkAdd(newLayers);

  // Persist stock movements
  await db.stockMovements.bulkAdd(stockMovements);

  // Persist Goods Receipt record
  const receipt: GoodsReceipt = {
    id: receiptId,
    receiptNumber,
    supplierId: input.supplierId,
    supplierName,
    receivedAt: now,
    items: input.items,
    totalAmount: Math.round(totalAmount),
    notes: input.notes,
    receivedBy: input.receivedBy,
  };
  await db.goodsReceipts.put(receipt);

  // Audit log
  await db.auditLogs.add({
    id: `audit-${receiptId}`,
    timestamp: now,
    actorId: 'inventory',
    actorName: input.receivedBy,
    action: 'GOODS_RECEIPT',
    entity: 'purchases',
    entityId: receiptId,
    details: `Penerimaan barang #${receiptNumber} senilai Rp ${totalAmount.toLocaleString('id-ID')} dari ${supplierName}. Terbuat ${newLayers.length} FIFO cost layers.`,
  });

  return receipt;
}
