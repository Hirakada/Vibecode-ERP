import Dexie, { Table } from 'dexie';
import {
  Ingredient,
  InventoryCostLayer,
  Product,
  Recipe,
  Sale,
  Supplier,
  GoodsReceipt,
  Expense,
  CashierShift,
  BusinessSettings,
  AuditLog,
  SyncOperation,
  StockMovement,
  UserProfile,
  MenuCategory,
  BusinessAsset,
} from '../types';

export class CaozyDatabase extends Dexie {
  ingredients!: Table<Ingredient, string>;
  costLayers!: Table<InventoryCostLayer, string>;
  products!: Table<Product, string>;
  categories!: Table<MenuCategory, string>;
  recipes!: Table<Recipe, string>;
  sales!: Table<Sale, string>;
  suppliers!: Table<Supplier, string>;
  goodsReceipts!: Table<GoodsReceipt, string>;
  expenses!: Table<Expense, string>;
  shifts!: Table<CashierShift, string>;
  settings!: Table<BusinessSettings & { id: string }, string>;
  auditLogs!: Table<AuditLog, string>;
  syncOutbox!: Table<SyncOperation, string>;
  stockMovements!: Table<StockMovement, string>;
  users!: Table<UserProfile, string>;
  assets!: Table<BusinessAsset, string>;
  purchaseOrders!: Table<import('../types').PurchaseOrder, string>;

  constructor() {
    super('CaozyBeverageERP_DB');
    this.version(1).stores({
      ingredients: 'id, code, category',
      costLayers: 'id, ingredientId, batchNumber, receivedAt, isDepleted',
      products: 'id, code, category, active',
      recipes: 'id, productId, version',
      sales: 'id, transactionNumber, createdAt, cashierId, status, syncStatus',
      suppliers: 'id, code, name',
      goodsReceipts: 'id, receiptNumber, receivedAt, supplierId',
      expenses: 'id, date, category',
      shifts: 'id, cashierId, status, openedAt',
      settings: 'id',
      auditLogs: 'id, timestamp, entity, actorId',
      syncOutbox: 'id, idempotencyKey, createdAt',
      stockMovements: 'id, ingredientId, timestamp, type',
      users: 'id, role',
    });
    this.version(2).stores({
      categories: 'id, name, displayOrder',
    });
    this.version(3).stores({
      assets: 'id, code, category, purchaseDate, condition',
    });
    this.version(4).stores({
      purchaseOrders: 'id, poNumber, supplierId, orderDate, status',
    });
  }
}

export const db = new CaozyDatabase();

// Single Owner user: Hirakada (Full Access)
export const DEMO_USERS: UserProfile[] = [
  {
    id: 'usr-hirakada',
    name: 'Hirakada',
    email: 'hirakada.id@gmail.com',
    role: 'owner',
    avatar: '👑',
  },
];

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'Caozy Kedai Minuman',
  tagline: 'Artisan Crafted Beverage & Coffee',
  address: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
  phone: '0812-3456-7890',
  receiptPaperWidth: '58mm',
  taxRatePercent: 10, // PB1 default 10% (POS +10% tax)
  receiptHeader: 'CAOZY KEDAI MINUMAN\nJakarta Selatan',
  receiptFooter: 'Terima kasih telah berkunjung!\nFollow IG: @caozy.id\nOwner: Hirakada',
  allowNegativeStock: false,
  offlineConfirmationAllowed: true,
  storeIcon: '🌿',
};

// Clean slate initial data - ready for manual creation by Hirakada
export const INITIAL_INGREDIENTS: Ingredient[] = [];
export const INITIAL_COST_LAYERS: InventoryCostLayer[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_RECIPES: Recipe[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_SHIFT: CashierShift = {
  id: 'shift-current',
  cashierId: 'usr-hirakada',
  cashierName: 'Hirakada',
  openedAt: new Date().toISOString(),
  openingCash: 0,
  expectedClosingCash: 0,
  status: 'open',
  totalSalesCash: 0,
  totalSalesNonCash: 0,
  totalExpenses: 0,
};

/**
 * Completely wipe all sample data so the user can create and input products,
 * ingredients, recipes, and transactions manually.
 */
export async function resetAllDataToCleanSlate(): Promise<void> {
  await db.products.clear();
  if (db.categories) await db.categories.clear();
  await db.ingredients.clear();
  await db.recipes.clear();
  await db.costLayers.clear();
  await db.suppliers.clear();
  await db.sales.clear();
  await db.stockMovements.clear();
  await db.expenses.clear();
  if (db.assets) await db.assets.clear();
  await db.shifts.clear();
  await db.auditLogs.clear();
  await db.users.clear();

  await db.users.bulkAdd(DEMO_USERS);
  await db.settings.put({ ...DEFAULT_SETTINGS, id: 'global-settings' });
  await db.shifts.put(INITIAL_SHIFT);
  await db.auditLogs.add({
    id: `audit-clean-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorId: 'usr-hirakada',
    actorName: 'Hirakada (Owner)',
    action: 'CLEAN_SLATE_RESET',
    entity: 'database',
    entityId: 'global',
    details: 'Database dikosongkan untuk input data menu produk dan stok secara manual oleh Hirakada.',
  });
  localStorage.setItem('caozy_cleaned_manual_v1', 'true');
}

export async function initializeDatabaseIfEmpty(): Promise<void> {
  // Check if old dummy data is present or manual clean hasn't executed
  const hasCleaned = localStorage.getItem('caozy_cleaned_manual_v1');
  const user = await db.users.get('usr-hirakada');
  const oldOwner = await db.users.get('usr-owner');

  if (!hasCleaned || !user || oldOwner) {
    await resetAllDataToCleanSlate();
    return;
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkAdd(DEMO_USERS);
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put({ ...DEFAULT_SETTINGS, id: 'global-settings' });
  } else {
    const existing = await db.settings.get('global-settings');
    if (existing && (!existing.taxRatePercent || existing.taxRatePercent === 0)) {
      await db.settings.update('global-settings', { taxRatePercent: 10 });
    }
  }

  const shiftCount = await db.shifts.count();
  if (shiftCount === 0) {
    await db.shifts.put(INITIAL_SHIFT);
  }
}
