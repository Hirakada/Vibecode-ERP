import React, { useState } from 'react';
import { usePrinter } from '../../hooks/usePrinter';
import {
  Bluetooth,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Power,
  Sparkles,
} from 'lucide-react';

interface BluetoothPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperWidth?: '58mm' | '80mm';
}

export const BluetoothPrinterModal: React.FC<BluetoothPrinterModalProps> = ({
  isOpen,
  onClose,
  paperWidth = '58mm',
}) => {
  const {
    isConnected,
    isConnecting,
    isPrinting,
    deviceName,
    isSimulated,
    scanAndConnect,
    disconnect,
    testPrint,
    toggleSimulation,
  } = usePrinter();

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleConnect = async () => {
    setTestResult(null);
    const res = await scanAndConnect();
    if (res.success) {
      setTestResult({
        success: true,
        message: 'Printer bluetooth berhasil tersambung!',
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Gagal menyambungkan perangkat',
      });
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setTestResult({ success: true, message: 'Printer bluetooth diputuskan.' });
  };

  const handleTestPrint = async () => {
    setTestResult(null);
    const res = await testPrint(paperWidth);
    if (res.success) {
      setTestResult({
        success: true,
        message: 'Struk uji diagnostik berhasil dikirim ke printer bluetooth!',
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Gagal mencetak struk uji.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              <Bluetooth size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Printer Thermal Bluetooth</h2>
              <p className="text-[11px] text-stone-400">Koneksi ESC/POS nirkabel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Status Box */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-stone-800/40 border-stone-800 text-stone-300'
            }`}
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Status Koneksi:
              </span>
              <span className="font-extrabold text-sm block mt-0.5">
                {isConnected ? 'TERHUBUNG (SIAP CETAK)' : 'BELUM TERHUBUNG'}
              </span>
              {deviceName && (
                <span className="text-[11px] text-amber-400 font-mono font-bold mt-0.5 block">
                  Perangkat: {deviceName}
                </span>
              )}
            </div>
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'
              }`}
            />
          </div>

          {/* Feedback message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/60 border-red-800 text-red-300'
              }`}
            >
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isConnected ? (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Mencari & Menyambungkan...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth size={16} />
                    <span>Pindai & Hubungkan Printer Bluetooth</span>
                  </>
                )}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isPrinting}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={15} />
                  <span>{isPrinting ? 'Mencetak...' : 'Tes Cetak Struk'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="bg-stone-800 hover:bg-stone-700 text-red-400 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Power size={15} />
                  <span>Putuskan</span>
                </button>
              </div>
            )}
          </div>

          {/* Virtual Printer Simulation Toggle */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-200 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span>Simulasi Printer Bluetooth Virtual</span>
              </span>
              <input
                type="checkbox"
                checked={isSimulated}
                onChange={(e) => toggleSimulation(e.target.checked)}
                className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Aktifkan opsi ini jika menguji di laptop/browser tanpa perangkat fisik printer bluetooth. Memungkinkan uji coba pengiriman ESC/POS struk lengkap tanpa error.
            </p>
          </div>

          {/* Device Compatibility Guide */}
          <div className="p-3 bg-stone-800/30 rounded-2xl border border-stone-800 text-[11px] space-y-1 text-stone-400">
            <strong className="text-stone-300 block">Panduan Printer Kompatibel:</strong>
            <p>
              Mendukung semua printer thermal nirkabel ESC/POS standar:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-stone-400">
              <li>Panda PRJ-58B / PRJ-80B</li>
              <li>Eppos EP-58 / EP-80</li>
              <li>RPP02N, PT-210, MPT-II, Iware MP-58</li>
              <li>Mini POS Bluetooth 58mm / 80mm</li>
            </ul>
            <p className="text-[10px] text-stone-500 pt-1">
              *Pastikan Bluetooth di HP/komputer Anda aktif dan printer dalam posisi ON saat melakukan pemindaian.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
