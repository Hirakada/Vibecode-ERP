import React, { useState } from 'react';
import { UserProfile, BusinessSettings } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { SummaryDashboard } from './SummaryDashboard';
import { FifoInventoryView } from './FifoInventoryView';
import { PurchasingManager } from './PurchasingManager';
import { RecipeManager } from './RecipeManager';
import { IngredientsManager } from './IngredientsManager';
import { ProductsManager } from './ProductsManager';
import { TransactionsManager } from './TransactionsManager';
import { FinanceManager } from './FinanceManager';
import { SettingsView } from './SettingsView';
import { AuditLogsView } from './AuditLogsView';
import { DailySalesReport } from './DailySalesReport';
import { AssetsManager } from './AssetsManager';
import { UsersManager } from './UsersManager';
import { RawDatabaseViewer } from './RawDatabaseViewer';
import { CaozyLogo } from '../shared/CaozyLogo';
import {
  LayoutDashboard,
  Layers,
  Truck,
  BookOpen,
  Package,
  Coffee,
  Receipt,
  DollarSign,
  Settings,
  Shield,
  ShoppingBag,
  Menu,
  X,
  PieChart,
  ShieldCheck,
  LogOut,
  Cpu,
  Users,
  Database,
  ExternalLink,
} from 'lucide-react';

export type AdminSection =
  | 'dashboard'
  | 'daily-sales'
  | 'inventory'
  | 'purchases'
  | 'recipes'
  | 'ingredients'
  | 'products'
  | 'transactions'
  | 'finances'
  | 'assets'
  | 'users'
  | 'settings'
  | 'audit-logs'
  | 'raw-db';

