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
} from '../types';

export class CaozyDatabase extends Dexie {
  ingredients!: Table<Ingredient, string>;
  costLayers!: Table<InventoryCostLayer, string>;
  products!: Table<Product, string>;
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
  }
}

export const db = new CaozyDatabase();

// Default demo users
export const DEMO_USERS: UserProfile[] = [
  {
    id: 'usr-owner',
    name: 'Budi Santoso',
    email: 'budi.owner@caozy.id',
    role: 'owner',
    avatar: '👨‍💼',
  },
  {
    id: 'usr-cashier',
    name: 'Siti Rahma',
    email: 'siti.kasir@caozy.id',
    role: 'cashier',
    avatar: '👩‍🍳',
  },
  {
    id: 'usr-inventory',
    name: 'Joko Susilo',
    email: 'joko.gudang@caozy.id',
    role: 'inventory',
    avatar: '📦',
  },
  {
    id: 'usr-finance',
    name: 'Dewi Lestari',
    email: 'dewi.finance@caozy.id',
    role: 'finance',
    avatar: '💼',
  },
];

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'Caozy Kedai Minuman',
  tagline: 'Artisan Crafted Beverage & Coffee',
  address: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
  phone: '0812-3456-7890',
  receiptPaperWidth: '58mm',
  taxRatePercent: 0, // PB1 default 0% or customizable
  receiptHeader: 'CAOZY KEDAI MINUMAN\nJakarta Selatan',
  receiptFooter: 'Terima kasih telah berkunjung!\nFollow IG: @caozy.id\nSaran & Kritik: 0812-3456-7890',
  allowNegativeStock: false,
  offlineConfirmationAllowed: true,
};

export const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing-arabica',
    code: 'ING-001',
    name: 'Biji Kopi Arabica Aceh Gayo',
    category: 'coffee',
    baseUnit: 'g',
    minStock: 1000,
    currentStock: 3800,
    notes: 'Roast profile: Medium dark',
  },
  {
    id: 'ing-milk',
    code: 'ING-002',
    name: 'Susu Segar (Fresh Milk)',
    category: 'dairy',
    baseUnit: 'ml',
    minStock: 4000,
    currentStock: 12000,
    notes: 'Penyimpanan chiller 4C',
  },
  {
    id: 'ing-oatmilk',
    code: 'ING-003',
    name: 'Oat Milk Barista Edition',
    category: 'dairy',
    baseUnit: 'ml',
    minStock: 2000,
    currentStock: 4500,
    notes: 'Plant-based alternative',
  },
  {
    id: 'ing-aren',
    code: 'ING-004',
    name: 'Sirup Gula Aren Organik',
    category: 'syrup',
    baseUnit: 'ml',
    minStock: 1000,
    currentStock: 2500,
    notes: 'Kekentalan tinggi asli nira aren',
  },
  {
    id: 'ing-matcha',
    code: 'ING-005',
    name: 'Bubuk Matcha Ceremonial Uji',
    category: 'tea',
    baseUnit: 'g',
    minStock: 500,
    currentStock: 950,
    notes: 'Impor Jepang grade ceremonial',
  },
  {
    id: 'ing-earlgrey',
    code: 'ING-006',
    name: 'Daun Teh Earl Grey Premium',
    category: 'tea',
    baseUnit: 'g',
    minStock: 500,
    currentStock: 1200,
  },
  {
    id: 'ing-boba',
    code: 'ING-007',
    name: 'Boba Brown Sugar Pearl',
    category: 'topping',
    baseUnit: 'g',
    minStock: 1000,
    currentStock: 2600,
    notes: 'Dimasak fresh tiap 4 jam',
  },
  {
    id: 'ing-yuzu',
    code: 'ING-008',
    name: 'Puree Buah Yuzu Citrus',
    category: 'syrup',
    baseUnit: 'ml',
    minStock: 800,
    currentStock: 1800,
  },
  {
    id: 'ing-cup16',
    code: 'PKG-001',
    name: 'Cup PET Caozy 16oz + Tutup Dome',
    category: 'packaging',
    baseUnit: 'pcs',
    minStock: 200,
    currentStock: 750,
  },
  {
    id: 'ing-straw',
    code: 'PKG-002',
    name: 'Sedotan Ramah Lingkungan PLA',
    category: 'packaging',
    baseUnit: 'pcs',
    minStock: 200,
    currentStock: 800,
  },
];

