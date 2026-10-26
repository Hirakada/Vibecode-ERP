import React, { useState } from 'react';
import { SyncStatusSummary, syncService } from '../../services/syncService';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  Radio,
  ArrowUpDown,
} from 'lucide-react';

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatusSummary;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ syncStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Determine label, styling, and icon based on connection and sync state
  const isOffline = !syncStatus.isOnline;
  const isSyncing = syncStatus.isSyncing;

  let labelText = 'Online';
  let badgeClasses = 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400 hover:bg-emerald-900/50';
  let iconNode = <Wifi size={13} className="shrink-0 text-emerald-400" />;
  let dotNode = <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />;

  if (isOffline) {
    labelText = 'Offline';
    badgeClasses = 'bg-rose-950/70 border-rose-800 text-rose-300 hover:bg-rose-900/60 shadow-xs shadow-rose-950';
    iconNode = <WifiOff size={13} className="shrink-0 text-rose-400" />;
    dotNode = <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />;
  } else if (isSyncing) {
    labelText = 'Syncing...';
    badgeClasses = 'bg-amber-950/70 border-amber-700/80 text-amber-300 hover:bg-amber-900/60 shadow-xs shadow-amber-950';
    iconNode = <RefreshCw size={13} className="shrink-0 text-amber-400 animate-spin" />;
    dotNode = <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />;
  } else if (syncStatus.pendingCount > 0) {
    labelText = `Sync (${syncStatus.pendingCount})`;
    badgeClasses = 'bg-amber-950/50 border-amber-800 text-amber-300 hover:bg-amber-900/50';
    iconNode = <RefreshCw size={13} className="shrink-0 text-amber-400" />;
    dotNode = <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />;
  }

  const handleManualSync = async () => {
    setActionMessage(null);
    if (!syncStatus.isOnline) {
      setActionMessage('Tidak dapat menyinkronkan saat offline. Aktifkan koneksi terlebih dahulu.');
      return;
    }
    const result = await syncService.triggerSync();
    if (result.success) {
      setActionMessage(`Sinkronisasi berhasil! ${result.syncedCount} transaksi terunggah.`);
    } else {
      setActionMessage(result.error || 'Gagal menyinkronkan data.');
    }
  };

  const handleToggleOnline = async () => {
    setActionMessage(null);
    const nextState = !syncStatus.isOnline;
    await syncService.setSimulatedOnline(nextState);
    setActionMessage(
      nextState
        ? 'Mode Online diaktifkan. Memulai sinkronisasi otomatis...'
        : 'Mode Offline diaktifkan. Transaksi kasir disimpan lokal.'
    );
  };

  return (
    <>
      {/* 1. Small Status Indicator Pill in POS Top Navigation */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Status koneksi: ${labelText}`}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${badgeClasses}`}
        title={`Status Koneksi: ${labelText} (Klik untuk detail sinkronisasi)`}
      >
        {iconNode}
        <span className="text-[11px] font-extrabold tracking-tight">{labelText}</span>
        {dotNode}
        {syncStatus.pendingCount > 0 && !isSyncing && (
          <span className="bg-amber-500 text-stone-950 px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight">
            {syncStatus.pendingCount}
          </span>
        )}
      </button>

      {/* 2. Detailed Offline-First & Sync Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isOffline
                      ? 'bg-rose-950/60 border-rose-800 text-rose-400'
                      : isSyncing
                      ? 'bg-amber-950/60 border-amber-800 text-amber-400'
                      : 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                  }`}
                >
                  <ArrowUpDown size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Status Koneksi & Sinkronisasi</h3>
                  <p className="text-[11px] text-stone-400">Arsitektur Offline-First Kasir POS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup status koneksi"
                className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current State Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-stone-950/60 rounded-2xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                  Koneksi Jaringan
                </span>
                <div className="flex items-center gap-1.5">
                  {syncStatus.isOnline ? (
                    <>
                      <Wifi size={14} className="text-emerald-400" />
                      <span className="text-xs font-black text-emerald-400">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={14} className="text-rose-400" />
                      <span className="text-xs font-black text-rose-400">Offline</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 bg-stone-950/60 rounded-2xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                  Status Sinkronisasi
                </span>
                <div className="flex items-center gap-1.5">
                  {isSyncing ? (
                    <>
                      <RefreshCw size={14} className="text-amber-400 animate-spin" />
                      <span className="text-xs font-black text-amber-400">Syncing...</span>
                    </>
                  ) : syncStatus.pendingCount > 0 ? (
                    <>
                      <AlertCircle size={14} className="text-amber-400" />
                      <span className="text-xs font-black text-amber-400">
                        {syncStatus.pendingCount} Pending
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-xs font-black text-emerald-400">Tersinkron</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Outbox & Storage Details */}
            <div className="p-3.5 bg-stone-950/70 border border-stone-800/80 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-300">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Database size={13} className="text-amber-400" />
                  Antrean Outbox (Offline)
                </span>
                <span className="font-bold text-white">
                  {syncStatus.pendingCount} transaksi
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-300">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Radio size={13} className="text-stone-400" />
                  Sinkronisasi Terakhir
                </span>
                <span className="font-medium text-stone-300 text-[11px]">
                  {syncStatus.lastSyncedAt
                    ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }) + ' WIB'
                    : 'Belum pernah'}
                </span>
              </div>
              {syncStatus.lastError && (
                <div className="text-[11px] text-rose-400 bg-rose-950/30 p-2 rounded-xl border border-rose-900/50">
                  {syncStatus.lastError}
                </div>
              )}
            </div>

            {/* Offline-First Information Banner */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Arsitektur Offline-First:</strong> Kasir tetap dapat menerima pesanan, menghitung HPP FIFO, dan mencetak struk thermal saat offline. Transaksi aman tersimpan di IndexedDB dan akan disinkronkan saat terhubung kembali.
            </div>

            {actionMessage && (
              <div className="text-xs font-medium text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/60 text-center animate-in fade-in">
                {actionMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={!syncStatus.isOnline || isSyncing}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleOnline}
                className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
              >
                {syncStatus.isOnline ? <WifiOff size={14} className="text-rose-400" /> : <Wifi size={14} className="text-emerald-400" />}
                <span>
                  {syncStatus.isOnline
                    ? 'Ubah ke Mode Simulasi Offline'
                    : 'Ubah ke Mode Simulasi Online'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
