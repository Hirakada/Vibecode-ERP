import { Permission, Role } from '../types';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'access_admin',
    'access_pos',
    'view_sales',
    'create_sales',
    'confirm_payments',
    'apply_discounts',
    'void_transactions',
    'process_refunds',
    'reprint_receipts',
    'manage_products',
    'manage_recipes',
    'receive_purchases',
    'adjust_inventory',
    'view_purchase_costs',
    'manage_expenses',
    'reconcile_cash',
    'view_financial_reports',
    'manage_users',
    'change_settings',
    'view_audit_logs',
  ],
  manager: [
    'access_admin',
    'access_pos',
    'view_sales',
    'create_sales',
    'confirm_payments',
    'apply_discounts',
    'void_transactions',
    'process_refunds',
    'reprint_receipts',
    'manage_products',
    'manage_recipes',
    'receive_purchases',
    'adjust_inventory',
    'view_purchase_costs',
    'manage_expenses',
    'reconcile_cash',
    'view_financial_reports',
    'view_audit_logs',
  ],
  cashier: [
    'access_pos',
    'create_sales',
    'confirm_payments',
    'reprint_receipts',
    'reconcile_cash', // for own shift closing
  ],
  inventory: [
    'access_admin',
    'receive_purchases',
    'adjust_inventory',
    'manage_products',
    'manage_recipes',
    'view_purchase_costs',
  ],
  finance: [
    'access_admin',
    'view_sales',
    'view_purchase_costs',
    'manage_expenses',
    'reconcile_cash',
    'view_financial_reports',
    'view_audit_logs',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Pemilik (Owner)',
  manager: 'Manajer Toko',
  cashier: 'Kasir',
  inventory: 'Staf Gudang / Barista Inventory',
  finance: 'Staf Keuangan',
};
