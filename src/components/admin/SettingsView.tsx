import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { BusinessSettings, UserProfile } from '../../types';
import { DEMO_USERS } from '../../lib/storage';
import {
  bluetoothPrinterService,
  BluetoothPrinterStatus,
} from '../../services/bluetoothPrinterService';
import { Settings, Printer, User, CheckCircle2, Shield, Bluetooth, Sparkles } from 'lucide-react';

interface SettingsViewProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onSelectUser,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>({ ...settings });
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [btStatus, setBtStatus] = useState<BluetoothPrinterStatus>(
    bluetoothPrinterService.getStatus()
  );
  const [btMessage, setBtMessage] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Settings size={22} className="text-amber-400" />
          <span>Pengaturan Toko & Printer Thermal</span>
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Konfigurasi identitas kedai Caozy, ukuran kertas struk kasir, pajak restoran, dan ganti akun pengujian.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Role / User Switcher Card */}
      <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <User size={15} className="text-amber-400" />
            <span>Pilih Akun & Hak Akses (Role Testing)</span>
          </h2>
          <span className="text-[11px] text-amber-400 font-semibold">
            Aktif: {currentUser.name} ({currentUser.role})
          </span>
        </div>
        <p className="text-xs text-stone-400">
          Uji coba pembagian wewenang peran (RBAC). Kasir hanya dapat mengakses POS, sedangkan Staf Gudang & Keuangan memiliki izin khusus.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {DEMO_USERS.map((u) => {
            const isSelected = u.id === currentUser.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectUser(u)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-stone-800 bg-stone-800/40 text-stone-300 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{u.avatar}</span>
                  <span className="text-xs font-bold leading-tight truncate">{u.name}</span>
                </div>
                <span className="text-[10px] text-amber-400/90 font-mono uppercase mt-2">
                  {u.role}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bluetooth Printer Hardware Card */}
      <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Bluetooth size={16} className="text-amber-400" />
            <span>Koneksi Printer Bluetooth Thermal (ESC/POS)</span>
          </h2>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              btStatus.isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-stone-800 text-stone-500 border-stone-700'
            }`}
          >
            {btStatus.isConnected ? (btStatus.deviceName || 'TERHUBUNG') : 'TERPUTUS'}
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
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/15"
            >
              <Bluetooth size={15} />
              <span>Hubungkan Printer Bluetooth</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestPrintBt}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} />
                <span>Tes Cetak ESC/POS</span>
              </button>
              <button
                type="button"
                onClick={() => bluetoothPrinterService.disconnect()}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-red-400 font-bold rounded-xl text-xs cursor-pointer"
              >
                Putuskan
              </button>
            </div>
          )}

          <label className="flex items-center gap-2 ml-auto text-xs text-stone-400 cursor-pointer bg-stone-800/50 px-3 py-2 rounded-xl border border-stone-800">
            <input
              type="checkbox"
              checked={btStatus.isSimulated}
              onChange={(e) => bluetoothPrinterService.toggleSimulation(e.target.checked)}
              className="accent-amber-500 rounded"
            />
            <span className="text-[11px] font-medium">Mode Simulasi Virtual</span>
          </label>
        </div>
      </div>

      {/* Form Settings */}
      <form onSubmit={handleSubmit} className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 pb-2 border-b border-stone-800">
          <Printer size={15} className="text-amber-400" />
          <span>Pengaturan Struk Thermal & Toko</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-stone-300 font-bold block mb-1">Nama Usaha Minuman</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5"
              required
            />
          </div>
          <div>
            <label className="text-stone-300 font-bold block mb-1">Nomor Telepon Toko</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5"
            />
          </div>
        </div>

        <div>
          <label className="text-stone-300 font-bold block mb-1">Alamat Toko</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-stone-300 font-bold block mb-1">Ukuran Kertas Default Printer</label>
            <div className="flex gap-2">
              {(['58mm', '80mm'] as const).map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => setFormData({ ...formData, receiptPaperWidth: width })}
                  className={`flex-1 p-2 rounded-xl border text-center font-bold transition-all ${
                    formData.receiptPaperWidth === width
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-stone-800 bg-stone-800/40 text-stone-400'
                  }`}
                >
                  {width}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-stone-300 font-bold block mb-1">Pajak Restoran PB1 (%)</label>
            <input
              type="number"
              min="0"
              max="20"
              value={formData.taxRatePercent}
              onChange={(e) => setFormData({ ...formData, taxRatePercent: Number(e.target.value) })}
              className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5 font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="text-stone-300 font-bold block mb-1">Pesan Footer Struk</label>
          <textarea
            rows={3}
            value={formData.receiptFooter}
            onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
            className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold py-3 rounded-xl transition-colors cursor-pointer"
        >
          Simpan Perubahan Pengaturan
        </button>
      </form>
    </div>
  );
};
