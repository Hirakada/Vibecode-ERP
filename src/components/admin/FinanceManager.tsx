import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Expense, CashierShift } from '../../types';
import { formatIDR } from '../../lib/currency';
import { DollarSign, Plus, Clock, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export const FinanceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pnl' | 'expenses' | 'shifts'>('pnl');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [pnlSummary, setPnlSummary] = useState({
    grossSales: 0,
    discounts: 0,
    netSales: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netProfit: 0,
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

    const sales = await db.sales.toArray();
    const gross = sales.reduce((sum, s) => sum + s.subtotal, 0);
    const disc = sales.reduce((sum, s) => sum + s.discount, 0);
    const net = gross - disc;
    const totalCogs = sales.reduce((sum, s) => sum + s.totalCogs, 0);
    const grossProf = net - totalCogs;
    const totalExp = exps.reduce((sum, e) => sum + e.amount, 0);
    const netProf = grossProf - totalExp;

    setPnlSummary({
      grossSales: gross,
      discounts: disc,
      netSales: net,
      cogs: totalCogs,
      grossProfit: grossProf,
      operatingExpenses: totalExp,
      netProfit: netProf,
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
      recordedBy: 'Staf Keuangan',
    };

    await db.expenses.add(newExp);

    await db.auditLogs.add({
      id: `audit-exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'finance',
      actorName: 'Staf Keuangan',
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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <DollarSign size={22} className="text-amber-400" />
          <span>Keuangan & Rekonsiliasi Kas</span>
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Laporan Laba Rugi (P&L), pencatatan biaya operasional, dan riwayat rekonsiliasi kas laci kasir.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-800 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('pnl')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'pnl'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Laporan Laba Rugi (P&L)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'expenses'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Pengeluaran Operasional ({expenses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'shifts'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Rekonsiliasi Shift Kasir ({shifts.length})
        </button>
      </div>

      {/* TAB 1: P&L STATEMENT */}
      {activeTab === 'pnl' && (
        <div className="max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h2 className="text-sm font-bold text-white">Laporan Laba Rugi Berjalan (P&L)</h2>
              <p className="text-[11px] text-stone-500">Standar Akuntansi Kedai Minuman Caozy</p>
            </div>
            <FileSpreadsheet size={20} className="text-amber-400" />
          </div>

          <div className="space-y-2.5 text-stone-300">
            <div className="flex justify-between">
              <span>Penjualan Kotor (Gross Sales):</span>
              <span className="font-mono font-semibold text-white">{formatIDR(pnlSummary.grossSales)}</span>
            </div>
            {pnlSummary.discounts > 0 && (
              <div className="flex justify-between text-stone-400 pl-3">
                <span>(-) Potongan Diskon Promosi:</span>
                <span className="font-mono text-amber-400">-{formatIDR(pnlSummary.discounts)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-stone-100 pt-1 border-t border-stone-800">
              <span>Penjualan Bersih (Net Revenue):</span>
              <span className="font-mono">{formatIDR(pnlSummary.netSales)}</span>
            </div>

            <div className="flex justify-between text-sky-400 pt-1">
              <span>(-) HPP Bahan Baku & Kemasan Terjual (FIFO COGS):</span>
              <span className="font-mono font-bold">-{formatIDR(pnlSummary.cogs)}</span>
            </div>

            <div className="flex justify-between font-bold text-emerald-400 py-2 border-y border-stone-800 bg-stone-950/40 px-2 rounded-lg">
              <span>LABA KOTOR (GROSS PROFIT):</span>
              <span className="font-mono text-sm">{formatIDR(pnlSummary.grossProfit)}</span>
            </div>

            <div className="flex justify-between text-red-400 pt-1">
              <span>(-) Total Beban Operasional:</span>
              <span className="font-mono font-bold">-{formatIDR(pnlSummary.operatingExpenses)}</span>
            </div>

            <div className="flex justify-between font-extrabold text-white text-sm pt-3 border-t-2 border-stone-700">
              <span>LABA BERSIH OPERASIONAL (NET PROFIT):</span>
              <span className="font-mono text-emerald-400 text-base">{formatIDR(pnlSummary.netProfit)}</span>
            </div>
          </div>

          <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
            💡 <strong>Prinsip Akuntansi FIFO:</strong> Pembelian persediaan bahan dari pemasok dicatat sebagai aset persediaan, bukan langsung menjadi beban HPP. Beban HPP baru diakui secara proporsional saat minuman terjual menggunakan layer biaya FIFO tertua.
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Add expense form */}
          <form onSubmit={handleAddExpense} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
            <div>
              <label className="text-stone-300 font-bold block mb-1">Kategori Beban</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none"
              >
                <option value="operasional">Operasional Harian</option>
                <option value="utilitas">Listrik, Air & Internet</option>
                <option value="gaji">Gaji & Upah Barista</option>
                <option value="sewa">Sewa Tempat</option>
                <option value="pembelian_alat">Peralatan Bar</option>
                <option value="lainnya">Lain-lain</option>
              </select>
            </div>
            <div>
              <label className="text-stone-300 font-bold block mb-1">Jumlah (Rp)</label>
              <input
                type="number"
                min="1000"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Contoh: 75000"
                className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5 font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="text-stone-300 font-bold block mb-1">Deskripsi Pengeluaran</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Beli es batu kristal 2 bal"
                className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              Simpan Pengeluaran
            </button>
          </form>

          {/* List */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Deskripsi</th>
                  <th className="p-3 text-right">Nominal</th>
                  <th className="p-3">Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-800/40">
                    <td className="p-3 text-stone-400">
                      {new Date(exp.date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded uppercase font-bold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-white">{exp.description}</td>
                    <td className="p-3 text-right font-mono font-bold text-red-400">
                      -{formatIDR(exp.amount)}
                    </td>
                    <td className="p-3 text-stone-400">{exp.recordedBy}</td>
                  </tr>
                ))}
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

      {/* TAB 3: SHIFTS */}
      {activeTab === 'shifts' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
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
                    <div>Buka: {new Date(s.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
                    {s.closedAt && (
                      <div className="text-[10px]">Tutup: {new Date(s.closedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono">{formatIDR(s.openingCash)}</td>
                  <td className="p-3 text-right font-mono text-emerald-400">+{formatIDR(s.totalSalesCash)}</td>
                  <td className="p-3 text-right font-mono font-bold text-white">{formatIDR(s.expectedClosingCash)}</td>
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
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                      s.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-stone-800 text-stone-400'
                    }`}>
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
