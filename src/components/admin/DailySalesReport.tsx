import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/storage';
import { Sale, BusinessSettings } from '../../types';
import { formatIDR } from '../../lib/currency';
import {
  filterSalesByDate,
  calculateDailySalesSummary,
  getTopSellingProducts,
  calculatePaymentBreakdown,
  calculateHourlySalesBreakdown,
  exportSalesReportToCsv,
  getLocalDateString,
  ProductSalesBreakdown,
} from '../../utils/salesReport';
import { seedSampleDailySales } from '../../utils/seedSales';
import { ProductPieChart } from './ProductPieChart';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  DollarSign,
  Receipt,
  Coffee,
  TrendingUp,
  Percent,
  CreditCard,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface DailySalesReportProps {
  settings?: BusinessSettings;
}

export const DailySalesReport: React.FC<DailySalesReportProps> = ({ settings }) => {
  // Default to today's date
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [metric, setMetric] = useState<'quantity' | 'revenue'>('quantity');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Load sales from Dexie DB
  const loadSales = async () => {
    setLoading(true);
    try {
      const sales = await db.sales.orderBy('createdAt').reverse().toArray();
      setAllSales(sales);
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Filter sales for selected date
  const dailySales = useMemo(() => {
    return filterSalesByDate(allSales, selectedDate);
  }, [allSales, selectedDate]);

  // Aggregate daily metrics
  const summary = useMemo(() => {
    return calculateDailySalesSummary(dailySales, selectedDate);
  }, [dailySales, selectedDate]);

  // Top selling products breakdown
  const topProducts = useMemo(() => {
    return getTopSellingProducts(dailySales, metric);
  }, [dailySales, metric]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    return calculatePaymentBreakdown(dailySales);
  }, [dailySales]);

  // Hourly breakdown
  const hourlyBreakdown = useMemo(() => {
    return calculateHourlySalesBreakdown(dailySales);
  }, [dailySales]);

  // Filter products for table search
  const filteredProducts = useMemo(() => {
    if (!tableSearch.trim()) return topProducts;
    const q = tableSearch.toLowerCase();
    return topProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.productId.toLowerCase().includes(q)
    );
  }, [topProducts, tableSearch]);

  // Date Navigation handlers
  const handleShiftDate = (daysDelta: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysDelta);
    setSelectedDate(getLocalDateString(current));
  };

  const handleSetQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(getLocalDateString(d));
  };

  // Seed sample transactions for chosen date if empty
  const handleSeedSamples = async () => {
    setLoading(true);
    try {
      const count = await seedSampleDailySales(selectedDate);
      await loadSales();
      setActionSuccess(`Berhasil menambahkan ${count} transaksi simulasi untuk tanggal ${selectedDate}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const csvContent = exportSalesReportToCsv(selectedDate, summary, topProducts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Penjualan_Caozy_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setActionSuccess('File CSV laporan berhasil diunduh!');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Formatted date string for header (Indonesian locale)
  const formattedDateTitle = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Laporan Penjualan Harian
            </h1>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Analisis omzet, kalkulasi HPP FIFO, margin laba, dan diagram pangsa produk terlaris.
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Dates */}
          <div className="hidden sm:inline-flex p-1 bg-stone-900 rounded-xl border border-stone-800 text-xs">
            <button
              type="button"
              onClick={() => handleSetQuickDate(0)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                selectedDate === getLocalDateString()
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickDate(1)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                selectedDate === getLocalDateString(new Date(Date.now() - 86400000))
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Kemarin
            </button>
          </div>

          {/* Stepper & Date Picker */}
          <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
              title="Hari Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-amber-400 px-2 py-1 outline-hidden cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
              title="Hari Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Export & Print Buttons */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={summary.transactionCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-stone-200 border border-stone-800 rounded-xl text-xs font-semibold transition-all"
            title="Unduh Data CSV"
          >
            <Download size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={summary.transactionCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/10 transition-all"
            title="Cetak Laporan Penjualan"
          >
            <Printer size={14} />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
        </div>
      )}

      {/* Selected Date Subtitle */}
      <div className="flex items-center justify-between text-xs text-stone-400">
        <div>
          <span>Laporan Periode: </span>
          <span className="font-bold text-white capitalize">{formattedDateTitle}</span>
          <span className="font-mono text-stone-400 ml-1.5">({selectedDate})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Status: Terkonsolidasi Real-time</span>
        </div>
      </div>

      {/* KPI Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Omzet Bersih */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Omzet Bersih</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {formatIDR(summary.grandTotal)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-400">
            <span>Kotor: {formatIDR(summary.totalGross)}</span>
            {summary.totalDiscounts > 0 && (
              <span className="text-rose-400 font-mono">(-{formatIDR(summary.totalDiscounts)})</span>
            )}
          </div>
        </div>

        {/* Card 2: Laba Kotor & Margin */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Laba Kotor (Gross)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {formatIDR(summary.grossProfit)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-400">
            <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-mono">
              Margin {summary.profitMarginPercent}%
            </span>
            <span className="text-stone-400">HPP: {formatIDR(summary.totalCogs)}</span>
          </div>
        </div>

        {/* Card 3: Nota & Rata-rata Keranjang */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Transaksi & Keranjang</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Receipt size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {summary.transactionCount} <span className="text-xs font-normal text-stone-400">Nota</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-400">
            <span>Rata-rata:</span>
            <span className="font-bold text-stone-200">{formatIDR(summary.averageBasketSize)}</span>
            <span className="text-stone-400">/ nota</span>
          </div>
        </div>

        {/* Card 4: Volume Terjual */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Volume Terjual</span>
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Coffee size={15} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {summary.totalItemsSold} <span className="text-xs font-normal text-stone-400">Cup / Pcs</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-400">
            <span>Rata-rata:</span>
            <span className="font-bold text-stone-200">{summary.averageItemsPerTransaction}</span>
            <span>cup / transaksi</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Pie Chart & Secondary Analytics */}
      {summary.transactionCount > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left Column: Interactive Pie Chart (Span 7) */}
            <div className="xl:col-span-7">
              <ProductPieChart
                products={topProducts}
                metric={metric}
                onMetricChange={setMetric}
                selectedProductId={selectedProductId}
                onSelectProduct={setSelectedProductId}
              />
            </div>

            {/* Right Column: Payment Methods & Hourly Peak Distribution (Span 5) */}
            <div className="xl:col-span-5 space-y-4">
              {/* Payment Methods */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard size={16} className="text-amber-400" />
                    <span>Metode Pembayaran</span>
                  </h3>
                  <span className="text-xs text-stone-400 font-mono">
                    {paymentBreakdown.length} Metode
                  </span>
                </div>

                <div className="space-y-3">
                  {paymentBreakdown.map((item) => (
                    <div key={item.method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-stone-200">{item.label}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            ({item.count} trx)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{formatIDR(item.totalAmount)}</span>
                          <span className="text-[11px] font-mono text-amber-400 font-bold w-12 text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      {/* Bar indicator */}
                      <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peak Sales Hours Distribution */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock size={16} className="text-amber-400" />
                    <span>Aktivitas Jam Penjualan (00:00 - 23:00)</span>
                  </h3>
                  <span className="text-[11px] text-stone-400">Distribusi Transaksi</span>
                </div>

                {/* Mini Hour Timeline Visualizer */}
                <div className="flex items-end gap-1 h-20 pt-2 px-1">
                  {(() => {
                    const maxTrx = Math.max(...hourlyBreakdown.map((h) => h.count), 1);
                    return hourlyBreakdown.map((hour) => {
                      const heightPercent = (hour.count / maxTrx) * 100;
                      const hasSales = hour.count > 0;
                      return (
                        <div
                          key={hour.hour}
                          className="flex-1 flex flex-col items-center group relative h-full justify-end"
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute -top-8 bg-stone-950 text-[10px] font-bold text-stone-200 px-2 py-1 rounded-md border border-stone-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap shadow-md">
                            {hour.label}: {hour.count} nota ({formatIDR(hour.totalRevenue)})
                          </div>

                          <div
                            className={`w-full rounded-t-xs transition-all duration-300 ${
                              hasSales
                                ? 'bg-amber-500 group-hover:bg-amber-400'
                                : 'bg-stone-800/60'
                            }`}
                            style={{
                              height: `${hasSales ? Math.max(12, heightPercent) : 4}%`,
                            }}
                          />
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="flex justify-between text-[10px] text-stone-400 font-mono mt-2 pt-1 border-t border-stone-800/80 px-1">
                  <span>06:00 (Pagi)</span>
                  <span>12:00 (Siang)</span>
                  <span>18:00 (Sore)</span>
                  <span>22:00 (Malam)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Top Products Breakdown Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Coffee size={16} className="text-amber-400" />
                  <span>Daftar Rinci Produk Terlaris</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Tabel performa penjualan, margin per menu, dan kontribusi terhadap total pendapatan
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Cari nama menu..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/70 border-b border-stone-800 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Menu Minuman</th>
                    <th className="py-3 px-4 text-center">Volume Terjual</th>
                    <th className="py-3 px-4 text-right">Total Omzet</th>
                    <th className="py-3 px-4 text-right">Estimasi HPP</th>
                    <th className="py-3 px-4 text-right">Laba Kotor</th>
                    <th className="py-3 px-4 text-center">Margin %</th>
                    <th className="py-3 px-4 text-right">Porsi Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {filteredProducts.map((prod, index) => {
                    const isSelected = selectedProductId === prod.productId;
                    return (
                      <tr
                        key={prod.productId}
                        onClick={() =>
                          setSelectedProductId(isSelected ? null : prod.productId)
                        }
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-500/10 text-white font-medium'
                            : 'hover:bg-stone-800/40 text-stone-300'
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-3 px-4 text-center">
                          {index === 0 && (
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black inline-flex items-center justify-center">
                              1
                            </span>
                          )}
                          {index === 1 && (
                            <span className="w-6 h-6 rounded-full bg-stone-700/60 text-stone-300 border border-stone-600/50 text-xs font-black inline-flex items-center justify-center">
                              2
                            </span>
                          )}
                          {index === 2 && (
                            <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30 text-xs font-black inline-flex items-center justify-center">
                              3
                            </span>
                          )}
                          {index > 2 && (
                            <span className="text-stone-400 font-mono text-xs">
                              #{index + 1}
                            </span>
                          )}
                        </td>

                        {/* Product Title & Trx count */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{prod.productName}</div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            Muncul di {prod.transactionCount} nota transaksi
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-white bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
                            {prod.quantitySold} Cup
                          </span>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            {prod.quantitySharePercent}% dari total
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="py-3 px-4 text-right font-bold text-amber-400 font-mono">
                          {formatIDR(prod.totalRevenue)}
                        </td>

                        {/* HPP COGS */}
                        <td className="py-3 px-4 text-right text-stone-400 font-mono">
                          {formatIDR(prod.totalCogs)}
                        </td>

                        {/* Gross Profit */}
                        <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                          {formatIDR(prod.grossProfit)}
                        </td>

                        {/* Margin % */}
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            {prod.profitMarginPercent}%
                          </span>
                        </td>

                        {/* Share Progress Bar */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-xs font-bold text-stone-200">
                              {prod.revenueSharePercent}%
                            </span>
                            <div className="w-14 h-1.5 bg-stone-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${prod.revenueSharePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
            <Coffee size={32} />
          </div>

          <div className="max-w-md space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Tidak Ada Transaksi pada {selectedDate}
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Belum ada penjualan POS yang selesai dicatat untuk tanggal ini. Anda dapat beralih ke tanggal lain, membuat transaksi baru di kasir, atau memuat data simulasi untuk melihat visualisasi laporan.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSeedSamples}
              disabled={loading}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/15 transition-all"
            >
              <Sparkles size={15} />
              <span>Muat Data Contoh Penjualan Hari Ini</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetQuickDate(0)}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs rounded-xl transition-colors"
            >
              Kembali ke Hari Ini
            </button>
          </div>
        </div>
      )}

      {/* Printable Receipt / Daily Closing Slip Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">Slip Rekap Penjualan Harian</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            {/* Printable Area styled like thermal closing slip */}
            <div className="p-6 bg-stone-950 font-mono text-xs text-stone-300 space-y-3 select-all">
              <div className="text-center pb-2 border-b border-dashed border-stone-700">
                <p className="font-black text-sm text-white">
                  {settings?.businessName || 'CAOZY KEDAI MINUMAN'}
                </p>
                <p className="text-[10px] text-stone-400">REKAP PENJUALAN HARIAN (CLOSING)</p>
                <p className="text-[10px] text-stone-400">Tanggal: {selectedDate}</p>
              </div>

              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-stone-700">
                <div className="flex justify-between">
                  <span>Total Transaksi:</span>
                  <span className="font-bold text-white">{summary.transactionCount} Nota</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cup Terjual:</span>
                  <span className="font-bold text-white">{summary.totalItemsSold} Cup</span>
                </div>
                <div className="flex justify-between">
                  <span>Penjualan Kotor:</span>
                  <span>{formatIDR(summary.totalGross)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diskon Promo:</span>
                  <span>-{formatIDR(summary.totalDiscounts)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-400 pt-1 border-t border-stone-800">
                  <span>TOTAL OMZET BERSIH:</span>
                  <span>{formatIDR(summary.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Total HPP (FIFO):</span>
                  <span>{formatIDR(summary.totalCogs)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400">
                  <span>LABA KOTOR (GP):</span>
                  <span>{formatIDR(summary.grossProfit)} ({summary.profitMarginPercent}%)</span>
                </div>
              </div>

              {/* Top 3 products */}
              <div className="space-y-1 text-[10px] pb-2 border-b border-dashed border-stone-700">
                <p className="font-bold text-stone-400 uppercase">Top 3 Produk Terlaris:</p>
                {topProducts.slice(0, 3).map((p, i) => (
                  <div key={p.productId} className="flex justify-between">
                    <span>{i + 1}. {p.productName}</span>
                    <span>{p.quantitySold} Cup ({formatIDR(p.totalRevenue)})</span>
                  </div>
                ))}
              </div>

              {/* Payments */}
              <div className="space-y-1 text-[10px]">
                <p className="font-bold text-stone-400 uppercase">Rincian Pembayaran:</p>
                {paymentBreakdown.map((pm) => (
                  <div key={pm.method} className="flex justify-between">
                    <span>{pm.label}:</span>
                    <span>{formatIDR(pm.totalAmount)} ({pm.count}x)</span>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2 text-[9px] text-stone-500">
                Dicetak pada {new Date().toLocaleString('id-ID')}
              </div>
            </div>

            <div className="p-4 border-t border-stone-800 flex justify-end gap-2 bg-stone-900">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
