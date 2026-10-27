import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import {
  BusinessAsset,
  AssetCategory,
  AssetCondition,
  PaymentMethod,
} from '../../types';
import { formatIDR } from '../../lib/currency';
import {
  createAssetPurchase,
  deleteAsset,
  calculateAssetDepreciation,
} from '../../services/assetService';
import {
  Armchair,
  Coffee,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Building2,
  TrendingDown,
  Sparkles,
  Search,
  Filter,
  DollarSign,
  Cpu,
  Refrigerator,
  Wrench,
  Tag,
  ArrowUpRight,
} from 'lucide-react';

const CATEGORY_LABELS: Record<AssetCategory, { label: string; icon: string }> = {
  mesin_kopi: { label: 'Mesin Kopi & Grinder', icon: '☕' },
  alat_bar: { label: 'Peralatan Bar & Blender', icon: '🌪️' },
  refrigerasi: { label: 'Kulkas & Chiller', icon: '❄️' },
  elektronik_pos: { label: 'Sistem POS & Komputer', icon: '🖥️' },
  furnitur: { label: 'Furnitur & Meja Kursi', icon: '🪑' },
  renovasi_dekorasi: { label: 'Dekorasi & Neon Sign', icon: '✨' },
  kendaraan: { label: 'Kendaraan Operasional', icon: '🛵' },
  lainnya: { label: 'Aset Lainnya', icon: '📦' },
};

const COMMON_CAFE_ASSET_TEMPLATES = [
  {
    name: 'Mesin Espresso Komersial 2-Group',
    category: 'mesin_kopi' as AssetCategory,
    cost: 35000000,
    usefulLifeMonths: 48,
    location: 'Bar Depan',
  },
  {
    name: 'Grinder Espresso On-Demand 64mm',
    category: 'mesin_kopi' as AssetCategory,
    cost: 7500000,
    usefulLifeMonths: 36,
    location: 'Bar Depan',
  },
  {
    name: 'Mesin Ice Maker Pembuat Es Kristal 60kg',
    category: 'alat_bar' as AssetCategory,
    cost: 14000000,
    usefulLifeMonths: 48,
    location: 'Kitchen / Belakang Bar',
  },
  {
    name: 'Chiller Showcase Kaca 2 Pintu',
    category: 'refrigerasi' as AssetCategory,
    cost: 8500000,
    usefulLifeMonths: 48,
    location: 'Area Kasir',
  },
  {
    name: 'Commercial Soundproof Blender 2000W',
    category: 'alat_bar' as AssetCategory,
    cost: 4200000,
    usefulLifeMonths: 24,
    location: 'Bar Depan',
  },
  {
    name: 'Perangkat Tablet POS Touchscreen & Printer Thermal',
    category: 'elektronik_pos' as AssetCategory,
    cost: 3800000,
    usefulLifeMonths: 36,
    location: 'Meja Kasir',
  },
  {
    name: 'Set Meja & Kursi Pelanggan Indoor (4 Set)',
    category: 'furnitur' as AssetCategory,
    cost: 6000000,
    usefulLifeMonths: 48,
    location: 'Area Duduk Dine-In',
  },
  {
    name: 'Akrilik Neon Signboard Logo Caozy',
    category: 'renovasi_dekorasi' as AssetCategory,
    cost: 2500000,
    usefulLifeMonths: 36,
    location: 'Fasad Depan Outlet',
  },
];

