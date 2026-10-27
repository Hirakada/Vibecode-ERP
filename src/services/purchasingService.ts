import { db } from '../lib/storage';
import {
  GoodsReceipt,
  GoodsReceiptItem,
  InventoryCostLayer,
  StockMovement,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseStatus,
  Expense,
} from '../types';

export interface CreatePurchaseOrderInput {
  supplierId: string;
  items: PurchaseOrderItem[];
  orderDiscount?: number;
  deliveryFee?: number;
  serviceFee?: number;
  notes?: string;
  orderedBy: string;
  instantReceive?: boolean; // If true, automatically confirm arrival and update stock immediately
}

export interface ConfirmArrivalItemInput {
  ingredientId: string;
  quantityReceived: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface ConfirmGoodsArrivalInput {
  purchaseOrderId: string;
  receivedBy: string;
  verifiedItems?: ConfirmArrivalItemInput[];
  notes?: string;
}

/**
 * Buat Transaksi Pembelian (Purchase Order)
 * Status awal: 'waiting' (Barang dibeli/dipesan, stok BELUM bertambah).
 */
export async function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  const supplier = await db.suppliers.get(input.supplierId);
  const supplierName = supplier ? supplier.name : 'Pemasok Umum';
  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10).replace(/-/g, '');
  const poNumber = `PO-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
  const poId = `po-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Hitung subtotal dan diskon per item
  let rawSubtotal = 0;
  let itemDiscountTotal = 0;

  const processedItems: PurchaseOrderItem[] = input.items.map((item) => {
    const rawTotal = (item.packQty || 1) * (item.pricePerPack || 0);
    const itemDisc = Math.min(rawTotal, Math.max(0, item.itemDiscount || 0));
    const netTotal = Math.max(0, rawTotal - itemDisc);
    const totalStock = (item.packQty || 1) * (item.contentPerPack || 1);

    rawSubtotal += rawTotal;
    itemDiscountTotal += itemDisc;

    return {
      ...item,
      totalStockPlanned: totalStock,
      itemRawTotal: rawTotal,
      itemDiscount: itemDisc,
      itemNetTotal: netTotal,
      quantityReceived: totalStock,
    };
  });

  const orderDiscount = Math.max(0, input.orderDiscount || 0);
  const deliveryFee = Math.max(0, input.deliveryFee || 0);
  const serviceFee = Math.max(0, input.serviceFee || 0);
  const grandTotal = Math.max(
    0,
    rawSubtotal - itemDiscountTotal - orderDiscount + deliveryFee + serviceFee
  );

  const po: PurchaseOrder = {
    id: poId,
    poNumber,
    orderDate: now,
    supplierId: input.supplierId,
    supplierName,
    status: 'waiting',
    items: processedItems,
    rawSubtotal,
    itemDiscountTotal,
    orderDiscount,
    deliveryFee,
    serviceFee,
    grandTotal,
    notes: input.notes,
    orderedBy: input.orderedBy,
  };

  await db.purchaseOrders.put(po);

  // Catat Audit Trail Pembelian Dibuat
  await db.auditLogs.add({
    id: `audit-${poId}-create`,
    timestamp: now,
    actorId: 'purchasing',
    actorName: input.orderedBy,
    action: 'PURCHASE_ORDER_CREATED',
    entity: 'purchases',
    entityId: poId,
    details: `PO #${poNumber} dibuat untuk ${supplierName} senilai Rp ${grandTotal.toLocaleString('id-ID')} (Ongkir: Rp ${deliveryFee.toLocaleString('id-ID')}, Admin: Rp ${serviceFee.toLocaleString('id-ID')}, Diskon Item: Rp ${itemDiscountTotal.toLocaleString('id-ID')}, Diskon Faktur: Rp ${orderDiscount.toLocaleString('id-ID')}). Status: Menunggu Kedatangan (waiting). Stok belum bertambah.`,
  });

  // Jika opsi instantReceive aktif (misal beli tunai langsung bawa barang):
  if (input.instantReceive) {
    await confirmGoodsArrivalAndStock({
      purchaseOrderId: po.id,
      receivedBy: input.orderedBy,
      notes: input.notes ? `${input.notes} (Penerimaan Langsung di Tempat)` : 'Penerimaan Langsung di Tempat',
    });
    return (await db.purchaseOrders.get(po.id)) || po;
  }

  return po;
}

/**
 * Konfirmasi Kedatangan Barang & Verifikasi Fisik (Waiting -> Arrived -> Update Stok)
 * Penerimaan barang bukan sekadar acc/konfirmasi saja, melainkan verifikasi fisik
 * yang mengaktifkan Cost Layer FIFO, mencatat no batch lot, dan mengupdate stok bahan baku.
 */
