import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { formatIDR } from '../../lib/currency';
import { calculateInventoryValuation } from '../../lib/fifo';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  AlertTriangle,
  Receipt,
  Users,
  Clock,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateDailyReport?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateDailyReport }) => {
  const [metrics, setMetrics] = useState({
    grossSales: 0,
    discounts: 0,
    netSales: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netProfit: 0,
    transactionCount: 0,
    inventoryValuation: 0,
    lowStockCount: 0,
  });

  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      const sales = await db.sales.toArray();
      const layers = await db.costLayers.toArray();
      const ingredients = await db.ingredients.toArray();
      const expenses = await db.expenses.toArray();
      const shift = await db.shifts.where('status').equals('open').first();

      const gross = sales.reduce((sum, s) => sum + s.subtotal, 0);
      const disc = sales.reduce((sum, s) => sum + s.discount, 0);
      const net = gross - disc;
      const totalCogs = sales.reduce((sum, s) => sum + s.totalCogs, 0);
      const grossProf = net - totalCogs;
      const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProf = grossProf - totalExp;

      const invVal = calculateInventoryValuation(layers);

      const lowStock = ingredients.filter((i) => i.currentStock <= i.minStock);

      const breakdown: Record<string, number> = {};
      sales.forEach((s) => {
        const method = s.payment?.method || 'cash';
        breakdown[method] = (breakdown[method] || 0) + s.grandTotal;
      });

      setMetrics({
        grossSales: gross,
        discounts: disc,
        netSales: net,
        cogs: totalCogs,
        grossProfit: grossProf,
        operatingExpenses: totalExp,
        netProfit: netProf,
        transactionCount: sales.length,
        inventoryValuation: invVal,
        lowStockCount: lowStock.length,
      });

      setLowStockItems(lowStock);
      setRecentSales(sales.slice(-5).reverse());
      setActiveShift(shift || null);
      setPaymentBreakdown(breakdown);
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Dashboard Operasional Caozy</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Ikhtisar real-time penjualan, HPP berbasis FIFO, penilaian persediaan, dan laba rugi.
          </p>
        </div>

        {onNavigateDailyReport && (
          <button
            type="button"
            onClick={onNavigateDailyReport}
            className="flex items-center gap-2 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-800 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
          >
            <PieChart size={15} />
            <span>Laporan Penjualan & Top Menu</span>
            <ArrowUpRight size={14} className="text-stone-400" />
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Penjualan Bersih */}
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold">Penjualan Bersih</span>
            <DollarSign size={16} className="text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-white">{formatIDR(metrics.netSales)}</div>
          <p className="text-[11px] text-stone-500">{metrics.transactionCount} transaksi</p>
        </div>

        {/* HPP (COGS FIFO) */}
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold">Total HPP (FIFO)</span>
            <Layers size={16} className="text-sky-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-sky-400">{formatIDR(metrics.cogs)}</div>
          <p className="text-[11px] text-stone-500">Alokasi layer aktual</p>
        </div>

        {/* Laba Kotor */}
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold">Laba Kotor (Gross Profit)</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400">{formatIDR(metrics.grossProfit)}</div>
          <p className="text-[11px] text-stone-500">
            Margin:{' '}
            {metrics.netSales > 0
              ? `${Math.round((metrics.grossProfit / metrics.netSales) * 100)}%`
              : '0%'}
          </p>
        </div>

        {/* Valuasi Persediaan FIFO */}
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold">Valuasi Persediaan</span>
            <Package size={16} className="text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-300">
            {formatIDR(metrics.inventoryValuation)}
          </div>
          <p className="text-[11px] text-stone-500">Nilai sisa batch aktif</p>
        </div>
      </div>

      {/* Row 2: Secondary stats and alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Low Stock Warning Box */}
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              <span>Bahan Baku Menipis</span>
            </h2>
            <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
              {metrics.lowStockCount} Item
            </span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                Semua bahan baku dan kemasan dalam batas aman stok minimum.
              </p>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-stone-800/50 border border-stone-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-stone-200">{item.name}</span>
                    <span className="text-[10px] text-stone-500 block">
                      Min: {item.minStock} {item.baseUnit}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-red-400">
                    {item.currentStock} {item.baseUnit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Receipt size={15} className="text-amber-400" />
            <span>Penerimaan Pembayaran</span>
          </h2>
          <div className="space-y-2 text-xs">
            {Object.entries(paymentBreakdown).map(([method, amount]) => (
              <div
                key={method}
                className="flex items-center justify-between p-2.5 bg-stone-800/40 rounded-xl"
              >
                <span className="uppercase font-semibold text-stone-300">{method}</span>
                <span className="font-bold text-white">{formatIDR(amount)}</span>
              </div>
            ))}
            {Object.keys(paymentBreakdown).length === 0 && (
              <p className="text-xs text-stone-500 py-4 text-center">Belum ada transaksi tercatat.</p>
            )}
          </div>
        </div>

        {/* Active Cashier Shift */}
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock size={15} className="text-amber-400" />
            <span>Shift Kasir Aktif</span>
          </h2>
          {activeShift ? (
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-stone-800/40 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Kasir:</span>
                  <span className="font-bold text-stone-200">{activeShift.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Kas Awal:</span>
                  <span className="font-semibold text-stone-200">{formatIDR(activeShift.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Penjualan Tunai:</span>
                  <span className="font-bold text-emerald-400">+{formatIDR(activeShift.totalSalesCash)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-700 font-bold text-white">
                  <span>Kas Diharapkan:</span>
                  <span className="text-amber-400">{formatIDR(activeShift.expectedClosingCash)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500 py-4 text-center">Tidak ada shift kasir yang aktif saat ini.</p>
          )}
        </div>
      </div>
    </div>
  );
};
