import React, { useState } from 'react';
import { Sale, BusinessSettings } from '../../types';
import { ThermalReceipt } from '../shared/ThermalReceipt';
import { usePrinter } from '../../hooks/usePrinter';
import { Printer, Check, X, Bluetooth, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: BusinessSettings;
  isReprint?: boolean;
  onOpenBluetoothModal?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings,
  isReprint = false,
  onOpenBluetoothModal,
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(
    settings.receiptPaperWidth || '58mm'
  );
  const [printFeedback, setPrintFeedback] = useState<{ success: boolean; message: string } | null>(
    null
  );

  const {
    isConnected,
    isPrinting,
    deviceName,
    printReceipt,
    scanAndConnect,
  } = usePrinter();

  if (!isOpen || !sale) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleBluetoothPrint = async () => {
    setPrintFeedback(null);
    if (!isConnected) {
      if (onOpenBluetoothModal) {
        onOpenBluetoothModal();
      } else {
        const connectRes = await scanAndConnect();
        if (!connectRes.success) {
          setPrintFeedback({
            success: false,
            message: connectRes.error || 'Printer bluetooth belum terhubung.',
          });
          return;
        }
      }
      return;
    }

    const res = await printReceipt(sale, settings, paperWidth, isReprint);

    if (res.success) {
      setPrintFeedback({
        success: true,
        message: 'Struk berhasil dikirim ke printer bluetooth!',
      });
      setTimeout(() => setPrintFeedback(null), 3000);
    } else {
      setPrintFeedback({
        success: false,
        message: res.error || 'Gagal mencetak ke printer bluetooth.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-stone-900 border border-stone-800 rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Printer size={16} className="text-amber-400" />
              <span>{isReprint ? 'Cetak Ulang Struk (Reprint)' : 'Struk Transaksi POS'}</span>
            </h2>
            <p className="text-[11px] text-stone-400">{sale.transactionNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Paper Size & Bluetooth Status Bar */}
        <div className="px-4 py-2 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-medium">Kertas:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  paperWidth === '58mm'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  paperWidth === '80mm'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                80 mm
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenBluetoothModal}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              isConnected
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-amber-400'
            }`}
          >
            <Bluetooth size={12} />
            <span>{isConnected ? (deviceName || 'BT: OK') : 'Sambung BT'}</span>
          </button>
        </div>

        {/* Print Feedback Alert */}
        {printFeedback && (
          <div
            className={`mx-4 mt-3 p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
              printFeedback.success
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-red-950/70 border-red-800 text-red-300'
            }`}
          >
            {printFeedback.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{printFeedback.message}</span>
          </div>
        )}

        {/* Thermal Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-950/40 flex justify-center items-start">
          <ThermalReceipt
            sale={sale}
            settings={settings}
            paperWidth={paperWidth}
            isReprint={isReprint}
          />
        </div>

        {/* Actions */}
        <div className="p-3.5 border-t border-stone-800 bg-stone-900 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Direct Bluetooth Print button */}
            <button
              type="button"
              onClick={handleBluetoothPrint}
              disabled={isPrinting}
              className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-[0.99] transition-transform text-xs cursor-pointer"
            >
              {isPrinting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Mencetak...</span>
                </>
              ) : (
                <>
                  <Bluetooth size={15} />
                  <span>Cetak Bluetooth</span>
                </>
              )}
            </button>

            {/* Standard Browser Print Fallback */}
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-[0.99] transition-transform text-xs cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak Browser (OS)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer"
          >
            <Check size={15} />
            <span>Selesai / Pesanan Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
