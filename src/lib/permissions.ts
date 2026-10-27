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

export const ALL_PERMISSIONS: { id: Permission; label: string; group: string; desc: string }[] = [
  // POS & Kasir
  { id: 'access_pos', label: 'Buka Kasir POS', group: 'Kasir & Transaksi', desc: 'Dapat membuka tampilan kasir dan input transaksi' },
  { id: 'create_sales', label: 'Proses Pesanan', group: 'Kasir & Transaksi', desc: 'Dapat menambahkan pesanan menu ke keranjang' },
  { id: 'confirm_payments', label: 'Konfirmasi Pembayaran', group: 'Kasir & Transaksi', desc: 'Dapat menerima pembayaran tunai, qris, transfer' },
  { id: 'apply_discounts', label: 'Terapkan Diskon', group: 'Kasir & Transaksi', desc: 'Dapat menerapkan promo atau diskon pada pesanan' },
  { id: 'reprint_receipts', label: 'Cetak Ulang Struk', group: 'Kasir & Transaksi', desc: 'Dapat mencetak ulang salinan struk transaksi' },
  { id: 'void_transactions', label: 'Batalkan / Void Transaksi', group: 'Kasir & Transaksi', desc: 'Dapat membatalkan transaksi yang keliru' },
  { id: 'process_refunds', label: 'Pengembalian Dana (Refund)', group: 'Kasir & Transaksi', desc: 'Dapat memproses refund pelanggan' },

  // Menu & Resep
  { id: 'manage_products', label: 'Kelola Menu & Kategori', group: 'Katalog & Produk', desc: 'Dapat menambah, edit, dan atur harga menu produk' },
  { id: 'manage_recipes', label: 'Kelola Resep Minuman (BOM)', group: 'Katalog & Produk', desc: 'Dapat mengatur takaran bahan per cup minuman' },

  // Inventaris & Gudang
  { id: 'adjust_inventory', label: 'Cek Stok & Set Habis (FIFO)', group: 'Inventaris & Bahan', desc: 'Dapat cek stok opname dan set habis bahan (waste)' },
  { id: 'receive_purchases', label: 'Penerimaan Barang (Goods Receipt)', group: 'Inventaris & Bahan', desc: 'Dapat mencatat faktur pembelian barang masuk' },
  { id: 'view_purchase_costs', label: 'Lihat Harga Pokok Bahan', group: 'Inventaris & Bahan', desc: 'Dapat melihat HPP dan harga beli dari vendor' },

  // Keuangan
  { id: 'view_sales', label: 'Lihat Riwayat & Laporan Penjualan', group: 'Laporan & Keuangan', desc: 'Dapat melihat grafik penjualan dan produk terlaris' },
  { id: 'view_financial_reports', label: 'Laporan Laba Rugi & Aset', group: 'Laporan & Keuangan', desc: 'Dapat melihat P&L, belanja modal, dan neraca aset' },
  { id: 'manage_expenses', label: 'Pencatatan Biaya Operasional', group: 'Laporan & Keuangan', desc: 'Dapat mencatat pengeluaran harian kedai' },
  { id: 'reconcile_cash', label: 'Rekonsiliasi Kas & Tutup Shift', group: 'Laporan & Keuangan', desc: 'Dapat menghitung fisik kas laci dan tutup shift' },

  // Sistem & Manajemen
  { id: 'access_admin', label: 'Akses Panel Admin', group: 'Manajemen Sistem', desc: 'Dapat masuk ke dashboard administrasi belakang' },
  { id: 'manage_users', label: 'Kelola Pengguna & Hak Akses', group: 'Manajemen Sistem', desc: 'Dapat menambah user dan mengubah role/akses' },
  { id: 'change_settings', label: 'Ubah Pengaturan Toko', group: 'Manajemen Sistem', desc: 'Dapat mengubah nama toko, pajak PB1, dan struk' },
  { id: 'view_audit_logs', label: 'Lihat Log Audit Keamanan', group: 'Manajemen Sistem', desc: 'Dapat melihat rekaman jejak audit aktivitas' },
];

export function hasPermission(
  userOrRole: Role | { role: Role; isCustomAccess?: boolean; customPermissions?: Permission[] },
  permission: Permission
): boolean {
  if (typeof userOrRole === 'object' && userOrRole !== null) {
    if (userOrRole.role === 'owner') return true;
    if (userOrRole.isCustomAccess && Array.isArray(userOrRole.customPermissions)) {
      return userOrRole.customPermissions.includes(permission);
    }
    const rolePermissions = ROLE_PERMISSIONS[userOrRole.role] || [];
    return rolePermissions.includes(permission);
  }
  const role = userOrRole as Role;
  if (role === 'owner') return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Pemilik (Owner)',
  manager: 'Manajer Toko',
  cashier: 'Kasir',
  inventory: 'Staf Gudang / Barista',
  finance: 'Staf Keuangan',
};
