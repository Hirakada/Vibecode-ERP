import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { UserProfile } from '../../types';
import { formatIDR } from '../../lib/currency';
import {
  Database,
  Download,
  Copy,
  Check,
  Search,
  RefreshCw,
  Table,
  Code,
  Layers,
  ArrowRight,
  ShieldAlert,
  HardDrive,
  FileJson,
} from 'lucide-react';

interface RawDatabaseViewerProps {
  currentUser: UserProfile;
}

type TableName =
  | 'products'
  | 'categories'
  | 'ingredients'
  | 'costLayers'
  | 'recipes'
  | 'sales'
  | 'suppliers'
  | 'goodsReceipts'
  | 'expenses'
  | 'assets'
  | 'shifts'
  | 'users'
  | 'settings'
  | 'stockMovements'
  | 'auditLogs';

const TABLE_META: Record<
  TableName,
  { label: string; icon: string; description: string }
> = {
  products: { label: 'products', icon: '☕', description: 'Menu produk minuman dan varian harga' },
  categories: { label: 'categories', icon: '🏷️', description: 'Kategori menu (standar online & custom)' },
  ingredients: { label: 'ingredients', icon: '📦', description: 'Master bahan baku, satuan & batas min' },
  costLayers: { label: 'costLayers', icon: '📑', description: 'Layer biaya FIFO dengan batch number' },
  recipes: { label: 'recipes', icon: '📖', description: 'Komposisi takaran resep per porsi (BOM)' },
  sales: { label: 'sales', icon: '🧾', description: 'Transaksi pesanan POS kasir' },
  suppliers: { label: 'suppliers', icon: '🏢', description: 'Daftar vendor dan pemasok barang' },
  goodsReceipts: { label: 'goodsReceipts', icon: '🚚', description: 'Pencatatan faktur barang masuk' },
  expenses: { label: 'expenses', icon: '💸', description: 'Beban operasional & belanja aset' },
  assets: { label: 'assets', icon: '⚙️', description: 'Aset tetap, harga beli & nilai buku' },
  shifts: { label: 'shifts', icon: '⏱️', description: 'Rekonsiliasi kas laci dan shift kasir' },
  users: { label: 'users', icon: '👥', description: 'Daftar akun pengguna dan hak akses RBAC' },
  settings: { label: 'settings', icon: '⚙️', description: 'Pengaturan toko, pajak PB1, dan struk' },
  stockMovements: { label: 'stockMovements', icon: '🔄', description: 'Riwayat mutasi stok masuk, keluar, waste' },
  auditLogs: { label: 'auditLogs', icon: '🛡️', description: 'Rekaman jejak audit aktivitas sistem' },
};