interface AdminLayoutProps {
  currentUser: UserProfile;
  settings: BusinessSettings;
  onUpdateSettings: (s: BusinessSettings) => void;
  onSelectUser: (u: UserProfile) => void;
  onNavigateToPos: () => void;
  onLogout?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  settings,
  onUpdateSettings,
  onSelectUser,
  onNavigateToPos,
  onLogout,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const navItems: { id: AdminSection; label: string; icon: any; permission?: any }[] = [
    { id: 'dashboard', label: 'Dashboard Ringkasan', icon: LayoutDashboard },
    { id: 'daily-sales', label: 'Laporan Penjualan Harian', icon: PieChart, permission: 'view_sales' },
    { id: 'inventory', label: 'Inventaris FIFO', icon: Layers, permission: 'adjust_inventory' },
    { id: 'purchases', label: 'Pembelian & Pemasok', icon: Truck, permission: 'receive_purchases' },
    { id: 'recipes', label: 'Resep Minuman (BOM)', icon: BookOpen, permission: 'manage_recipes' },
    { id: 'ingredients', label: 'Bahan Baku & Kemasan', icon: Package, permission: 'manage_products' },
    { id: 'products', label: 'Menu Produk Minuman', icon: Coffee, permission: 'manage_products' },
    { id: 'transactions', label: 'Riwayat Transaksi POS', icon: Receipt, permission: 'view_sales' },
    { id: 'finances', label: 'Laporan Keuangan & Kas', icon: DollarSign, permission: 'view_financial_reports' },
    { id: 'assets', label: 'Aset & Belanja Modal (Capex)', icon: Cpu, permission: 'view_financial_reports' },
    { id: 'users', label: 'Kelola Tim & Hak Akses', icon: Users, permission: 'manage_users' },
    { id: 'settings', label: 'Pengaturan Toko & Data', icon: Settings, permission: 'change_settings' },
    { id: 'audit-logs', label: 'Log Audit Sistem', icon: Shield, permission: 'view_audit_logs' },
    { id: 'raw-db', label: 'Raw Database ↗', icon: Database, permission: 'change_settings' },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(currentUser, item.permission);
  });

  const canAccessRawDb = hasPermission(currentUser, 'change_settings');

  return (
    <div className="min-h-screen bg-[#1a1b1e] text-stone-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-[#232529] border-r border-[#353840] flex-col justify-between shrink-0">
        <div>
          {/* Logo & Brand */}
          <div className="p-4 border-b border-[#353840] flex items-center justify-between">
            <CaozyLogo variant="badge" size="md" showText={true} />
            <div className="flex items-center gap-1.5">
              {canAccessRawDb && (
                <button
                  type="button"
                  onClick={() => setActiveSection('raw-db')}
                  title="Buka Raw Database Viewer"
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                    activeSection === 'raw-db'
                      ? 'bg-[#b6d333] text-stone-950 border-[#b6d333]'
                      : 'bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 border-stone-700'
                  }`}
                >
                  <Database size={12} className={activeSection === 'raw-db' ? 'text-stone-950' : 'text-[#b6d333]'} />
                  <span>Raw DB ↗</span>
                </button>
              )}
              {settings.storeIcon && (
                <span className="text-xl p-1 bg-[#1a1b1e] rounded-xl border border-stone-800" title="Ikon Toko">
                  {settings.storeIcon}
                </span>
              )}
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#b6d333] text-stone-950 font-black shadow-md shadow-[#b6d333]/20'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#353840] space-y-3">
          {/* Switch to POS button */}
          <button
            type="button"
            onClick={onNavigateToPos}
            className="w-full bg-[#b6d333]/15 hover:bg-[#b6d333]/25 text-[#b6d333] border border-[#b6d333]/40 font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-xs cursor-pointer"
          >
            <ShoppingBag size={15} />
            <span>Buka Kasir POS</span>
          </button>

          {/* User badge */}
          <div className="p-2.5 bg-[#1a1b1e] rounded-xl border border-stone-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <span className="text-base">{currentUser.avatar || '👑'}</span>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white truncate">{currentUser.name}</span>
                  <span className="text-[9px] bg-[#b6d333] text-stone-950 font-black px-1.5 py-0.2 rounded uppercase">
                    Owner
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 truncate block">
                  {currentUser.email}
                </span>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Kunci Sesi / Logout"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-[#232529] border-b border-[#353840] p-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-stone-800 text-stone-300 rounded-xl cursor-pointer"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div>
            <CaozyLogo variant="wordmark" size="sm" />
            <span className="text-[10px] text-stone-400 block font-medium">
              {navItems.find((n) => n.id === activeSection)?.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAccessRawDb && (
            <button
              type="button"
              onClick={() => setActiveSection('raw-db')}
              className={`p-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                activeSection === 'raw-db'
                  ? 'bg-[#b6d333] text-stone-950 border-[#b6d333]'
                  : 'bg-stone-800 text-stone-300 border-stone-700'
              }`}
            >
              <Database size={13} className={activeSection === 'raw-db' ? 'text-stone-950' : 'text-[#b6d333]'} />
              <span>Raw DB</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToPos}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#b6d333] text-stone-950 font-black text-xs rounded-xl shadow-md shadow-[#b6d333]/20 cursor-pointer"
          >
            <ShoppingBag size={14} />
            <span>Ke POS</span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-xs flex flex-col justify-between pt-16 p-4">
          <nav className="space-y-1.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#b6d333] text-stone-950'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigateToPos();
              }}
              className="w-full bg-[#b6d333] text-stone-950 font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs"
            >
              <ShoppingBag size={16} />
              <span>Buka Kasir POS</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        {activeSection === 'dashboard' && <SummaryDashboard onNavigate={setActiveSection} />}
        {activeSection === 'daily-sales' && <DailySalesReport />}
        {activeSection === 'inventory' && <FifoInventoryView />}
        {activeSection === 'purchases' && <PurchasingManager />}
        {activeSection === 'recipes' && <RecipeManager />}
        {activeSection === 'ingredients' && <IngredientsManager />}
        {activeSection === 'products' && <ProductsManager />}
        {activeSection === 'transactions' && <TransactionsManager settings={settings} />}
        {activeSection === 'finances' && <FinanceManager />}
        {activeSection === 'assets' && <AssetsManager />}
        {activeSection === 'users' && <UsersManager />}
        {activeSection === 'raw-db' && <RawDatabaseViewer currentUser={currentUser} />}
        {activeSection === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            currentUser={currentUser}
            onSelectUser={onSelectUser}
            onNavigate={(sec: string) => setActiveSection(sec as AdminSection)}
          />
        )}
        {activeSection === 'audit-logs' && <AuditLogsView />}
      </main>
    </div>
  );
};