export const INITIAL_COST_LAYERS: InventoryCostLayer[] = [
  // Arabica Coffee: Batch 1 (older) & Batch 2 (newer)
  {
    id: 'layer-coffee-01',
    ingredientId: 'ing-arabica',
    batchNumber: 'LOT-KOP-20261018-01',
    receivedAt: '2026-10-18T08:30:00Z',
    initialQuantity: 2000,
    remainingQuantity: 800,
    unitCost: 120, // Rp 120 / gram
    supplierName: 'PT Kopi Nusantara Mandiri',
    expiryDate: '2027-04-18',
    isDepleted: false,
  },
  {
    id: 'layer-coffee-02',
    ingredientId: 'ing-arabica',
    batchNumber: 'LOT-KOP-20261024-02',
    receivedAt: '2026-10-24T09:15:00Z',
    initialQuantity: 3000,
    remainingQuantity: 3000,
    unitCost: 135, // Rp 135 / gram
    supplierName: 'PT Kopi Nusantara Mandiri',
    expiryDate: '2027-04-24',
    isDepleted: false,
  },
  // Fresh Milk: Batch 1 & Batch 2
  {
    id: 'layer-milk-01',
    ingredientId: 'ing-milk',
    batchNumber: 'LOT-MLK-20261022-01',
    receivedAt: '2026-10-22T06:00:00Z',
    initialQuantity: 5000,
    remainingQuantity: 2000,
    unitCost: 22, // Rp 22 / ml
    supplierName: 'CV Dairy Segar Bersama',
    expiryDate: '2026-11-05',
    isDepleted: false,
  },
  {
    id: 'layer-milk-02',
    ingredientId: 'ing-milk',
    batchNumber: 'LOT-MLK-20261025-02',
    receivedAt: '2026-10-25T06:00:00Z',
    initialQuantity: 10000,
    remainingQuantity: 10000,
    unitCost: 24, // Rp 24 / ml
    supplierName: 'CV Dairy Segar Bersama',
    expiryDate: '2026-11-08',
    isDepleted: false,
  },
  // Oat Milk
  {
    id: 'layer-oatmilk-01',
    ingredientId: 'ing-oatmilk',
    batchNumber: 'LOT-OAT-20261020-01',
    receivedAt: '2026-10-20T10:00:00Z',
    initialQuantity: 5000,
    remainingQuantity: 4500,
    unitCost: 48, // Rp 48 / ml
    supplierName: 'CV Dairy Segar Bersama',
    expiryDate: '2027-01-20',
    isDepleted: false,
  },
  // Gula Aren
  {
    id: 'layer-aren-01',
    ingredientId: 'ing-aren',
    batchNumber: 'LOT-ARN-20261021-01',
    receivedAt: '2026-10-21T11:00:00Z',
    initialQuantity: 3000,
    remainingQuantity: 2500,
    unitCost: 45, // Rp 45 / ml
    supplierName: 'Aneka Sirup Prima',
    expiryDate: '2027-02-21',
    isDepleted: false,
  },
  // Matcha
  {
    id: 'layer-matcha-01',
    ingredientId: 'ing-matcha',
    batchNumber: 'LOT-MTC-20261015-01',
    receivedAt: '2026-10-15T14:00:00Z',
    initialQuantity: 1000,
    remainingQuantity: 950,
    unitCost: 280, // Rp 280 / gram
    supplierName: 'PT Impor Rasa Asia',
    expiryDate: '2027-10-15',
    isDepleted: false,
  },
  // Earl Grey Tea
  {
    id: 'layer-earlgrey-01',
    ingredientId: 'ing-earlgrey',
    batchNumber: 'LOT-EGT-20261019-01',
    receivedAt: '2026-10-19T09:00:00Z',
    initialQuantity: 1500,
    remainingQuantity: 1200,
    unitCost: 110, // Rp 110 / gram
    supplierName: 'PT Impor Rasa Asia',
    expiryDate: '2027-10-19',
    isDepleted: false,
  },
  // Boba
  {
    id: 'layer-boba-01',
    ingredientId: 'ing-boba',
    batchNumber: 'LOT-BBA-20261023-01',
    receivedAt: '2026-10-23T15:00:00Z',
    initialQuantity: 3000,
    remainingQuantity: 2600,
    unitCost: 35, // Rp 35 / gram
    supplierName: 'Aneka Sirup Prima',
    expiryDate: '2027-01-23',
    isDepleted: false,
  },
  // Yuzu
  {
    id: 'layer-yuzu-01',
    ingredientId: 'ing-yuzu',
    batchNumber: 'LOT-YZU-20261020-01',
    receivedAt: '2026-10-20T16:00:00Z',
    initialQuantity: 2000,
    remainingQuantity: 1800,
    unitCost: 95, // Rp 95 / ml
    supplierName: 'Aneka Sirup Prima',
    expiryDate: '2027-03-20',
    isDepleted: false,
  },
  // Cups
  {
    id: 'layer-cup-01',
    ingredientId: 'ing-cup16',
    batchNumber: 'LOT-CUP-20261010-01',
    receivedAt: '2026-10-10T10:00:00Z',
    initialQuantity: 1000,
    remainingQuantity: 750,
    unitCost: 650, // Rp 650 / pcs
    supplierName: 'PT Kemasan Jaya Sentosa',
    isDepleted: false,
  },
  // Straws
  {
    id: 'layer-straw-01',
    ingredientId: 'ing-straw',
    batchNumber: 'LOT-STR-20261010-01',
    receivedAt: '2026-10-10T10:00:00Z',
    initialQuantity: 1000,
    remainingQuantity: 800,
    unitCost: 150, // Rp 150 / pcs
    supplierName: 'PT Kemasan Jaya Sentosa',
    isDepleted: false,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-kopsus-aren',
    code: 'BVG-01',
    name: 'Kopi Susu Gula Aren',
    category: 'coffee',
    description: 'Double espresso Arabica Gayo, fresh milk creamy, dan nira gula aren asli.',
    basePrice: 22000,
    active: true,
    recipeId: 'rec-kopsus-aren',
    variants: [
      { id: 'var-reg-16', name: 'Regular 16oz', priceDelta: 0 },
      { id: 'var-lrg-22', name: 'Large 22oz', priceDelta: 5000 },
    ],
    modifiers: [
      { id: 'mod-boba', name: 'Topping Boba Aren', price: 4000 },
      { id: 'mod-ext-shot', name: 'Extra Espresso Shot', price: 5000 },
      { id: 'mod-oatmilk', name: 'Tukar Oat Milk', price: 6000 },
      { id: 'mod-less-sugar', name: 'Less Sugar 50%', price: 0 },
      { id: 'mod-less-ice', name: 'Less Ice', price: 0 },
    ],
  },
  {
    id: 'prod-matcha-latte',
    code: 'BVG-02',
    name: 'Ceremonial Matcha Latte',
    category: 'tea',
    description: 'Matcha Uji Jepang asli whisked segar dengan fresh milk gurih & manis pas.',
    basePrice: 25000,
    active: true,
    recipeId: 'rec-matcha-latte',
    variants: [
      { id: 'var-reg-16', name: 'Regular 16oz', priceDelta: 0 },
      { id: 'var-lrg-22', name: 'Large 22oz', priceDelta: 5000 },
    ],
    modifiers: [
      { id: 'mod-boba', name: 'Topping Boba Aren', price: 4000 },
      { id: 'mod-oatmilk', name: 'Tukar Oat Milk', price: 6000 },
      { id: 'mod-less-sugar', name: 'Less Sugar 50%', price: 0 },
    ],
  },
  {
    id: 'prod-earlgrey-tea',
    code: 'BVG-03',
    name: 'Earl Grey Milk Tea Boba',
    category: 'tea',
    description: 'Aroma bergamot khas Earl Grey, seduhan pekat dengan susu dan boba brown sugar kenyal.',
    basePrice: 26000,
    active: true,
    recipeId: 'rec-earlgrey-tea',
    variants: [
      { id: 'var-reg-16', name: 'Regular 16oz', priceDelta: 0 },
      { id: 'var-lrg-22', name: 'Large 22oz', priceDelta: 5000 },
    ],
    modifiers: [
      { id: 'mod-ext-shot', name: 'Add Espresso (Dirty Tea)', price: 5000 },
      { id: 'mod-less-sugar', name: 'Less Sugar 50%', price: 0 },
    ],
  },
  {
    id: 'prod-yuzu-lemonade',
    code: 'BVG-04',
    name: 'Sparkling Yuzu Lemonade',
    category: 'mocktail',
    description: 'Sensasi segar bulir yuzu jepang, sparkling soda dingin, dan perasan jeruk lemon.',
    basePrice: 24000,
    active: true,
    recipeId: 'rec-yuzu-lemonade',
    variants: [
      { id: 'var-reg-16', name: 'Regular 16oz', priceDelta: 0 },
    ],
    modifiers: [
      { id: 'mod-boba', name: 'Topping Boba Aren', price: 4000 },
      { id: 'mod-less-ice', name: 'Less Ice', price: 0 },
    ],
  },
  {
    id: 'prod-coldbrew',
    code: 'BVG-05',
    name: 'Classic Cold Brew Black',
    category: 'coffee',
    description: 'Arabica direndam dingin 16 jam, notes cokelat hitam, clean aftertaste dan low acidity.',
    basePrice: 20000,
    active: true,
    recipeId: 'rec-coldbrew',
    variants: [
      { id: 'var-reg-16', name: 'Regular 16oz', priceDelta: 0 },
    ],
    modifiers: [
      { id: 'mod-aren', name: 'Add Sirup Aren', price: 3000 },
    ],
  },
];

