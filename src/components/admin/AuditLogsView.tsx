import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { AuditLog } from '../../types';
import { Shield, Clock, Search, Download, Filter, ShoppingBag, Truck, Package, Layers, Landmark } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'sales' | 'purchasing' | 'inventory' | 'finance'>('all');

  useEffect(() => {
    const load = async () => {
      const all = await db.auditLogs.orderBy('timestamp').reverse().toArray();
      setLogs(all);
    };
    load();
  }, []);

  const filtered = logs.filter((l) => {
    // Search match
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === 'all') return true;

    if (categoryFilter === 'sales') {
      return (
        l.entity === 'sales' ||
        l.entity === 'sale' ||
        l.action.includes('SALE') ||
        l.action.includes('PAYMENT') ||
        l.action.includes('VOID') ||
        l.action.includes('REFUND') ||
        l.action.includes('DISCOUNT')
      );
    }

    if (categoryFilter === 'purchasing') {
      return (
        l.entity === 'purchases' ||
        l.entity === 'supplier' ||
        l.action.startsWith('PURCHASE_') ||
        l.action.startsWith('GOODS_RECEIPT_') ||
        l.action.includes('SUPPLIER')
      );
    }

    if (categoryFilter === 'inventory') {
      return (
        l.entity === 'ingredient' ||
        l.entity === 'cost_layer' ||
        l.entity === 'stock' ||
        l.action.includes('STOCK') ||
        l.action.includes('INGREDIENT') ||
        l.action.includes('RESET')
      );
    }

    if (categoryFilter === 'finance') {
      return (
        l.entity === 'asset' ||
        l.entity === 'expense' ||
        l.entity === 'cashier_shift' ||
        l.action.includes('ASSET') ||
        l.action.includes('EXPENSE') ||
        l.action.includes('SHIFT')
      );
    }

    return true;
  });

  const exportAuditToCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Waktu', 'Petugas', 'Aksi', 'Entitas', 'ID Entitas', 'Rincian Perubahan'];
    const rows = filtered.map((l) => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.actorName.replace(/"/g, '""')}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.entity.replace(/"/g, '""')}"`,
      `"${(l.entityId || '').replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_Caozy_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeClass = (action: string) => {
    if (action.startsWith('PURCHASE_ORDER_CREATED')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (action.startsWith('GOODS_RECEIPT_ARRIVED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('VOID') || action.includes('CANCEL') || action.includes('REFUND')) {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (action.includes('SALE') || action.includes('PAYMENT')) {
      return 'bg-[#b6d333]/10 text-[#b6d333] border-[#b6d333]/30';
    }
    if (action.includes('ASSET')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
    return 'bg-stone-800 text-stone-300 border-stone-700';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Shield size={22} className="text-amber-400" />
            <span>Audit Trail & Log Aktivitas Bisnis</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Jejak rekaman transaksi pembelian, penerimaan fisik barang, penjualan POS, mutasi stok, dan aset yang tidak dapat dimanipulasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportAuditToCSV}
            disabled={filtered.length === 0}
            className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 border border-stone-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[#b6d333] text-stone-950 font-black'
                : 'bg-stone-900 text-stone-400 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            Semua Log ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('purchasing')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'purchasing'
                ? 'bg-amber-500 text-stone-950 font-black'
                : 'bg-stone-900 text-amber-400/90 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Truck size={13} />
            <span>Pembelian & Penerimaan</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('sales')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'sales'
                ? 'bg-emerald-500 text-stone-950 font-black'
                : 'bg-stone-900 text-emerald-400/90 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <ShoppingBag size={13} />
            <span>Penjualan (Sales POS)</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('inventory')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'inventory'
                ? 'bg-[#b6d333] text-stone-950 font-black'
                : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Package size={13} />
            <span>Stok & FIFO</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('finance')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'finance'
                ? 'bg-cyan-500 text-stone-950 font-black'
                : 'bg-stone-900 text-cyan-400/90 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Landmark size={13} />
            <span>Aset & Keuangan</span>
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari PO, faktur, aksi, petugas..."
            className="w-full sm:w-64 bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#b6d333]"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Petugas</th>
                <th className="p-3">Aksi</th>
                <th className="p-3">Entitas</th>
                <th className="p-3">Rincian Perubahan & Finansial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-stone-800/40">
                  <td className="p-3 text-stone-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="p-3 font-semibold text-white whitespace-nowrap">{log.actorName}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`font-mono text-[10px] font-bold border px-2 py-0.5 rounded ${getActionBadgeClass(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 uppercase text-[10px] text-stone-400 font-semibold">{log.entity}</td>
                  <td className="p-3 text-stone-300 max-w-xl leading-relaxed">{log.details}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500">
                    Tidak ada catatan audit ditemukan dengan filter saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