export async function confirmGoodsArrivalAndStock(
  input: ConfirmGoodsArrivalInput
): Promise<{ success: boolean; goodsReceipt: GoodsReceipt; purchaseOrder: PurchaseOrder }> {
  const po = await db.purchaseOrders.get(input.purchaseOrderId);
  if (!po) {
    throw new Error(`Purchase Order dengan ID "${input.purchaseOrderId}" tidak ditemukan.`);
  }

  if (po.status === 'arrived') {
    throw new Error(`PO #${po.poNumber} sudah berstatus Diterima (Arrived) sebelumnya.`);
  }

  if (po.status === 'cancelled') {
    throw new Error(`PO #${po.poNumber} telah dibatalkan dan tidak dapat diterima.`);
  }

  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10).replace(/-/g, '');
  const receiptNumber = `GR-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
  const receiptId = `gr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newLayers: InventoryCostLayer[] = [];
  const stockMovements: StockMovement[] = [];
  const goodsReceiptItems: GoodsReceiptItem[] = [];

  // Hitung faktor alokasi ongkir, admin fee, dan diskon faktur ke HPP bahan
  // Net pool = deliveryFee + serviceFee - orderDiscount
  const netOverheadPool = (po.deliveryFee || 0) + (po.serviceFee || 0) - (po.orderDiscount || 0);
  const totalItemNetBasis = po.items.reduce((sum, it) => sum + (it.itemNetTotal || 0), 0) || 1;

  for (const item of po.items) {
    const verified = input.verifiedItems?.find((v) => v.ingredientId === item.ingredientId);
    const quantityReceived = verified?.quantityReceived !== undefined ? verified.quantityReceived : item.totalStockPlanned;
    if (quantityReceived <= 0) continue;

    // Alokasi biaya bersih per item
    const itemProportion = item.itemNetTotal / totalItemNetBasis;
    const allocatedOverhead = netOverheadPool * itemProportion;
    const finalAllocatedTotalCost = Math.max(0, item.itemNetTotal + allocatedOverhead);
    const calculatedUnitCost = Math.max(
      0.01,
      Math.round((finalAllocatedTotalCost / quantityReceived) * 100) / 100
    );

    const batchNumber =
      verified?.batchNumber?.trim() ||
      item.batchNumber?.trim() ||
      `LOT-${dateStr}-${Math.floor(10 + Math.random() * 90)}`;

    const expiryDate = verified?.expiryDate || item.expiryDate;

    // 1. Buat Cost Layer FIFO
    const layerId = `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const costLayer: InventoryCostLayer = {
      id: layerId,
      ingredientId: item.ingredientId,
      batchNumber,
      receivedAt: now,
      initialQuantity: quantityReceived,
      remainingQuantity: quantityReceived,
      unitCost: calculatedUnitCost,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      purchaseOrderId: po.poNumber,
      expiryDate,
      isDepleted: false,
    };
    newLayers.push(costLayer);

    // 2. Tambah Stok Bahan Baku di Gudang
    const ingredient = await db.ingredients.get(item.ingredientId);
    if (ingredient) {
      ingredient.currentStock = Math.round((ingredient.currentStock + quantityReceived) * 1000) / 1000;
      await db.ingredients.put(ingredient);

      stockMovements.push({
        id: `mov-${receiptId}-${item.ingredientId}`,
        ingredientId: item.ingredientId,
        ingredientName: ingredient.name,
        timestamp: now,
        type: 'goods_receipt',
        quantity: quantityReceived,
        unit: item.unit,
        unitCost: calculatedUnitCost,
        referenceId: receiptNumber,
        notes: `Penerimaan Barang #${receiptNumber} (PO: ${po.poNumber}) dari ${po.supplierName} [Batch: ${batchNumber}]`,
        performedBy: input.receivedBy,
      });
    }

    goodsReceiptItems.push({
      ingredientId: item.ingredientId,
      quantity: quantityReceived,
      unit: item.unit,
      unitCost: calculatedUnitCost,
      batchNumber,
      expiryDate,
    });
  }

  // Simpan batch FIFO dan mutasi stok
  if (newLayers.length > 0) {
    await db.costLayers.bulkAdd(newLayers);
  }
  if (stockMovements.length > 0) {
    await db.stockMovements.bulkAdd(stockMovements);
  }

  // 3. Simpan Catatan Goods Receipt
  const goodsReceipt: GoodsReceipt = {
    id: receiptId,
    receiptNumber,
    purchaseOrderId: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    receivedAt: now,
    items: goodsReceiptItems,
    totalAmount: po.grandTotal,
    itemDiscountTotal: po.itemDiscountTotal,
    orderDiscount: po.orderDiscount,
    deliveryFee: po.deliveryFee,
    serviceFee: po.serviceFee,
    notes: input.notes || po.notes,
    receivedBy: input.receivedBy,
    verifiedPhysicalInspection: true,
  };
  await db.goodsReceipts.put(goodsReceipt);

  // 4. Update Status Purchase Order: 'waiting' -> 'arrived'
  po.status = 'arrived';
  po.receivedAt = now;
  po.receivedBy = input.receivedBy;
  po.receiptId = receiptId;
  po.receiptNumber = receiptNumber;
  await db.purchaseOrders.put(po);

  // 5. Catat ke Pengeluaran Kas (Expenses) agar sinkron dengan Laporan Keuangan
  const expenseId = `exp-po-${po.id}`;
  const expenseRecord: Expense = {
    id: expenseId,
    date: now,
    category: 'operasional',
    amount: po.grandTotal,
    description: `Pembelian Bahan Baku #${po.poNumber} (${po.supplierName}) - Lunas Diterima`,
    paymentMethod: 'cash',
    recordedBy: input.receivedBy,
  };
  await db.expenses.put(expenseRecord);

  // 6. Audit Trail Penerimaan Barang & Update Stok
  await db.auditLogs.add({
    id: `audit-${receiptId}-arrived`,
    timestamp: now,
    actorId: 'purchasing',
    actorName: input.receivedBy,
    action: 'GOODS_RECEIPT_ARRIVED',
    entity: 'purchases',
    entityId: po.id,
    details: `PO #${po.poNumber} tiba (Status: arrived). Penerimaan barang #${receiptNumber} senilai Rp ${po.grandTotal.toLocaleString('id-ID')} dari ${po.supplierName} diverifikasi fisik. Stok bahan baku diupdate & ${newLayers.length} cost layer FIFO diaktifkan oleh ${input.receivedBy}.`,
  });

  return { success: true, goodsReceipt, purchaseOrder: po };
}

