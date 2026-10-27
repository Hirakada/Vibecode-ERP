import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/storage';
import { Sale, Product, CashierShift } from '../../types';
import { formatIDR } from '../../lib/currency';
import { calculateInventoryValuation } from '../../lib/fifo';
import {
  calculateDailyTrend,
  calculateHourlyTrend,
  calculateTopProducts,
  calculateCategoryBreakdown,
  DailyTrendPoint,
  TopProductMetric,
} from '../../utils/dashboardMetrics';
import { seedSampleDailySales } from '../../utils/seedSales';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Receipt,
  Clock,
  Sparkles,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  Percent,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Award,
  Coffee,
} from 'lucide-react';

interface SummaryDashboardProps {
  onNavigate?: (section: any) => void;
}

const BRAND_PALETTE = [
  '#b6d333', // Caozy Brand Lime
  '#22c55e', // Green
  '#38bdf8', // Sky
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f43f5e', // Rose
];

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ onNavigate }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [inventoryValuation, setInventoryValuation] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Timeframe Filter: 7, 14, 30 days
  const [timeRangeDays, setTimeRangeDays] = useState<number>(7);
  // Top product chart mode: 'bar' | 'donut'
  const [productChartMode, setProductChartMode] = useState<'bar' | 'donut'>('bar');
  // Seeding feedback
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSales, allProducts, allLayers, allIngredients, currentShift] =
        await Promise.all([
          db.sales.toArray(),
          db.products.toArray(),
          db.costLayers.toArray(),
          db.ingredients.toArray(),
          db.shifts.where('status').equals('open').first(),
        ]);

      setSales(allSales);
      setProducts(allProducts);
      setActiveShift(currentShift || null);
      setInventoryValuation(calculateInventoryValuation(allLayers));
      setLowStockCount(
        allIngredients.filter((i) => i.currentStock <= i.minStock).length
      );
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute daily trend for the selected range
  const dailyTrendData = useMemo(() => {
    return calculateDailyTrend(sales, timeRangeDays);
  }, [sales, timeRangeDays]);

  // Compute top products
  const topProducts = useMemo(() => {
    return calculateTopProducts(sales, products, 7);
  }, [sales, products]);

  // Compute category breakdown
  const categoryData = useMemo(() => {
    return calculateCategoryBreakdown(topProducts);
  }, [topProducts]);

  // Overall metrics in the selected range
  const rangeTotals = useMemo(() => {
    const netSales = dailyTrendData.reduce((sum, d) => sum + d.netSales, 0);
    const grossSales = dailyTrendData.reduce((sum, d) => sum + d.grossSales, 0);
    const cogs = dailyTrendData.reduce((sum, d) => sum + d.cogs, 0);
    const grossProfit = dailyTrendData.reduce((sum, d) => sum + d.grossProfit, 0);
    const transactions = dailyTrendData.reduce((sum, d) => sum + d.transactionCount, 0);
    const profitMargin = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
    const aov = transactions > 0 ? Math.round(netSales / transactions) : 0;

    return {
      netSales,
      grossSales,
      cogs,
      grossProfit,
      transactions,
      profitMargin,
      aov,
    };
  }, [dailyTrendData]);

  // Handle seeding sample sales if owner wants to preview visual charts immediately
  const handleSeedSimulation = async () => {
    setSeedNotice('Membuat transaksi simulasi minuman...');
    try {
      const count = await seedSampleDailySales(new Date().toISOString().slice(0, 10));
      if (count > 0) {
        setSeedNotice(`Berhasil membuat ${count} transaksi uji!`);
        await loadData();
        setTimeout(() => setSeedNotice(null), 4000);
      } else {
        setSeedNotice('Gagal memuat transaksi uji.');
      }
    } catch (err) {
      setSeedNotice('Terjadi kesalahan saat memuat simulasi.');
    }
  };

  const formatShortCurrency = (val: number) => {
    if (val >= 1000000) {
      return `Rp ${(val / 1000000).toFixed(1)}jt`;
    }
    if (val >= 1000) {
      return `Rp ${(val / 1000).toFixed(0)}rb`;
    }
    return `Rp ${val}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Time Filter & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Dashboard Ringkasan Bisnis
            </h1>
            <span className="text-[10px] font-bold bg-[#b6d333]/15 text-[#b6d333] border border-[#b6d333]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Visual Recharts
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Pantau performa penjualan harian, tren keuntungan laba kotor FIFO, dan menu produk terlaris secara visual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Time Range Selector */}
          <div className="flex items-center bg-[#202226] border border-stone-700/80 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setTimeRangeDays(7)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRangeDays === 7
                  ? 'bg-[#b6d333] text-stone-950 shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setTimeRangeDays(14)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRangeDays === 14
                  ? 'bg-[#b6d333] text-stone-950 shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              14 Hari
            </button>
            <button
              type="button"
              onClick={() => setTimeRangeDays(30)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRangeDays === 30
                  ? 'bg-[#b6d333] text-stone-950 shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              30 Hari
            </button>
          </div>

          {/* Quick Simulation Seed Button */}
          {sales.length === 0 && (
            <button
              type="button"
              onClick={handleSeedSimulation}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-[#b6d333] border border-[#b6d333]/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Isi data penjualan sampel untuk melihat grafik langsung"
            >
              <Sparkles size={14} />
              <span>Simulasi Data Uji</span>
            </button>
          )}

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('daily-sales')}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#232529] hover:bg-stone-800 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <PieIcon size={14} className="text-[#b6d333]" />
              <span>Laporan Lengkap</span>
              <ArrowUpRight size={13} className="text-stone-400" />
            </button>
          )}
        </div>
      </div>

      {/* Seed Notice */}
      {seedNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <span>{seedNotice}</span>
          <button
            type="button"
            onClick={() => setSeedNotice(null)}
            className="text-stone-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Net Sales */}
        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl relative overflow-hidden space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold">Penjualan Bersih ({timeRangeDays}H)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatIDR(rangeTotals.netSales)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
            <span>{rangeTotals.transactions} transaksi</span>
            <span className="text-stone-500">AOV: {formatIDR(rangeTotals.aov)}</span>
          </div>
        </div>

        {/* FIFO COGS */}
        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl relative overflow-hidden space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold">Total HPP FIFO ({timeRangeDays}H)</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Layers size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-400">
            {formatIDR(rangeTotals.cogs)}
          </div>
          <p className="text-[11px] text-stone-500 pt-1">
            Biaya bahan baku aktual batch
          </p>
        </div>

        {/* Gross Profit & Target Margin */}
        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl relative overflow-hidden space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold">Laba Kotor (Gross Profit)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {formatIDR(rangeTotals.grossProfit)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] pt-1">
            <span className="text-stone-400">Margin:</span>
            <span
              className={`font-black px-1.5 py-0.2 rounded text-[10px] ${
                rangeTotals.profitMargin >= 10
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {rangeTotals.profitMargin}% (Min 10%)
            </span>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl relative overflow-hidden space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold">Valuasi Persediaan Gudang</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Package size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-300">
            {formatIDR(inventoryValuation)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
            <span>Nilai sisa batch aktif</span>
            {lowStockCount > 0 && (
              <span className="text-red-400 font-bold">{lowStockCount} menipis</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Recharts Visual Section: Grafik Penjualan Harian & Tren Keuntungan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: GRAFIK PENJUALAN HARIAN */}
        <div className="p-5 bg-[#232529] border border-stone-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <BarChart3 size={17} className="text-[#b6d333]" />
                <span>Grafik Penjualan Harian</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Tren omzet bersih dan volume transaksi ({timeRangeDays} hari terakhir)
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#b6d333] bg-[#b6d333]/10 px-2 py-0.5 rounded border border-[#b6d333]/30">
              {formatIDR(rangeTotals.netSales)}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dailyTrendData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorNetSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b6d333" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#b6d333" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#353840" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#a8a29e"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#353840' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#a8a29e"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatShortCurrency}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#38bdf8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'auto']}
                  tickFormatter={(v) => `${v} trx`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1b1e',
                    borderColor: '#44403c',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#f5f5f4',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === 'Penjualan Bersih') return [formatIDR(Number(value)), name];
                    if (name === 'Volume Transaksi') return [`${value} Transaksi`, name];
                    return [value, name];
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#b6d333', marginBottom: '4px' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="netSales"
                  name="Penjualan Bersih"
                  stroke="#b6d333"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorNetSales)"
                />
                <Bar
                  yAxisId="right"
                  dataKey="transactionCount"
                  name="Volume Transaksi"
                  fill="#38bdf8"
                  opacity={0.7}
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: GRAFIK TREN KEUNTUNGAN & MARGIN */}
        <div className="p-5 bg-[#232529] border border-stone-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <TrendingUp size={17} className="text-emerald-400" />
                <span>Grafik Tren Keuntungan (Profitability)</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Perbandingan Laba Kotor vs HPP FIFO dan Persentase Margin
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Laba: {formatIDR(rangeTotals.grossProfit)}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dailyTrendData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#353840" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#a8a29e"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#353840' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#a8a29e"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatShortCurrency}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f59e0b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1b1e',
                    borderColor: '#44403c',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#f5f5f4',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === 'Margin Laba') return [`${value}%`, name];
                    return [formatIDR(Number(value)), name];
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="grossProfit"
                  name="Laba Kotor"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cogs"
                  name="HPP FIFO"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="profitMargin"
                  name="Margin Laba"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Recharts Visual Section: Produk Minuman Terlaris */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 3: GRAFIK PRODUK TERLARIS */}
        <div className="lg:col-span-2 p-5 bg-[#232529] border border-stone-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Coffee size={17} className="text-[#b6d333]" />
                <span>Grafik Produk Minuman Terlaris (Top Selling)</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Peringkat menu berdasarkan porsi terjual (Cup) dan kontribusi pendapatan
              </p>
            </div>

            <div className="flex items-center bg-[#1a1b1e] border border-stone-700/80 rounded-xl p-1 text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setProductChartMode('bar')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  productChartMode === 'bar'
                    ? 'bg-[#b6d333] text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <BarChart3 size={13} />
                <span>Diagram Batang</span>
              </button>
              <button
                type="button"
                onClick={() => setProductChartMode('donut')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  productChartMode === 'donut'
                    ? 'bg-[#b6d333] text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <PieIcon size={13} />
                <span>Donat Pangsa</span>
              </button>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-500 mb-2">
                <Coffee size={24} />
              </div>
              <h4 className="text-xs font-bold text-stone-300">Belum Ada Transaksi Produk</h4>
              <p className="text-[11px] text-stone-500 max-w-xs mt-1">
                Grafik visual produk terlaris akan otomatis terisi saat pesanan kasir POS diproses.
              </p>
            </div>
          ) : productChartMode === 'bar' ? (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#353840" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#a8a29e"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#353840' }}
                  />
                  <YAxis
                    dataKey="productName"
                    type="category"
                    stroke="#f5f5f4"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1b1e',
                      borderColor: '#44403c',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#f5f5f4',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === 'Porsi Terjual (Cup)') return [`${value} Cup`, name];
                      if (name === 'Total Pendapatan') return [formatIDR(Number(value)), name];
                      return [value, name];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                  />
                  <Bar
                    dataKey="quantitySold"
                    name="Porsi Terjual (Cup)"
                    fill="#b6d333"
                    radius={[0, 6, 6, 0]}
                    barSize={16}
                  >
                    {topProducts.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BRAND_PALETTE[index % BRAND_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 w-full flex items-center justify-center pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={topProducts}
                    dataKey="totalRevenue"
                    nameKey="productName"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                  >
                    {topProducts.map((_, index) => (
                      <Cell
                        key={`pie-cell-${index}`}
                        fill={BRAND_PALETTE[index % BRAND_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1b1e',
                      borderColor: '#44403c',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#f5f5f4',
                    }}
                    formatter={(value: any, name: any) => [
                      formatIDR(Number(value)),
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Breakdown Card: Tabel Ringkas Performa Menu */}
        <div className="p-5 bg-[#232529] border border-stone-800 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Award size={15} className="text-amber-400" />
                <span>Peringkat Kontribusi</span>
              </h2>
              <span className="text-[10px] text-stone-400">Porsi & Margin</span>
            </div>

            <div className="space-y-2 mt-3 max-h-64 overflow-y-auto pr-1">
              {topProducts.length === 0 ? (
                <p className="text-xs text-stone-500 py-6 text-center">
                  Belum ada transaksi.
                </p>
              ) : (
                topProducts.map((p, idx) => (
                  <div
                    key={p.productId}
                    className="p-2.5 bg-stone-900/80 border border-stone-800/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-stone-950 shrink-0"
                        style={{ backgroundColor: BRAND_PALETTE[idx % BRAND_PALETTE.length] }}
                      >
                        {idx + 1}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">{p.productName}</span>
                        <span className="text-[10px] text-stone-400">
                          {p.quantitySold} Cup • {formatIDR(p.totalRevenue)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 shrink-0 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      {p.marginPercent}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational Shift Box at the bottom */}
          <div className="pt-3 border-t border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold flex items-center gap-1.5">
                <Clock size={13} className="text-[#b6d333]" />
                <span>Shift Kasir Aktif</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                  activeShift
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {activeShift ? 'Sedang Buka' : 'Tutup'}
              </span>
            </div>
            {activeShift && (
              <div className="p-2.5 bg-stone-900/60 border border-stone-800 rounded-xl text-[11px] space-y-1">
                <div className="flex justify-between text-stone-300">
                  <span>Kasir:</span>
                  <span className="font-bold text-white">{activeShift.cashierName}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Kas Laci Diharapkan:</span>
                  <span className="font-bold text-[#b6d333]">
                    {formatIDR(activeShift.expectedClosingCash)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
