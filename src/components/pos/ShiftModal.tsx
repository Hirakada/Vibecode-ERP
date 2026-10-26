import React, { useState } from 'react';
import { CashierShift } from '../../types';
import { formatIDR } from '../../lib/currency';
import { db } from '../../lib/storage';
import { X, Clock, Banknote, AlertTriangle, CheckCircle } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: CashierShift | null;
  onShiftClosed: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  shift,
  onShiftClosed,
}) => {
  const [actualCash, setActualCash] = useState<number>(shift?.expectedClosingCash || 0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !shift) return null;

  const expected = shift.expectedClosingCash;
  const variance = actualCash - expected;

  const handleCloseShift = async () => {
    setIsSubmitting(true);
    try {
      shift.actualClosingCash = actualCash;
      shift.variance = variance;
      shift.closedAt = new Date().toISOString();
      shift.status = 'closed';
      await db.shifts.put(shift);

      await db.auditLogs.add({
        id: `audit-shift-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: shift.cashierId,
        actorName: shift.cashierName,
        action: 'CLOSE_SHIFT',
        entity: 'shifts',
        entityId: shift.id,
        details: `Tutup shift kasir. Kas Diharapkan: ${formatIDR(expected)}, Kas Aktual: ${formatIDR(actualCash)}, Selisih: ${formatIDR(variance)}`,
      });

      onShiftClosed();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div>
            <h2 className="text-base font-bold text-white">Shift Kasir Aktif</h2>
            <p className="text-xs text-stone-400">Kasir: <span className="text-amber-400 font-semibold">{shift.cashierName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-stone-800/40 rounded-xl border border-stone-800">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" />
              <span>Waktu Buka Shift:</span>
            </span>
            <span className="font-semibold text-stone-200">
              {new Date(shift.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>

          <div className="space-y-2 bg-stone-800/30 p-3.5 rounded-2xl border border-stone-800">
            <div className="flex justify-between text-stone-400">
              <span>Modal Kas Awal:</span>
              <span className="font-semibold text-stone-200">{formatIDR(shift.openingCash)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Total Penjualan Tunai:</span>
              <span className="font-semibold text-emerald-400">+{formatIDR(shift.totalSalesCash)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Total Penjualan Non-Tunai:</span>
              <span className="font-semibold text-sky-400">{formatIDR(shift.totalSalesNonCash)}</span>
            </div>
            {shift.totalExpenses > 0 && (
              <div className="flex justify-between text-stone-400">
                <span>Pengeluaran Kas Kecil:</span>
                <span className="font-semibold text-red-400">-{formatIDR(shift.totalExpenses)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white pt-2 border-t border-stone-700/60">
              <span>Kas Diharapkan di Laci:</span>
              <span className="text-amber-400 text-sm font-extrabold">{formatIDR(expected)}</span>
            </div>
          </div>

          {/* Actual Cash Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-200 block">
              Hitung Fisik Uang di Laci (Kas Aktual)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-500">Rp</span>
              <input
                type="number"
                value={actualCash || ''}
                onChange={(e) => setActualCash(Number(e.target.value))}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Variance status */}
          <div className={`p-3 rounded-xl border flex items-center justify-between font-medium ${
            variance === 0
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : variance > 0
              ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
              : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}>
            <span className="flex items-center gap-1.5">
              {variance === 0 ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>Selisih Kas:</span>
            </span>
            <span className="font-bold text-sm">
              {variance === 0 ? 'Tepat (Pas)' : variance > 0 ? `Lebih +${formatIDR(variance)}` : `Kurang -${formatIDR(Math.abs(variance))}`}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/60 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 rounded-xl text-xs transition-colors"
          >
            Kembali ke POS
          </button>
          <button
            type="button"
            onClick={handleCloseShift}
            disabled={isSubmitting}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold py-3 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-colors"
          >
            {isSubmitting ? 'Menutup Shift...' : 'Tutup Shift Kasir'}
          </button>
        </div>
      </div>
    </div>
  );
};
