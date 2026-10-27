import React, { useState } from 'react';
import { UserProfile, BusinessSettings } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { AdminDashboard } from './AdminDashboard';
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
  | 'settings'
  | 'audit-logs';

interface AdminLayoutProps {
  currentUser: UserProfile;
  settings: BusinessSettings;
  onUpdateSettings: (s: BusinessSettings) => void;
  onSelectUser: (u: UserProfile) => void;
  onNavigateToPos: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  settings,
  onUpdateSettings,
  onSelectUser,
  onNavigateToPos,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const navItems: { id: AdminSection; label: string; icon: any; permission?: any }[] = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'daily-sales', label: 'Laporan Penjualan Harian', icon: PieChart, permission: 'view_sales' },
    { id: 'inventory', label: 'Inventaris FIFO', icon: Layers, permission: 'adjust_inventory' },
    { id: 'purchases', label: 'Pembelian & Pemasok', icon: Truck, permission: 'receive_purchases' },
    { id: 'recipes', label: 'Resep Minuman (BOM)', icon: BookOpen, permission: 'manage_recipes' },
    { id: 'ingredients', label: 'Bahan Baku & Kemasan', icon: Package, permission: 'manage_products' },
    { id: 'products', label: 'Menu Produk Minuman', icon: Coffee, permission: 'manage_products' },
    { id: 'transactions', label: 'Riwayat Transaksi POS', icon: Receipt, permission: 'view_sales' },
    { id: 'finances', label: 'Keuangan & Kasir', icon: DollarSign, permission: 'view_financial_reports' },
    { id: 'settings', label: 'Pengaturan Toko & Data', icon: Settings, permission: 'change_settings' },
    { id: 'audit-logs', label: 'Log Audit Sistem', icon: Shield, permission: 'view_audit_logs' },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(currentUser.role, item.permission);
  });

  return (
    <div className="min-h-screen bg-[#1a1b1e] text-stone-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-[#232529] border-r border-[#353840] flex-col justify-between shrink-0">
        <div>
          {/* Logo & Brand */}
          <div className="p-4 border-b border-[#353840] flex items-center justify-between">
            <CaozyLogo variant="badge" size="md" showText={true} />
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
          <div className="p-2.5 bg-[#1a1b1e] rounded-xl border border-stone-800 flex items-center gap-2 text-xs">
            <span className="text-base">{currentUser.avatar || '👑'}</span>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white truncate">{currentUser.name}</span>
                <span className="text-[9px] bg-[#b6d333] text-stone-950 font-black px-1.5 py-0.2 rounded uppercase">
                  Owner
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono block">
                Full Access
              </span>
            </div>
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

        <button
          type="button"
          onClick={onNavigateToPos}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#b6d333] text-stone-950 font-black text-xs rounded-xl shadow-md shadow-[#b6d333]/20 cursor-pointer"
        >
          <ShoppingBag size={14} />
          <span>Ke POS</span>
        </button>
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
        {activeSection === 'dashboard' && <AdminDashboard onNavigate={setActiveSection} />}
        {activeSection === 'daily-sales' && <DailySalesReport />}
        {activeSection === 'inventory' && <FifoInventoryView />}
        {activeSection === 'purchases' && <PurchasingManager />}
        {activeSection === 'recipes' && <RecipeManager />}
        {activeSection === 'ingredients' && <IngredientsManager />}
        {activeSection === 'products' && <ProductsManager />}
        {activeSection === 'transactions' && <TransactionsManager settings={settings} />}
        {activeSection === 'finances' && <FinanceManager />}
        {activeSection === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            currentUser={currentUser}
            onSelectUser={onSelectUser}
          />
        )}
        {activeSection === 'audit-logs' && <AuditLogsView />}
      </main>
    </div>
  );
};