export const RawDatabaseViewer: React.FC<RawDatabaseViewerProps> = ({ currentUser }) => {
  const [selectedTable, setSelectedTable] = useState<TableName>('products');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isAuthorized = currentUser.role === 'owner' || currentUser.role === 'manager';

  const loadCountsAndTable = async () => {
    setIsLoading(true);
    try {
      const counts: Record<string, number> = {};
      for (const t of Object.keys(TABLE_META) as TableName[]) {
        const tableObj = (db as any)[t];
        if (tableObj) {
          counts[t] = await tableObj.count();
        } else {
          counts[t] = 0;
        }
      }
      setTableCounts(counts);

      const activeTableObj = (db as any)[selectedTable];
      if (activeTableObj) {
        const records = await activeTableObj.toArray();
        setTableData(records);
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.error('Error loading DB raw data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCountsAndTable();
  }, [selectedTable]);

  if (!isAuthorized) {
    return (
      <div className="p-8 bg-[#232529] border border-red-900/60 rounded-3xl text-center space-y-3 max-w-lg mx-auto my-12">
        <ShieldAlert size={48} className="text-red-400 mx-auto" />
        <h2 className="text-base font-bold text-white">Akses Dibatasi</h2>
        <p className="text-xs text-stone-400">
          Modul Inspektor Raw Database hanya dapat diakses oleh akun dengan peran Pemilik (Owner) atau Manajer Toko.
        </p>
      </div>
    );
  }

  const filteredData = tableData.filter((row) => {
    if (!search.trim()) return true;
    const jsonStr = JSON.stringify(row).toLowerCase();
    return jsonStr.includes(search.toLowerCase());
  });

  const handleCopyJson = () => {
    const jsonText = JSON.stringify(filteredData, null, 2);
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadBackup = async () => {
    const fullBackup: Record<string, any[]> = {};
    for (const t of Object.keys(TABLE_META) as TableName[]) {
      const tableObj = (db as any)[t];
      if (tableObj) {
        fullBackup[t] = await tableObj.toArray();
      }
    }

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caozy-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Derive column headers dynamically from records
  const sampleObj = filteredData[0] || {};
  const columns = Object.keys(sampleObj);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Database size={22} className="text-[#b6d333]" />
              <span>Inspektor Raw Database (Dexie IndexedDB)</span>
            </h1>
            <span className="text-[10px] bg-[#b6d333]/15 text-[#b6d333] border border-[#b6d333]/30 px-2 py-0.5 rounded font-bold uppercase">
              Khusus Owner & Admin
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Eksplorasi data mentah tabel database lokal, inspeksi JSON per baris, dan ekspor file cadangan (backup).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Salin JSON tabel ke clipboard"
          >
            {copied ? <Check size={14} className="text-[#b6d333]" /> : <Copy size={14} />}
            <span>{copied ? 'Tersalin!' : 'Salin JSON'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-4 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer"
            title="Download seluruh koleksi database ke file JSON"
          >
            <Download size={15} />
            <span>Unduh Cadangan Lengkap (.json)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Collections Sidebar & Data Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Collections List */}
        <div className="lg:col-span-1 bg-[#232529] border border-stone-800 rounded-2xl p-3 space-y-1.5 h-fit">
          <span className="text-[11px] uppercase font-bold text-stone-400 px-2 block mb-1">
            Koleksi Tabel Database ({Object.keys(TABLE_META).length})
          </span>
          <div className="space-y-1">
            {(Object.keys(TABLE_META) as TableName[]).map((tbl) => {
              const meta = TABLE_META[tbl];
              const count = tableCounts[tbl] ?? 0;
              const isSelected = selectedTable === tbl;

              return (
                <button
                  key={tbl}
                  type="button"
                  onClick={() => {
                    setSelectedTable(tbl);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#b6d333] text-stone-950 font-black shadow-md shadow-[#b6d333]/20'
                      : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{meta.icon}</span>
                    <span className="font-mono text-xs">{meta.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isSelected
                        ? 'bg-stone-950/20 text-stone-950'
                        : 'bg-stone-900 text-[#b6d333] border border-stone-800'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Data View Area */}
        <div className="lg:col-span-3 bg-[#232529] border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{TABLE_META[selectedTable]?.icon}</span>
                <span className="text-sm font-black text-white font-mono">
                  db.{selectedTable}
                </span>
                <span className="text-[11px] text-stone-400">
                  ({filteredData.length} dari {tableData.length} baris)
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {TABLE_META[selectedTable]?.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search bar */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nilai di baris..."
                  className="bg-[#1a1b1e] border border-stone-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#b6d333] w-44 sm:w-56"
                />
              </div>

              {/* View mode toggle */}
              <div className="flex p-0.5 bg-[#1a1b1e] border border-stone-700 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors ${
                    viewMode === 'table'
                      ? 'bg-[#b6d333] text-stone-950 font-black'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Table size={13} />
                  <span>Tabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('json')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors ${
                    viewMode === 'json'
                      ? 'bg-[#b6d333] text-stone-950 font-black'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Code size={13} />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              Tidak ada data yang ditemukan di tabel <strong className="text-stone-300 font-mono">{selectedTable}</strong>.
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-xl border border-stone-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1b1e] text-stone-400 font-mono uppercase text-[10px] border-b border-stone-800">
                  <tr>
                    <th className="p-2.5 w-12 text-center text-stone-500">#</th>
                    {columns.slice(0, 7).map((col) => (
                      <th key={col} className="p-2.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    {columns.length > 7 && (
                      <th className="p-2.5 text-stone-500">+ {columns.length - 7} kolom lain</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-mono text-[11px] text-stone-300">
                  {filteredData.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-stone-800/40">
                      <td className="p-2.5 text-center text-stone-500 text-[10px]">
                        {index + 1}
                      </td>
                      {columns.slice(0, 7).map((col) => {
                        const val = row[col];
                        const displayVal =
                          typeof val === 'object'
                            ? JSON.stringify(val)
                            : val !== undefined
                            ? String(val)
                            : '-';
                        return (
                          <td
                            key={col}
                            className="p-2.5 whitespace-nowrap max-w-[200px] truncate"
                            title={displayVal}
                          >
                            {col === 'id' ? (
                              <span className="text-[#b6d333]">{displayVal}</span>
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
                      {columns.length > 7 && (
                        <td className="p-2.5 text-stone-500 text-[10px]">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-[#1a1b1e] border border-stone-800 rounded-xl p-4 overflow-x-auto max-h-[500px]">
              <pre className="font-mono text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(filteredData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