/**
 * Batalkan Purchase Order yang masih waiting
 */
export async function cancelPurchaseOrder(
  poId: string,
  reason: string,
  cancelledBy: string
): Promise<PurchaseOrder> {
  const po = await db.purchaseOrders.get(poId);
  if (!po) throw new Error('Purchase Order tidak ditemukan.');
  if (po.status === 'arrived') {
    throw new Error('PO yang sudah berstatus Diterima (arrived) tidak dapat dibatalkan.');
  }

  po.status = 'cancelled';
  po.notes = po.notes ? `${po.notes} | Dibatalkan: ${reason}` : `Dibatalkan: ${reason}`;
  await db.purchaseOrders.put(po);

  await db.auditLogs.add({
    id: `audit-cancel-${poId}`,
    timestamp: new Date().toISOString(),
    actorId: 'purchasing',
    actorName: cancelledBy,
    action: 'PURCHASE_ORDER_CANCELLED',
    entity: 'purchases',
    entityId: poId,
    details: `PO #${po.poNumber} dibatalkan oleh ${cancelledBy}. Alasan: ${reason}.`,
  });

  return po;
}

/**
 * Backward compatibility: processGoodsReceipt (langsung arrived)
 */
export interface CreateGoodsReceiptInput {
  supplierId: string;
  items: GoodsReceiptItem[];
  notes?: string;
  receivedBy: string;
}

export async function processGoodsReceipt(input: CreateGoodsReceiptInput): Promise<GoodsReceipt> {
  const poItems: PurchaseOrderItem[] = input.items.map((it) => ({
    ingredientId: it.ingredientId,
    unit: it.unit,
    packQty: 1,
    contentPerPack: it.quantity,
    pricePerPack: Math.round(it.quantity * it.unitCost),
    totalStockPlanned: it.quantity,
    itemRawTotal: Math.round(it.quantity * it.unitCost),
    itemNetTotal: Math.round(it.quantity * it.unitCost),
    batchNumber: it.batchNumber,
    expiryDate: it.expiryDate,
    quantityReceived: it.quantity,
  }));

  const po = await createPurchaseOrder({
    supplierId: input.supplierId,
    items: poItems,
    notes: input.notes,
    orderedBy: input.receivedBy,
    instantReceive: true,
  });

  const receipt = await db.goodsReceipts.get(po.receiptId || '');
  if (receipt) return receipt;

  // Fallback direct
  const now = new Date().toISOString();
  return {
    id: `gr-${Date.now()}`,
    receiptNumber: `GR-${now.slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
    supplierId: input.supplierId,
    supplierName: po.supplierName,
    receivedAt: now,
    items: input.items,
    totalAmount: po.grandTotal,
    receivedBy: input.receivedBy,
  };
}

