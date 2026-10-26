import React, { useState } from 'react';
import { PaymentMethod } from '../../types';
import { formatIDR, calculateChange } from '../../lib/currency';
import { X, Banknote, QrCode, Building, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  subtotal?: number;
  discount?: number;
  onConfirmPayment: (
    method: PaymentMethod,
    amountPaid: number,
    change: number,
    ref?: string,
    notes?: string
  ) => Promise<void>;
  isProcessing: boolean;
  errorMessage?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  subtotal,
  discount,
  onConfirmPayment,
  isProcessing,
  errorMessage,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<number>(grandTotal);
  const [externalRef, setExternalRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [manualVerified, setManualVerified] = useState<boolean>(false);

  if (!isOpen) return null;

  const { change, isSufficient } = calculateChange(
    selectedMethod === 'cash' ? cashGiven : grandTotal,
    grandTotal
  );

  const quickCashOptions = [
    grandTotal,
    Math.ceil(grandTotal / 10000) * 10000,
    50000,
    100000,
  ].filter((v, i, a) => v >= grandTotal && a.indexOf(v) === i);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMethod === 'cash' && !isSufficient) return;
    if (selectedMethod !== 'cash' && !manualVerified) return;

    await onConfirmPayment(
      selectedMethod,
      selectedMethod === 'cash' ? cashGiven : grandTotal,
      selectedMethod === 'cash' ? change : 0,
      externalRef.trim() || undefined,
      notes.trim() || undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div>
            <h2 className="text-base font-bold text-white">Konfirmasi Pembayaran Manual</h2>
            <div className="flex items-center gap-2 flex-wrap text-xs text-stone-400 mt-0.5">
              <span>Total Tagihan: <strong className="text-amber-400 text-sm font-black">{formatIDR(grandTotal)}</strong></span>
              {discount && discount > 0 && (
                <span className="text-[11px] bg-amber-500/10 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/20">
                  Diskon: -{formatIDR(discount)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-stone-400 hover:text-white rounded-full bg-stone-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('cash');
                  setCashGiven(grandTotal);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedMethod === 'cash'
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Banknote size={20} className={selectedMethod === 'cash' ? 'text-amber-400' : ''} />
                <span className="text-xs font-bold">Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('qris');
                  setManualVerified(false);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedMethod === 'qris'
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:border-stone-700'
                }`}
              >
                <QrCode size={20} className={selectedMethod === 'qris' ? 'text-amber-400' : ''} />
                <span className="text-xs font-bold">QRIS Statis</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('transfer');
                  setManualVerified(false);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedMethod === 'transfer'
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Building size={20} className={selectedMethod === 'transfer' ? 'text-amber-400' : ''} />
                <span className="text-xs font-bold">Transfer Bank</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('ewallet');
                  setManualVerified(false);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedMethod === 'ewallet'
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Wallet size={20} className={selectedMethod === 'ewallet' ? 'text-amber-400' : ''} />
                <span className="text-xs font-bold">E-Wallet</span>
              </button>
            </div>
          </div>

          {/* CASH Workflow */}
          {selectedMethod === 'cash' && (
            <div className="space-y-3 bg-stone-800/40 p-3.5 rounded-2xl border border-stone-800">
              <label className="text-xs font-bold text-stone-300 block">
                Uang Diterima dari Pelanggan
              </label>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2">
                {quickCashOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setCashGiven(amount)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      cashGiven === amount
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {amount === grandTotal ? 'Uang Pas' : formatIDR(amount)}
                  </button>
                ))}
              </div>

              {/* Custom Cash Input */}
              <div className="relative mt-2">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-500">Rp</span>
                <input
                  type="number"
                  value={cashGiven || ''}
                  onChange={(e) => setCashGiven(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Kembalian / Change calculation */}
              <div className="p-3 bg-stone-900/90 rounded-xl border border-stone-700/80 flex items-center justify-between">
                <span className="text-xs text-stone-400 font-medium">Uang Kembalian:</span>
                <span
                  className={`text-base font-black ${
                    isSufficient ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {isSufficient ? formatIDR(change) : 'Uang Kurang!'}
                </span>
              </div>
            </div>
          )}

          {/* NON-CASH (QRIS, TRANSFER, E-WALLET) Workflow */}
          {selectedMethod !== 'cash' && (
            <div className="space-y-3 bg-stone-800/40 p-3.5 rounded-2xl border border-stone-800">
              <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-700/60 text-xs space-y-1.5">
                <div className="font-bold text-stone-200">
                  {selectedMethod === 'qris' && 'Instruksi QRIS Caozy:'}
                  {selectedMethod === 'transfer' && 'Rekening Bank Caozy:'}
                  {selectedMethod === 'ewallet' && 'Akun Merchant E-Wallet:'}
                </div>
                <p className="text-stone-400">
                  {selectedMethod === 'qris' && 'Arahkan pelanggan scan stiker QRIS di meja kasir.'}
                  {selectedMethod === 'transfer' && 'BCA: 882-019-4820 a/n PT CAOZY MINUMAN INDONESIA'}
                  {selectedMethod === 'ewallet' && 'GoPay / OVO / ShopeePay Merchant ID: CAOZY-JAKSEL'}
                </p>
              </div>

              {/* External Reference Input */}
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Nomor Referensi / ID Transaksi (Opsional)
                </label>
                <input
                  type="text"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder="Contoh: BCA-99482 atau RRN QRIS..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Explicit Manual Verification Checkbox */}
              <label className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualVerified}
                  onChange={(e) => setManualVerified(e.target.checked)}
                  className="mt-0.5 accent-amber-500 w-4 h-4 rounded"
                />
                <span className="text-xs text-stone-300 leading-snug">
                  <strong className="text-amber-400 block font-bold">Verifikasi Manual Kasir:</strong>
                  Saya telah memeriksa notifikasi rekening / bukti mutasi di perangkat dan memastikan dana telah masuk.
                </span>
              </label>
            </div>
          )}

          {/* General Notes */}
          <div>
            <label className="text-xs text-stone-400 block mb-1">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pelanggan minta nota cap..."
              className="w-full bg-stone-800/80 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isProcessing ||
                (selectedMethod === 'cash' && !isSufficient) ||
                (selectedMethod !== 'cash' && !manualVerified)
              }
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <CheckCircle2 size={18} />
              <span>
                {isProcessing
                  ? 'Memproses FIFO & Pembayaran...'
                  : 'Konfirmasi Pembayaran & Selesaikan'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