export const AssetsManager: React.FC = () => {
  const [assets, setAssets] = useState<BusinessAsset[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'buy' | 'depreciation'>('list');
  const [search, setSearch] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Buy Asset Form State
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<AssetCategory>('mesin_kopi');
  const [purchaseCost, setPurchaseCost] = useState<number>(15000000);
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [supplierName, setSupplierName] = useState<string>('');
  const [usefulLifeMonths, setUsefulLifeMonths] = useState<number>(36);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [condition, setCondition] = useState<AssetCondition>('prima');
  const [location, setLocation] = useState<string>('Bar Utama');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const loadData = async () => {
    const list = await db.assets.toArray();
    // Re-evaluate depreciation on load
    const updatedList = list.map((a) => {
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
    setAssets(updatedList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPurchaseCost = assets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
  const totalAccumulatedDepreciation = assets.reduce(
    (s, a) => s + (a.accumulatedDepreciation || 0),
    0
  );
  const totalCurrentBookValue = assets.reduce(
    (s, a) => s + (a.currentBookValue || 0),
    0
  );
  const totalMonthlyDepreciation = assets.reduce(
    (s, a) => s + (a.monthlyDepreciation || 0),
    0
  );

  const applyTemplate = (tpl: (typeof COMMON_CAFE_ASSET_TEMPLATES)[0]) => {
    setName(tpl.name);
    setCategory(tpl.category);
    setPurchaseCost(tpl.cost);
    setUsefulLifeMonths(tpl.usefulLifeMonths);
    setLocation(tpl.location);
    const nextNum = assets.length + 1;
    setCode(`AST-${nextNum < 10 ? '0' : ''}${nextNum}`);
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || purchaseCost <= 0) return;

    setIsSubmitting(true);
    try {
      await createAssetPurchase({
        code: code.trim() || undefined,
        name: name.trim(),
        category,
        purchaseCost: Number(purchaseCost),
        purchaseDate: new Date(purchaseDate).toISOString(),
        supplierName: supplierName.trim() || 'Vendor Toko',
        usefulLifeMonths: Number(usefulLifeMonths) || 36,
        salvageValue: Number(salvageValue) || 0,
        condition,
        location: location.trim(),
        serialNumber: serialNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentMethod,
        recordedBy: 'Hirakada (Owner)',
      });

      setSuccessMsg(
        `Pembelian aset "${name}" senilai ${formatIDR(
          purchaseCost
        )} berhasil dicatat! Biaya pembelian modal telah dibukukan ke Laporan Keuangan.`
      );
      // Reset form
      setName('');
      setCode('');
      setSupplierName('');
      setSerialNumber('');
      setNotes('');
      await loadData();
      setActiveTab('list');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan aset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAsset = async (asset: BusinessAsset) => {
    const ok = confirm(
      `Apakah Anda yakin ingin menghapus data aset "${asset.name}" (${asset.code})?\nCatatan pengeluaran modal terkait di laporan keuangan juga akan disesuaikan.`
    );
    if (!ok) return;

    await deleteAsset(asset.id);
    await loadData();
    setSuccessMsg(`Aset "${asset.name}" berhasil dihapus.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleUpdateCondition = async (
    asset: BusinessAsset,
    newCondition: AssetCondition
  ) => {
    const updated = { ...asset, condition: newCondition };
    await db.assets.put(updated);
    await loadData();
  };

  const filteredAssets = assets.filter((a) => {
    const matchCat =
      selectedCategoryFilter === 'all' || a.category === selectedCategoryFilter;
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      (a.supplierName || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.location || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Cpu size={22} className="text-[#b6d333]" />
            <span>Manajemen Aset Tetap & Belanja Modal (Capex)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Pencatatan pembelian peralatan bar, mesin kopi, furnitur, dan integrasi otomatis dengan neraca laporan keuangan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextNum = assets.length + 1;
            setCode(`AST-${nextNum < 10 ? '0' : ''}${nextNum}`);
            setActiveTab('buy');
          }}
          className="px-4 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Beli / Input Aset Baru</span>
        </button>
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
            Total Harga Perolehan (Capex)
          </span>
          <p className="text-base sm:text-lg font-black text-white font-mono">
            {formatIDR(totalPurchaseCost)}
          </p>
          <span className="text-[10px] text-stone-500 block">
            {assets.length} item aset tercatat
          </span>
        </div>

        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Nilai Buku Bersih (Net Book Value)
          </span>
          <p className="text-base sm:text-lg font-black text-[#b6d333] font-mono">
            {formatIDR(totalCurrentBookValue)}
          </p>
          <span className="text-[10px] text-stone-500 block">
            Kekayaan aset aktif saat ini
          </span>
        </div>

        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Akumulasi Penyusutan
          </span>
          <p className="text-base sm:text-lg font-black text-amber-400 font-mono">
            -{formatIDR(totalAccumulatedDepreciation)}
          </p>
          <span className="text-[10px] text-stone-500 block">
            Total depresiasi berjalan
          </span>
        </div>

        <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">
            Penyusutan Bulanan (Depr./Bln)
          </span>
          <p className="text-base sm:text-lg font-black text-rose-400 font-mono">
            {formatIDR(totalMonthlyDepreciation)}
          </p>
          <span className="text-[10px] text-stone-500 block">
            Beban non-kas per bulan
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'list'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Daftar Aset Tetap ({assets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('buy')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'buy'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Form Pembelian Aset Baru (Belanja Modal)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('depreciation')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'depreciation'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Jadwal Penyusutan & Nilai Residu
        </button>
      </div>

      {/* TAB 1: ASSETS LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#232529] p-3 rounded-2xl border border-stone-800 text-xs">
            <div className="flex items-center gap-2 flex-1">
              <Search size={14} className="text-stone-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari aset (nama, kode, vendor, lokasi)..."
                className="bg-[#1a1b1e] border border-stone-700 text-stone-200 rounded-xl px-3 py-1.5 w-full max-w-xs focus:outline-none focus:border-[#b6d333]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-stone-400 text-[11px]">Kategori:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-[#1a1b1e] border border-stone-700 text-stone-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#b6d333]"
              >
                <option value="all">Semua Kategori ({assets.length})</option>
                {Object.entries(CATEGORY_LABELS).map(([catKey, info]) => (
                  <option key={catKey} value={catKey}>
                    {info.icon} {info.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards or Table */}
          {filteredAssets.length === 0 ? (
            <div className="p-8 bg-[#232529] border border-stone-800 rounded-2xl text-center space-y-3">
              <Cpu size={36} className="text-stone-600 mx-auto" />
              <h4 className="text-xs font-bold text-white">Belum Ada Aset Tercatat</h4>
              <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                Daftarkan mesin kopi espresso, kulkas chiller, grinder, atau tablet POS Anda untuk mengaktifkan perhitungan nilai buku dan penyusutan aset.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('buy')}
                className="mt-2 px-4 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Beli / Input Aset Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssets.map((asset) => {
                const catInfo = CATEGORY_LABELS[asset.category] || {
                  label: asset.category,
                  icon: '📦',
                };
                return (
                  <div
                    key={asset.id}
                    className="p-4 bg-[#232529] border border-stone-800 hover:border-stone-700 rounded-2xl space-y-3 transition-colors text-xs"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-stone-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl p-1 bg-[#1a1b1e] rounded-xl border border-stone-800">
                          {catInfo.icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {asset.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] bg-stone-900 text-[#b6d333] border border-[#b6d333]/30 px-1.5 py-0.2 rounded font-mono font-bold">
                              {asset.code}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {catInfo.label} • Lokasi: {asset.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset)}
                        className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Aset"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Financial Values Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#1a1b1e] rounded-xl text-[11px]">
                      <div>
                        <span className="text-stone-500 block text-[10px]">Harga Beli</span>
                        <strong className="text-white font-mono">
                          {formatIDR(asset.purchaseCost)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px]">Penyusutan</span>
                        <strong className="text-amber-400 font-mono">
                          -{formatIDR(asset.accumulatedDepreciation)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px]">Nilai Buku</span>
                        <strong className="text-[#b6d333] font-mono">
                          {formatIDR(asset.currentBookValue)}
                        </strong>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-400 pt-1">
                      <div className="flex items-center gap-2">
                        <span>
                          Beli:{' '}
                          <strong className="text-stone-300">
                            {new Date(asset.purchaseDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </strong>
                        </span>
                        {asset.supplierName && (
                          <span>• Vendor: {asset.supplierName}</span>
                        )}
                      </div>

                      {/* Condition Badge / Selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-stone-500">Kondisi:</span>
                        <select
                          value={asset.condition}
                          onChange={(e) =>
                            handleUpdateCondition(asset, e.target.value as AssetCondition)
                          }
                          className={`text-[10px] font-bold rounded-lg px-2 py-0.5 border cursor-pointer ${
                            asset.condition === 'prima'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : asset.condition === 'butuh_servis'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          <option value="prima">Prima (Bagus)</option>
                          <option value="butuh_servis">Butuh Servis</option>
                          <option value="rusak">Rusak</option>
                          <option value="dijual">Dijual</option>
                          <option value="dihapus">Dihapus</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BUY NEW ASSET FORM */}
      {activeTab === 'buy' && (
        <div className="max-w-3xl space-y-5">
          {/* Quick Presets / Templates */}
          <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#b6d333]" />
              <span>Template Cepat Belanja Aset Kedai Minuman (Klik untuk Mengisi):</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CAFE_ASSET_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="px-2.5 py-1 bg-[#1a1b1e] hover:bg-stone-800 border border-stone-700/80 rounded-xl text-[11px] text-stone-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>{CATEGORY_LABELS[tpl.category]?.icon}</span>
                  <span>{tpl.name}</span>
                  <span className="text-[#b6d333] font-mono font-bold">
                    ({formatIDR(tpl.cost)})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleCreateAsset}
            className="p-5 bg-[#232529] border border-stone-800 rounded-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-[#b6d333]" />
                <span>Formulir Pembelian Aset Tetap Baru (Capex)</span>
              </h2>
              <span className="text-[10px] text-stone-400">
                Otomatis tercatat di Laporan Keuangan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Kode Aset</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="AST-01"
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-stone-300 font-bold block mb-1">Nama Aset / Peralatan *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Mesin Espresso 2-Group Simonelli"
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Kategori Aset</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AssetCategory)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                >
                  {Object.entries(CATEGORY_LABELS).map(([catKey, info]) => (
                    <option key={catKey} value={catKey}>
                      {info.icon} {info.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Harga Pembelian (Rp) *
                </label>
                <input
                  type="number"
                  min="1000"
                  required
                  value={purchaseCost || ''}
                  onChange={(e) => setPurchaseCost(Number(e.target.value) || 0)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Tanggal Pembelian</label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Vendor / Pemasok
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="PT Roastery Nusantara / Toko Mesin"
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Masa Manfaat (Bulan)
                </label>
                <input
                  type="number"
                  min="6"
                  max="120"
                  value={usefulLifeMonths}
                  onChange={(e) => setUsefulLifeMonths(Number(e.target.value) || 36)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono focus:outline-none focus:border-[#b6d333]"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Misal: 36 bln (3 thn) atau 48 bln (4 thn)
                </span>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Nilai Sisa / Residu (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={salvageValue || ''}
                  onChange={(e) => setSalvageValue(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono focus:outline-none focus:border-[#b6d333]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Lokasi Penempatan</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Bar Utama, Kitchen, Kasir..."
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai / Kas Laci</option>
                  <option value="qris">QRIS</option>
                  <option value="ewallet">E-Wallet</option>
                </select>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Kondisi Awal</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AssetCondition)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                >
                  <option value="prima">Prima (Baru / Normal)</option>
                  <option value="butuh_servis">Butuh Servis Ringan</option>
                  <option value="rusak">Rusak</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-stone-300 font-bold block mb-1">
                Nomor Seri / Catatan Spesifikasi (Opsional)
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Contoh: S/N: LM-2026-89912, Garansi 1 tahun resmi"
                className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-[#b6d333]/20"
            >
              {isSubmitting
                ? 'Menyimpan & Membukukan ke Laporan Keuangan...'
                : `Posting Pembelian Aset (${formatIDR(purchaseCost)}) & Masukkan ke Keuangan`}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: DEPRECIATION SCHEDULE */}
      {activeTab === 'depreciation' && (
        <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Simulasi Penyusutan Garis Lurus (Straight-Line)</h3>
              <p className="text-[11px] text-stone-400">
                Penyusutan dihitung otomatis setiap bulan: (Harga Perolehan - Nilai Residu) / Masa Manfaat Bulan.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-3">Kode & Aset</th>
                  <th className="p-3">Tgl Beli</th>
                  <th className="p-3 text-right">Harga Beli</th>
                  <th className="p-3 text-center">Masa Manfaat</th>
                  <th className="p-3 text-right">Beban Depr./Bulan</th>
                  <th className="p-3 text-right">Akumulasi Depr.</th>
                  <th className="p-3 text-right">Nilai Buku Terkini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-stone-800/40">
                    <td className="p-3">
                      <div className="font-bold text-white">{asset.name}</div>
                      <span className="text-[10px] text-stone-500 font-mono">{asset.code}</span>
                    </td>
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
                    <td className="p-3 text-center font-mono">
                      {asset.usefulLifeMonths} bln ({Math.round(asset.usefulLifeMonths / 12)} thn)
                    </td>
                    <td className="p-3 text-right font-mono text-rose-400 font-semibold">
                      {formatIDR(asset.monthlyDepreciation)}/bln
                    </td>
                    <td className="p-3 text-right font-mono text-amber-400">
                      -{formatIDR(asset.accumulatedDepreciation)}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-[#b6d333]">
                      {formatIDR(asset.currentBookValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
