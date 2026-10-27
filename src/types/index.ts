export type Role = 'owner' | 'manager' | 'cashier' | 'inventory' | 'finance';

export type Permission =
  | 'access_admin'
  | 'access_pos'
  | 'view_sales'
  | 'create_sales'
  | 'confirm_payments'
  | 'apply_discounts'
  | 'void_transactions'
  | 'process_refunds'
  | 'reprint_receipts'
  | 'manage_products'
  | 'manage_recipes'
  | 'receive_purchases'
  | 'adjust_inventory'
  | 'view_purchase_costs'
  | 'manage_expenses'
  | 'reconcile_cash'
  | 'view_financial_reports'
  | 'manage_users'
  | 'change_settings'
  | 'view_audit_logs';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  isCustomAccess?: boolean;
  customPermissions?: Permission[];
}

export type UnitOfMeasure = 'g' | 'kg' | 'ml' | 'L' | 'pcs' | 'pack';

export type IngredientCategory = 'coffee' | 'tea' | 'dairy' | 'syrup' | 'topping' | 'packaging' | 'other';

export interface Ingredient {
  id: string;
  code: string;
  name: string;
  category: IngredientCategory;
  baseUnit: UnitOfMeasure;
  minStock: number;
  currentStock: number;
  notes?: string;
}

export interface InventoryCostLayer {
  id: string;
  ingredientId: string;
  batchNumber: string;
  receivedAt: string; // ISO
  initialQuantity: number;
  remainingQuantity: number;
  unitCost: number; // IDR per base unit
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  expiryDate?: string;
  isDepleted: boolean;
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName: string;
  timestamp: string;
  type: 'goods_receipt' | 'sale_consumption' | 'adjustment' | 'waste' | 'return';
  quantity: number; // positive for addition, negative for deduction
  unit: UnitOfMeasure;
  unitCost?: number;
  referenceId?: string; // saleId, receiptId, etc.
  notes?: string;
  performedBy: string;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number; // in baseUnit or recipeUnit
  unit: UnitOfMeasure;
  isPackaging?: boolean;
}

export interface Recipe {
  id: string;
  productId: string;
  variantId?: string;
  version: number;
  effectiveDate: string;
  items: RecipeItem[];
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Regular 16oz", "Large 22oz"
  priceDelta: number; // delta added to base price
}

export interface ProductModifier {
  id: string;
  name: string; // e.g. "Boba Brown Sugar", "Extra Espresso Shot", "Oat Milk Swap"
  price: number;
  ingredientUsage?: {
    ingredientId: string;
    quantity: number;
    unit: UnitOfMeasure;
  };
}

export interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  displayOrder?: number;
  createdAt?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  imageUrl?: string;
  basePrice: number;
  active: boolean;
  variants: ProductVariant[];
  modifiers: ProductModifier[];
  recipeId?: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'ewallet';

export type TransactionStatus =
  | 'draft'
  | 'pending_payment'
  | 'completed'
  | 'void'
  | 'refunded';

export type SyncStatus = 'synced' | 'pending_sync' | 'sync_failed' | 'conflict';

export interface SaleCostAllocation {
  layerId: string;
  ingredientId: string;
  quantityConsumed: number;
  unitCost: number;
  totalCost: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  selectedModifiers: {
    modifierId: string;
    name: string;
    price: number;
  }[];
  itemTotal: number;
  notes?: string;
}

export interface PaymentRecord {
  paymentId: string;
  method: PaymentMethod;
  amountPaid: number;
  change: number;
  confirmedAt: string;
  confirmedBy: string;
  externalReference?: string;
  notes?: string;
}

export type DiscountType = 'percent' | 'flat';

export interface DiscountInfo {
  type: DiscountType;
  value: number; // percentage value (e.g. 10 for 10%) or rupiah amount (e.g. 5000)
  amount: number; // calculated IDR deduction
  reason: string;
  customReason?: string;
  requiresOverride: boolean;
  approvedBy?: string; // name of manager/owner who approved
  approvedByRole?: Role;
  approvedAt?: string;
}

export interface Sale {
  id: string;
  transactionNumber: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountInfo?: DiscountInfo;
  tax: number;
  grandTotal: number;
  status: TransactionStatus;
  syncStatus: SyncStatus;
  payment?: PaymentRecord;
  costAllocations: SaleCostAllocation[];
  totalCogs: number;
  grossProfit: number;
  isReprinted?: boolean;
  reprintCount?: number;
  offlineCreated?: boolean;
}

export interface CashierShift {
  id: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  variance?: number;
  status: 'open' | 'closed';
  totalSalesCash: number;
  totalSalesNonCash: number;
  totalExpenses: number;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
}

export interface GoodsReceiptItem {
  ingredientId: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitCost: number;
  batchNumber: string;
  expiryDate?: string;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  items: GoodsReceiptItem[];
  totalAmount: number;
  notes?: string;
  receivedBy: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'operasional' | 'gaji' | 'utilitas' | 'sewa' | 'pembelian_alat' | 'lainnya';
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  recordedBy: string;
  assetId?: string; // Optional link to an asset purchase
}

export type AssetCategory =
  | 'mesin_kopi'
  | 'alat_bar'
  | 'refrigerasi'
  | 'elektronik_pos'
  | 'furnitur'
  | 'renovasi_dekorasi'
  | 'kendaraan'
  | 'lainnya';

export type AssetCondition = 'prima' | 'butuh_servis' | 'rusak' | 'dijual' | 'dihapus';

export interface BusinessAsset {
  id: string;
  code: string; // e.g. AST-01
  name: string; // e.g. Mesin Espresso 2 Group
  category: AssetCategory;
  purchaseDate: string; // ISO date string
  purchaseCost: number; // Harga perolehan aset
  supplierName?: string; // Vendor / Toko
  usefulLifeMonths: number; // Masa manfaat (bulan)
  salvageValue: number; // Nilai sisa / residu
  currentBookValue: number; // Nilai buku saat ini
  monthlyDepreciation: number; // Beban penyusutan per bulan
  accumulatedDepreciation: number; // Total akumulasi penyusutan
  condition: AssetCondition;
  location: string; // Lokasi penempatan
  serialNumber?: string;
  notes?: string;
  expenseId?: string; // Link to Expense ID
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  receiptPaperWidth: '58mm' | '80mm';
  taxRatePercent: number; // e.g. 0 or 10
  receiptHeader: string;
  receiptFooter: string;
  allowNegativeStock: boolean;
  offlineConfirmationAllowed: boolean;
  storeIcon?: string; // Brand icon / emoji customizable by Owner & Admin
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface SyncOperation {
  id: string;
  operationType: 'create_sale' | 'confirm_payment' | 'goods_receipt' | 'stock_adjustment';
  payload: any;
  createdAt: string;
  retryCount: number;
  lastAttempt?: string;
  errorMessage?: string;
  idempotencyKey: string;
}
