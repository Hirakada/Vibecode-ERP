import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Expense, CashierShift, BusinessAsset, InventoryCostLayer } from '../../types';
import { formatIDR } from '../../lib/currency';
import { calculateInventoryValuation } from '../../lib/fifo';
import { calculateAssetDepreciation } from '../../services/assetService';
import {
  DollarSign,
  Plus,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  Cpu,
  Building2,
  TrendingDown,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const FinanceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pnl' | 'expenses' | 'shifts' | 'assets'>('pnl');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [assets, setAssets] = useState<BusinessAsset[]>([]);
  const [layers, setLayers] = useState<InventoryCostLayer[]>([]);

  const [pnlSummary, setPnlSummary] = useState({
    grossSales: 0,
    discounts: 0,
    netSales: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    capexExpenses: 0,
    operatingNetProfit: 0,
    netCashFlow: 0,
    totalAssetCost: 0,
    accumulatedDepreciation: 0,
    netBookValue: 0,
    inventoryValuation: 0,
    totalEnterpriseAssets: 0,
  });

  // New Expense form
  const [category, setCategory] = useState<Expense['category']>('operasional');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    const exps = await db.expenses.orderBy('date').reverse().toArray();
    setExpenses(exps);

    const shiftList = await db.shifts.orderBy('openedAt').reverse().toArray();
    setShifts(shiftList);

    const assetList = await db.assets.toArray();
    // Re-calculate updated depreciation values
    const updatedAssets = assetList.map((a) => {
      const dep = calculateAssetDepreciation(
        a.purchaseCost,
        a.salvageValue,
        a.usefulLifeMonths,
        a.purchaseDate
      );
      return {
        ...a,
        monthlyDepreciation: dep.monthlyDepreciation,
        accumulatedDepreciation: dep.accumulatedDepreciation,
        currentBookValue: dep.currentBookValue,
      };
    });
    setAssets(updatedAssets);

    const costLayers = await db.costLayers.toArray();
    setLayers(costLayers);
    const invValuation = calculateInventoryValuation(costLayers);

    const sales = await db.sales.toArray();
    const gross = sales.reduce((sum, s) => sum + (s.subtotal || 0), 0);
    const disc = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
    const net = gross - disc;
    const totalCogs = sales.reduce((sum, s) => sum + (s.totalCogs || 0), 0);
    const grossProf = net - totalCogs;

    // Distinguish between Opex and Capex (pembelian_alat)
    const opexList = exps.filter((e) => e.category !== 'pembelian_alat');
    const capexList = exps.filter((e) => e.category === 'pembelian_alat');

    const opexTotal = opexList.reduce((sum, e) => sum + (e.amount || 0), 0);
    const capexTotal = capexList.reduce((sum, e) => sum + (e.amount || 0), 0);

    const operatingNet = grossProf - opexTotal;
    const netCash = net - opexTotal - capexTotal;

    const totalAssetCost = updatedAssets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
    const totalDeprec = updatedAssets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);
    const totalBookVal = updatedAssets.reduce((s, a) => s + (a.currentBookValue || 0), 0);
    const totalStoreAssets = totalBookVal + invValuation;

    setPnlSummary({
      grossSales: gross,
      discounts: disc,
      netSales: net,
      cogs: totalCogs,
      grossProfit: grossProf,
      operatingExpenses: opexTotal,
      capexExpenses: capexTotal,
      operatingNetProfit: operatingNet,
      netCashFlow: netCash,
      totalAssetCost,
      accumulatedDepreciation: totalDeprec,
      netBookValue: totalBookVal,
      inventoryValuation: invValuation,
      totalEnterpriseAssets: totalStoreAssets,
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString(),
      category,
      amount,
      description: description.trim(),
      paymentMethod: 'cash',
      recordedBy: 'Hirakada (Owner)',
    };

    await db.expenses.add(newExp);

    await db.auditLogs.add({
      id: `audit-exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: 'RECORD_EXPENSE',
      entity: 'expenses',
      entityId: newExp.id,
      details: `Catat pengeluaran ${category}: ${description} senilai ${formatIDR(amount)}`,
    });

    setSuccessMsg('Pengeluaran berhasil dicatat!');
    setAmount(0);
    setDescription('');
    await loadData();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <DollarSign size={22} className="text-[#b6d333]" />
            <span>Laporan Keuangan, Kas & Neraca Aset</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Laporan Laba Rugi komprehensif, evaluasi belanja modal (Capex), nilai buku aset tetap, dan rekonsiliasi kasir.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Pendapatan Bersih (Net Revenue)
          </span>
          <p className="text-base sm:text-lg font-black text-white font-mono">
            {formatIDR(pnlSummary.netSales)}
          </p>
          <span className="text-[10px] text-stone-500 block">
            Setelah potongan diskon
          </span>
        </div>

        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Laba Bersih Operasional
          </span>
          <p
            className={`text-base sm:text-lg font-black font-mono ${
              pnlSummary.operatingNetProfit >= 0 ? 'text-[#b6d333]' : 'text-red-400'
            }`}
          >
            {formatIDR(pnlSummary.operatingNetProfit)}
          </p>
          <span className="text-[10px] text-stone-500 block">
            Sebelum belanja modal capex
          </span>
        </div>

        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Belanja Modal Aset (Capex)
          </span>
          <p className="text-base sm:text-lg font-black text-amber-400 font-mono">
            {formatIDR(pnlSummary.capexExpenses)}
          </p>
          <span className="text-[10px] text-stone-500 block">
            Investasi mesin & peralatan
          </span>
        </div>

        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Total Kekayaan Aset Usaha
          </span>
          <p className="text-base sm:text-lg font-black text-emerald-400 font-mono">
            {formatIDR(pnlSummary.totalEnterpriseAssets)}
          </p>
          <span className="text-[10px] text-stone-500 block">
            Aset Tetap + Stok FIFO
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('pnl')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'pnl'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Laporan Laba Rugi & Arus Kas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'assets'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Ringkasan Aset & Capex ({assets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'expenses'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Rincian Pengeluaran ({expenses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'shifts'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Rekonsiliasi Shift Kasir ({shifts.length})
        </button>
      </div>

      {/* TAB 1: P&L STATEMENT & ASSET BALANCE SHEET */}
      {activeTab === 'pnl' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Statement of Profit & Loss */}
          <div className="bg-[#232529] border border-stone-800 rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div>
                <h2 className="text-sm font-bold text-white">Laporan Laba Rugi Berjalan (P&L)</h2>
                <p className="text-[11px] text-stone-400">Standar Akuntansi Usaha Minuman Caozy</p>
              </div>
              <FileSpreadsheet size={20} className="text-[#b6d333]" />
            </div>

            <div className="space-y-2.5 text-stone-300">
              <div className="flex justify-between">
                <span>Penjualan Kotor (Gross Sales):</span>
                <span className="font-mono font-semibold text-white">
                  {formatIDR(pnlSummary.grossSales)}
                </span>
              </div>
              {pnlSummary.discounts > 0 && (
                <div className="flex justify-between text-stone-400 pl-3">
                  <span>(-) Potongan Diskon Promosi:</span>
                  <span className="font-mono text-amber-400">
                    -{formatIDR(pnlSummary.discounts)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-stone-100 pt-1 border-t border-stone-800">
                <span>Penjualan Bersih (Net Revenue):</span>
                <span className="font-mono">{formatIDR(pnlSummary.netSales)}</span>
              </div>

              <div className="flex justify-between text-sky-400 pt-1">
                <span>(-) HPP Bahan Baku Terjual (FIFO COGS):</span>
                <span className="font-mono font-bold">-{formatIDR(pnlSummary.cogs)}</span>
              </div>

              <div className="flex justify-between font-bold text-emerald-400 py-2 border-y border-stone-800 bg-stone-950/40 px-2 rounded-lg">
                <span>LABA KOTOR (GROSS PROFIT):</span>
                <span className="font-mono text-sm">{formatIDR(pnlSummary.grossProfit)}</span>
              </div>

              <div className="flex justify-between text-red-400 pt-1">
                <span>(-) Beban Operasional Rutin (Opex):</span>
                <span className="font-mono font-bold">
                  -{formatIDR(pnlSummary.operatingExpenses)}
                </span>
              </div>

              <div className="flex justify-between font-extrabold text-white text-sm py-2.5 border-y border-stone-800 bg-[#1a1b1e] px-2.5 rounded-xl">
                <span>LABA BERSIH OPERASIONAL:</span>
                <span className="font-mono text-[#b6d333] text-base">
                  {formatIDR(pnlSummary.operatingNetProfit)}
                </span>
              </div>

              <div className="flex justify-between text-amber-400 pt-1">
                <span>(-) Belanja Modal Pembelian Aset (Capex):</span>
                <span className="font-mono font-bold">
                  -{formatIDR(pnlSummary.capexExpenses)}
                </span>
              </div>

              <div className="flex justify-between font-extrabold text-white text-xs pt-2 border-t border-stone-800">
                <span>ARUS KAS BERSIH (NET CASH FLOW):</span>
                <span
                  className={`font-mono font-black ${
                    pnlSummary.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatIDR(pnlSummary.netCashFlow)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#1a1b1e] rounded-xl border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
              💡 <strong>Catatan Akuntansi:</strong> Pembelian aset tetap (seperti mesin espresso, grinder, kulkas) dicatat sebagai Belanja Modal (Capex). Aset menambah nilai kekayaan kedai dan disusutkan secara bertahap setiap bulan.
            </div>
          </div>

          {/* Balance Sheet / Asset Summary */}
          <div className="bg-[#232529] border border-stone-800 rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Ringkasan Neraca Kekayaan Aset Kedai
                </h2>
                <p className="text-[11px] text-stone-400">
                  Total Nilai Buku Aset Tetap & Persediaan Bahan Baku
                </p>
              </div>
              <Cpu size={20} className="text-[#b6d333]" />
            </div>

            <div className="space-y-3">
              {/* Asset Fixed Assets Block */}
              <div className="p-3 bg-[#1a1b1e] rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-stone-200">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-[#b6d333]" />
                    <span>Aset Tetap (Peralatan & Mesin):</span>
                  </span>
                  <span className="font-mono text-white">
                    {formatIDR(pnlSummary.netBookValue)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-400 pl-4">
                  <span>• Total Harga Beli (Perolehan):</span>
                  <span className="font-mono">{formatIDR(pnlSummary.totalAssetCost)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-amber-400 pl-4">
                  <span>• Akumulasi Depresiasi:</span>
                  <span className="font-mono">
                    -{formatIDR(pnlSummary.accumulatedDepreciation)}
                  </span>
                </div>
              </div>

              {/* FIFO Inventory Block */}
              <div className="p-3 bg-[#1a1b1e] rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-stone-200">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-[#b6d333]" />
                    <span>Aset Lancar (Persediaan Stok FIFO):</span>
                  </span>
                  <span className="font-mono text-white">
                    {formatIDR(pnlSummary.inventoryValuation)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-400 pl-4">
                  <span>• Total Layer Batch Bahan Baku:</span>
                  <span className="font-mono">
                    {layers.filter((l) => !l.isDepleted && l.remainingQuantity > 0).length} batch aktif
                  </span>
                </div>
              </div>

              {/* Total Enterprise Net Value */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-300 text-xs uppercase">
                    Total Nilai Aset Usaha Kedai Caozy:
                  </span>
                  <span className="font-mono font-black text-base text-emerald-400">
                    {formatIDR(pnlSummary.totalEnterpriseAssets)}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-200/70">
                  Kombinasi nilai buku mesin/peralatan aktif + nilai rupiah stok bahan baku di gudang/bar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSETS & CAPEX */}
      {activeTab === 'assets' && (
        <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden text-xs">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Daftar Pembelian Aset Tetap & Nilai Buku (Capex)
              </h3>
              <p className="text-[11px] text-stone-400">
                Peralatan dan mesin terdaftar yang membentuk aset modal usaha.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#b6d333]">
              Total Nilai Buku: {formatIDR(pnlSummary.netBookValue)}
            </span>
          </div>

          {assets.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              Belum ada aset tetap yang tercatat. Buka menu &quot;Aset &amp; Belanja Modal&quot; untuk mencatat pembelian peralatan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
                  <tr>
                    <th className="p-3">Kode & Nama Aset</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Tgl Beli</th>
                    <th className="p-3 text-right">Harga Perolehan</th>
                    <th className="p-3 text-right">Akumulasi Depr.</th>
                    <th className="p-3 text-right">Nilai Buku</th>
                    <th className="p-3 text-center">Kondisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-stone-300">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-stone-800/40">
                      <td className="p-3">
                        <span className="font-bold text-white block">{asset.name}</span>
                        <span className="text-[10px] text-[#b6d333] font-mono">{asset.code}</span>
                      </td>
                      <td className="p-3 capitalize">{asset.category.replace(/_/g, ' ')}</td>
                      <td className="p-3 text-stone-400">
                        {new Date(asset.purchaseDate).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white">
                        {formatIDR(asset.purchaseCost)}
                      </td>
                      <td className="p-3 text-right font-mono text-amber-400">
                        -{formatIDR(asset.accumulatedDepreciation)}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-[#b6d333]">
                        {formatIDR(asset.currentBookValue)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-800 text-stone-300 border border-stone-700">
                          {asset.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXPENSES LIST & FORM */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Add expense form */}
          <form
            onSubmit={handleAddExpense}
            className="bg-[#232529] border border-stone-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end"
          >
            <div>
              <label className="text-stone-300 font-bold block mb-1">Kategori Pengeluaran</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
              >
                <option value="operasional">Operasional Harian (Opex)</option>
                <option value="pembelian_alat">Pembelian Aset / Peralatan (Capex)</option>
                <option value="utilitas">Listrik, Air & Internet</option>
                <option value="gaji">Gaji & Upah Barista</option>
                <option value="sewa">Sewa Tempat</option>
                <option value="lainnya">Lain-lain</option>
              </select>
            </div>
            <div>
              <label className="text-stone-300 font-bold block mb-1">Nominal (Rp)</label>
              <input
                type="number"
                min="1000"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="Contoh: 75000"
                className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
                required
              />
            </div>
            <div>
              <label className="text-stone-300 font-bold block mb-1">Deskripsi Pengeluaran</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Beli es batu kristal / servis grinder"
                className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black py-2.5 px-4 rounded-xl transition-colors cursor-pointer shadow-md shadow-[#b6d333]/15"
            >
              Simpan Pengeluaran
            </button>
          </form>

          {/* List */}
          <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Kategori & Tipe</th>
                  <th className="p-3">Deskripsi</th>
                  <th className="p-3 text-right">Nominal</th>
                  <th className="p-3">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {expenses.map((exp) => {
                  const isCapex = exp.category === 'pembelian_alat';
                  return (
                    <tr key={exp.id} className="hover:bg-stone-800/40">
                      <td className="p-3 text-stone-400">
                        {new Date(exp.date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            isCapex
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-stone-800 text-stone-300 border border-stone-700'
                          }`}
                        >
                          {isCapex ? 'Aset Tetap (Capex)' : exp.category}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-white">{exp.description}</td>
                      <td
                        className={`p-3 text-right font-mono font-bold ${
                          isCapex ? 'text-amber-400' : 'text-red-400'
                        }`}
                      >
                        -{formatIDR(exp.amount)}
                      </td>
                      <td className="p-3 text-stone-400">{exp.recordedBy}</td>
                    </tr>
                  );
                })}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-stone-500">
                      Belum ada catatan pengeluaran.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SHIFTS */}
      {activeTab === 'shifts' && (
        <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-3">Kasir</th>
                <th className="p-3">Waktu Buka / Tutup</th>
                <th className="p-3 text-right">Kas Awal</th>
                <th className="p-3 text-right">Penjualan Tunai</th>
                <th className="p-3 text-right">Kas Diharapkan</th>
                <th className="p-3 text-right">Kas Aktual</th>
                <th className="p-3 text-center">Selisih</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-stone-800/40">
                  <td className="p-3 font-bold text-white">{s.cashierName}</td>
                  <td className="p-3 text-stone-400">
                    <div>
                      Buka:{' '}
                      {new Date(s.openedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </div>
                    {s.closedAt && (
                      <div className="text-[10px]">
                        Tutup:{' '}
                        {new Date(s.closedAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono">{formatIDR(s.openingCash)}</td>
                  <td className="p-3 text-right font-mono text-emerald-400">
                    +{formatIDR(s.totalSalesCash)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-white">
                    {formatIDR(s.expectedClosingCash)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {s.actualClosingCash !== undefined ? formatIDR(s.actualClosingCash) : '-'}
                  </td>
                  <td className="p-3 text-center font-bold">
                    {s.variance !== undefined ? (
                      <span className={s.variance === 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {s.variance === 0 ? 'Pas' : formatIDR(s.variance)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        s.status === 'open'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