export const INITIAL_RECIPES: Recipe[] = [
  // Kopi Susu Aren: 18g Arabica, 120ml Susu, 25ml Aren, 1 Cup, 1 Sedotan
  {
    id: 'rec-kopsus-aren',
    productId: 'prod-kopsus-aren',
    version: 1,
    effectiveDate: '2026-10-01',
    items: [
      { ingredientId: 'ing-arabica', quantity: 18, unit: 'g' },
      { ingredientId: 'ing-milk', quantity: 120, unit: 'ml' },
      { ingredientId: 'ing-aren', quantity: 25, unit: 'ml' },
      { ingredientId: 'ing-cup16', quantity: 1, unit: 'pcs', isPackaging: true },
      { ingredientId: 'ing-straw', quantity: 1, unit: 'pcs', isPackaging: true },
    ],
  },
  // Matcha Latte: 12g Matcha, 150ml Susu, 1 Cup, 1 Sedotan
  {
    id: 'rec-matcha-latte',
    productId: 'prod-matcha-latte',
    version: 1,
    effectiveDate: '2026-10-01',
    items: [
      { ingredientId: 'ing-matcha', quantity: 12, unit: 'g' },
      { ingredientId: 'ing-milk', quantity: 150, unit: 'ml' },
      { ingredientId: 'ing-cup16', quantity: 1, unit: 'pcs', isPackaging: true },
      { ingredientId: 'ing-straw', quantity: 1, unit: 'pcs', isPackaging: true },
    ],
  },
  // Earl Grey Milk Tea: 15g Teh, 100ml Susu, 40g Boba, 1 Cup, 1 Sedotan
  {
    id: 'rec-earlgrey-tea',
    productId: 'prod-earlgrey-tea',
    version: 1,
    effectiveDate: '2026-10-01',
    items: [
      { ingredientId: 'ing-earlgrey', quantity: 15, unit: 'g' },
      { ingredientId: 'ing-milk', quantity: 100, unit: 'ml' },
      { ingredientId: 'ing-boba', quantity: 40, unit: 'g' },
      { ingredientId: 'ing-cup16', quantity: 1, unit: 'pcs', isPackaging: true },
      { ingredientId: 'ing-straw', quantity: 1, unit: 'pcs', isPackaging: true },
    ],
  },
  // Yuzu Lemonade: 30ml Yuzu, 1 Cup, 1 Sedotan
  {
    id: 'rec-yuzu-lemonade',
    productId: 'prod-yuzu-lemonade',
    version: 1,
    effectiveDate: '2026-10-01',
    items: [
      { ingredientId: 'ing-yuzu', quantity: 30, unit: 'ml' },
      { ingredientId: 'ing-cup16', quantity: 1, unit: 'pcs', isPackaging: true },
      { ingredientId: 'ing-straw', quantity: 1, unit: 'pcs', isPackaging: true },
    ],
  },
  // Cold Brew: 20g Arabica, 1 Cup, 1 Sedotan
  {
    id: 'rec-coldbrew',
    productId: 'prod-coldbrew',
    version: 1,
    effectiveDate: '2026-10-01',
    items: [
      { ingredientId: 'ing-arabica', quantity: 20, unit: 'g' },
      { ingredientId: 'ing-cup16', quantity: 1, unit: 'pcs', isPackaging: true },
      { ingredientId: 'ing-straw', quantity: 1, unit: 'pcs', isPackaging: true },
    ],
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-kopi',
    code: 'SUP-01',
    name: 'PT Kopi Nusantara Mandiri',
    contactPerson: 'Bpk. Hendra Gunawan',
    phone: '0811-2233-4455',
    email: 'sales@kopinusantara.co.id',
    address: 'Kawasan Pergudangan Pluit Blok C4, Jakarta Utara',
  },
  {
    id: 'sup-dairy',
    code: 'SUP-02',
    name: 'CV Dairy Segar Bersama',
    contactPerson: 'Ibu Ratna Sari',
    phone: '0812-9988-7766',
    email: 'order@dairysegar.com',
    address: 'Jl. Raya Bogor Km 28, Cimanggis, Depok',
  },
  {
    id: 'sup-kemasan',
    code: 'SUP-03',
    name: 'PT Kemasan Jaya Sentosa',
    contactPerson: 'Bpk. Kevin Tan',
    phone: '0813-4455-6677',
    email: 'info@kemasanjaya.id',
    address: 'Kawasan Industri Dadap, Tangerang',
  },
  {
    id: 'sup-sirup',
    code: 'SUP-04',
    name: 'Aneka Sirup Prima',
    contactPerson: 'Bpk. Aris Munandar',
    phone: '0815-6677-8899',
    address: 'Pasar Santa Lt. 2, Kebayoran Baru, Jakarta Selatan',
  },
];

