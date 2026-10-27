import React, { useState, useEffect } from 'react';
import { db, resetAllDataToCleanSlate } from '../../lib/storage';
import { BusinessSettings, UserProfile } from '../../types';
import { DEMO_USERS } from '../../lib/storage';
import {
  bluetoothPrinterService,
  BluetoothPrinterStatus,
} from '../../services/bluetoothPrinterService';
import {
  Settings,
  Printer,
  User,
  CheckCircle2,
  Shield,
  Bluetooth,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Crown,
  Users,
  Database,
  ArrowRight,
} from 'lucide-react';

interface SettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onNavigate?: (section: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onSelectUser,
  onNavigate,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>({ ...settings });
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [btStatus, setBtStatus] = useState<BluetoothPrinterStatus>(
    bluetoothPrinterService.getStatus()
  );
  const [btMessage, setBtMessage] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    const unsub = bluetoothPrinterService.subscribe((s) => {
      setBtStatus(s);
    });
    return () => unsub();
  }, []);

  const handleConnectBt = async () => {
    setBtMessage(null);
    const res = await bluetoothPrinterService.connect();
    if (res.success) {
      setBtMessage('Printer bluetooth berhasil tersambung!');
    } else {
      setBtMessage(res.error || 'Gagal menyambung printer.');
    }
  };

  const handleTestPrintBt = async () => {
    setBtMessage(null);
    const res = await bluetoothPrinterService.testPrint(formData.receiptPaperWidth);
    if (res.success) {
      setBtMessage('Struk uji ESC/POS berhasil dikirim ke printer bluetooth!');
    } else {
      setBtMessage(res.error || 'Gagal mengirim cetak.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.settings.put({ ...formData, id: 'global-settings' });
    onUpdateSettings(formData);
    setSavedMsg('Pengaturan toko berhasil diperbarui!');
    setTimeout(() => setSavedMsg(null), 3000);
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      await resetAllDataToCleanSlate();
      setIsResetConfirmOpen(false);
      setSavedMsg('Semua data berhasil dibersihkan! Database siap untuk input manual.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Settings size={24} className="text-[#b6d333]" />
          <span>Pengaturan Toko & Manajemen Data</span>
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Konfigurasi identitas kedai Caozy, ukuran kertas struk kasir, pajak restoran, dan pengaturan database.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* User Management & Access Roles Card */}
      <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Users size={16} className="text-[#b6d333]" />
            <span>Pengguna & Hak Akses Tim</span>
          </h2>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('users')}
              className="text-xs font-bold text-[#b6d333] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Kelola Tim & Role</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
        <p className="text-xs text-stone-400">
          Konfigurasi akun staf, pilih template role (Owner, Manajer, Kasir, Gudang, Keuangan), atau sesuaikan izin granular dengan custom akses.
        </p>
        <div className="flex items-center justify-between p-3 rounded-xl border border-stone-700/80 bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{currentUser.avatar || '👑'}</span>
            <div>
              <span className="text-xs font-bold text-white block">{currentUser.name}</span>
              <span className="text-[11px] text-stone-400">{currentUser.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-[#b6d333]/20 text-[#b6d333] font-black px-2 py-0.5 rounded border border-[#b6d333]/30 uppercase">
              {currentUser.role}
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('users')}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg border border-stone-700 cursor-pointer transition-colors"
              >
                Atur Pengguna
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Raw Database Inspector & Backup Card */}
      <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Database size={16} className="text-[#b6d333]" />
            <span>Raw Database Inspector & Ekspor</span>
          </h2>
          <span className="text-[10px] bg-stone-800 text-stone-400 font-bold px-2 py-0.5 rounded border border-stone-700">
            Owner & Admin
          </span>
        </div>
        <p className="text-xs text-stone-400 leading-relaxed">
          Inspeksi langsung 15 tabel Dexie IndexedDB (products, costLayers, recipes, sales, assets, expenses, auditLogs), filter JSON real-time, salin baris ke clipboard, dan unduh backup lengkap format JSON.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('raw-db')}
              className="px-3.5 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#b6d333]/15 transition-all"
            >
              <Database size={14} />
              <span>Buka Raw Database Viewer ↗</span>
            </button>
          )}
        </div>
      </div>

      {/* Bluetooth Printer Hardware Card */}
      <div className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Bluetooth size={16} className="text-[#b6d333]" />
            <span>Koneksi Printer Bluetooth Thermal (ESC/POS)</span>
          </h2>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              btStatus.isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-stone-800 text-stone-400 border-stone-700'
            }`}
          >
            {btStatus.isConnected ? btStatus.deviceName || 'TERHUBUNG' : 'TERPUTUS'}
          </span>
        </div>

        {btMessage && (
          <div className="p-2.5 bg-stone-800/80 border border-stone-700 rounded-xl text-stone-200 text-xs">
            {btMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!btStatus.isConnected ? (
            <button
              type="button"
              onClick={handleConnectBt}
              className="px-3.5 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#b6d333]/15"
            >
              <Bluetooth size={15} />
              <span>Hubungkan Printer Bluetooth</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleTestPrintBt}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-[#b6d333] border border-[#b6d333]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} />
                <span>Uji Cetak ESC/POS</span>
              </button>
              <button
                type="button"
                onClick={() => bluetoothPrinterService.disconnect()}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-xl text-xs font-medium cursor-pointer"
              >
                Putuskan Sambungan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Business Details Form */}
      <form onSubmit={handleSubmit} className="p-5 bg-[#232529] border border-stone-800 rounded-2xl space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 pb-2 border-b border-stone-800">
          <Settings size={15} className="text-[#b6d333]" />
          <span>Informasi Bisnis & Cetak Struk</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Brand Icon Customization */}
          <div className="sm:col-span-2">
            <label className="text-stone-300 font-bold block mb-1.5">
              Ikon / Logo Brand Outlet (Owner & Admin)
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-[#1a1b1e] border border-stone-800 rounded-xl">
              {['🌿', '☕', '🍵', '🧋', '👑', '🥤', '🥑', '✨', '🍩', '🍋'].map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setFormData({ ...formData, storeIcon: ic })}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
                    formData.storeIcon === ic
                      ? 'bg-[#b6d333] text-stone-950 scale-110 shadow-md font-bold'
                      : 'hover:bg-stone-800 text-white'
                  }`}
                >
                  {ic}
                </button>
              ))}
              <span className="text-[11px] text-stone-400 ml-2">
                Ikon aktif: <strong className="text-[#b6d333] text-sm ml-1">{formData.storeIcon || '🌿'}</strong>
              </span>
            </div>
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1">Nama Usaha / Kedai</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
            />
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1">Tagline</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-stone-300 font-bold block mb-1">Alamat Outlet</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
            />
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1">Nomor Telepon / WhatsApp</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
            />
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1">Lebar Kertas Struk Thermal</label>
            <select
              value={formData.receiptPaperWidth}
              onChange={(e: any) =>
                setFormData({ ...formData, receiptPaperWidth: e.target.value })
              }
              className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
            >
              <option value="58mm">58mm (Printer Portabel Kasir Standard)</option>
              <option value="80mm">80mm (Printer Desktop Kasir Lebar)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-stone-300 font-bold block">
                Pajak Restoran PB1 di Kasir POS (%)
              </label>
              <span className="text-[10px] text-[#b6d333] font-bold">Default 10%</span>
            </div>
            <input
              type="number"
              min="0"
              max="20"
              value={formData.taxRatePercent}
              onChange={(e) =>
                setFormData({ ...formData, taxRatePercent: Number(e.target.value) })
              }
              className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Harga menu minuman belum termasuk pajak. Ketika checkout di kasir POS, sistem akan menambahkan pajak {formData.taxRatePercent}% ke total pesanan.
            </p>
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1">Header Cetak Struk</label>
            <textarea
              rows={2}
              value={formData.receiptHeader}
              onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
              className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#b6d333]"
            />
          </div>

          <div>
            <label className="text-stone-300 font-bold block mb-1">Footer / Ucapan Struk</label>
            <textarea
              rows={2}
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#b6d333]"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-800 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black rounded-xl text-xs shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer"
          >
            Simpan Pengaturan
          </button>
        </div>
      </form>

      {/* Danger Zone / Clean Slate Reset */}
      <div className="p-5 bg-red-950/20 border border-red-900/50 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-red-300">
            Zona Bahaya: Bersihkan & Kosongkan Database
          </h2>
        </div>
        <p className="text-xs text-stone-400 leading-relaxed">
          Gunakan fitur ini jika Anda ingin menghapus seluruh data produk, stok bahan, dan transaksi untuk memulai input data secara manual dari awal.
        </p>
        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="px-4 py-2 bg-red-900/40 hover:bg-red-900/80 border border-red-800/80 text-red-300 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
          <span>Hapus Semua Data & Mulai Manual</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#232529] border border-red-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-950/80 border border-red-800 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-white">Konfirmasi Pembersihan Data</h3>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Tindakan ini akan menghapus semua menu produk, bahan baku, batch FIFO, resep, dan transaksi. Database akan kembali bersih dan siap untuk Anda isi secara manual.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleExecuteReset}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-colors cursor-pointer"
              >
                {isResetting ? 'Membersihkan...' : 'Ya, Bersihkan Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