export const INITIAL_SHIFT: CashierShift = {
  id: 'shift-current',
  cashierId: 'usr-cashier',
  cashierName: 'Siti Rahma',
  openedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  openingCash: 200000,
  expectedClosingCash: 200000,
  status: 'open',
  totalSalesCash: 0,
  totalSalesNonCash: 0,
  totalExpenses: 0,
};

export async function initializeDatabaseIfEmpty(): Promise<void> {
  const productCount = await db.products.count();
  if (productCount === 0) {
    await db.users.bulkAdd(DEMO_USERS);
    await db.settings.put({ ...DEFAULT_SETTINGS, id: 'global-settings' });
    await db.ingredients.bulkAdd(INITIAL_INGREDIENTS);
    await db.costLayers.bulkAdd(INITIAL_COST_LAYERS);
    await db.products.bulkAdd(INITIAL_PRODUCTS);
    await db.recipes.bulkAdd(INITIAL_RECIPES);
    await db.suppliers.bulkAdd(INITIAL_SUPPLIERS);
    await db.shifts.put(INITIAL_SHIFT);

    // Initial stock movement audit
    const movements: StockMovement[] = INITIAL_COST_LAYERS.map((layer) => ({
      id: `mov-init-${layer.id}`,
      ingredientId: layer.ingredientId,
      ingredientName: INITIAL_INGREDIENTS.find((i) => i.id === layer.ingredientId)?.name || 'Bahan',
      timestamp: layer.receivedAt,
      type: 'goods_receipt',
      quantity: layer.initialQuantity,
      unit: INITIAL_INGREDIENTS.find((i) => i.id === layer.ingredientId)?.baseUnit || 'g',
      unitCost: layer.unitCost,
      referenceId: layer.batchNumber,
      notes: `Stok Awal Saldo Batch ${layer.batchNumber}`,
      performedBy: 'Sistem Inisialisasi',
    }));
    await db.stockMovements.bulkAdd(movements);

    await db.auditLogs.add({
      id: 'audit-init',
      timestamp: new Date().toISOString(),
      actorId: 'system',
      actorName: 'Sistem Caozy ERP',
      action: 'INITIALIZE_SYSTEM',
      entity: 'database',
      entityId: 'global',
      details: 'Inisialisasi data awal produk, bahan baku, batch FIFO, dan shift kasir.',
    });
  }
}
