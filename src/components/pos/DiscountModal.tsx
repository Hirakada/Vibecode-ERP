import React, { useState, useEffect } from 'react';
import { DiscountType, DiscountInfo, UserProfile } from '../../types';
import {
  calculateDiscountAmount,
  isOverrideRequired,
  verifySupervisorPin,
  STANDARD_DISCOUNT_REASONS,
  DEFAULT_DISCOUNT_LIMITS,
} from '../../utils/discount';
import { formatIDR } from '../../lib/currency';
import {
  Tag,
  Percent,
  Banknote,
  ShieldCheck,
  ShieldAlert,
  X,
  Check,
  Trash2,
  Lock,
  KeyRound,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  currentUser: UserProfile;
  currentDiscount: DiscountInfo | null;
  onApplyDiscount: (discount: DiscountInfo | null) => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  currentUser,
  currentDiscount,
  onApplyDiscount,
}) => {
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [valueInput, setValueInput] = useState<string>('');
  const [reason, setReason] = useState<string>(STANDARD_DISCOUNT_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');

  // Manager Override state
  const [supervisorPin, setSupervisorPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [overrideApprover, setOverrideApprover] = useState<{
    id: string;
    name: string;
    role: any;
  } | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentDiscount) {
        setDiscountType(currentDiscount.type);
        setValueInput(currentDiscount.value.toString());
        setReason(currentDiscount.reason);
        setCustomReason(currentDiscount.customReason || '');
        if (currentDiscount.approvedBy) {
          setOverrideApprover({
            id: 'approved-id',
            name: currentDiscount.approvedBy,
            role: currentDiscount.approvedByRole || 'manager',
          });
        } else {
          setOverrideApprover(null);
        }
      } else {
        setDiscountType('percent');
        setValueInput('10');
        setReason(STANDARD_DISCOUNT_REASONS[0]);
        setCustomReason('');
        setOverrideApprover(null);
      }
      setSupervisorPin('');
      setPinError(null);
    }
  }, [isOpen, currentDiscount]);

  if (!isOpen) return null;

  const numericValue = parseFloat(valueInput) || 0;
  const calculatedDiscount = calculateDiscountAmount(subtotal, discountType, numericValue);
  const newTotal = Math.max(0, subtotal - calculatedDiscount);

  // Check if override is required
  const overrideNeeded = isOverrideRequired(
    calculatedDiscount,
    discountType,
    numericValue,
    currentUser.role,
    DEFAULT_DISCOUNT_LIMITS
  );

  const isAuthorized = !overrideNeeded || overrideApprover !== null;

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError(null);

    const result = verifySupervisorPin(supervisorPin);
    if (result.isValid && result.approver) {
      setOverrideApprover(result.approver);
      setSupervisorPin('');
      setPinError(null);
    } else {
      setPinError(result.error || 'PIN otorisasi tidak valid');
    }
  };

  const handleApply = () => {
    if (calculatedDiscount <= 0) {
      onApplyDiscount(null);
      onClose();
      return;
    }

    if (overrideNeeded && !overrideApprover) {
      setPinError('Otorisasi PIN manajer/owner diperlukan untuk menerapkan diskon ini.');
      return;
    }

    const appliedDiscount: DiscountInfo = {
      type: discountType,
      value: numericValue,
      amount: calculatedDiscount,
      reason,
      customReason: reason.includes('Lainnya') ? customReason.trim() : undefined,
      requiresOverride: overrideNeeded,
      approvedBy: overrideApprover ? overrideApprover.name : undefined,
      approvedByRole: overrideApprover ? overrideApprover.role : undefined,
      approvedAt: overrideApprover ? new Date().toISOString() : undefined,
    };

    onApplyDiscount(appliedDiscount);
    onClose();
  };

  const handleRemove = () => {
    onApplyDiscount(null);
    onClose();
  };

  const percentPresets = [5, 10, 15, 20, 25, 50];
  const flatPresets = [5000, 10000, 15000, 20000, 30000, 50000];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-900">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Tag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Diskon & Promo Pesanan</h2>
              <p className="text-xs text-stone-400">
                Subtotal Keranjang: <strong className="text-stone-200">{formatIDR(subtotal)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Discount Type Toggle */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block mb-1.5">
              Tipe Diskon
            </label>
            <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setDiscountType('percent');
                  if (discountType !== 'percent') setValueInput('10');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  discountType === 'percent'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Percent size={14} />
                <span>Persentase (%)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountType('flat');
                  if (discountType !== 'flat') setValueInput('10000');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  discountType === 'flat'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Banknote size={14} />
                <span>Nominal Rupiah (Rp)</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Pilihan Cepat (Preset)
              </label>
              <span className="text-[11px] text-stone-500">
                Batas kasir: maks {DEFAULT_DISCOUNT_LIMITS.maxCashierPercent}% / Rp{' '}
                {DEFAULT_DISCOUNT_LIMITS.maxCashierFlatAmount.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {discountType === 'percent'
                ? percentPresets.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setValueInput(pct.toString())}
                      className={`py-2 px-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        numericValue === pct
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-stone-800/80 hover:bg-stone-700 border-stone-700/60 text-stone-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))
                : flatPresets.map((flat) => (
                    <button
                      key={flat}
                      type="button"
                      onClick={() => setValueInput(flat.toString())}
                      className={`py-2 px-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        numericValue === flat
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-stone-800/80 hover:bg-stone-700 border-stone-700/60 text-stone-300'
                      }`}
                    >
                      {flat >= 1000 ? `${flat / 1000}rb` : flat}
                    </button>
                  ))}
            </div>
          </div>

          {/* Custom Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block mb-1.5">
              Nilai Diskon Kustom
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 font-bold text-sm">
                {discountType === 'percent' ? '%' : 'Rp'}
              </div>
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : subtotal}
                value={valueInput}
                onChange={(e) => {
                  setValueInput(e.target.value);
                  // Reset supervisor approval if value changes
                  if (overrideApprover) setOverrideApprover(null);
                }}
                placeholder={discountType === 'percent' ? 'Contoh: 15' : 'Contoh: 10000'}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-base font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block mb-1.5">
              Alasan / Kategori Diskon
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl py-2.5 px-3 text-stone-200 text-xs font-medium focus:outline-none focus:border-amber-500"
            >
              {STANDARD_DISCOUNT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {reason.includes('Lainnya') && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Tulis alasan diskon secara spesifik..."
                className="w-full mt-2 bg-stone-950 border border-stone-700 rounded-xl py-2 px-3 text-white text-xs placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* Live Calculation Preview Box */}
          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Subtotal Pesanan:</span>
              <span className="text-stone-300 font-semibold">{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-amber-400 font-semibold">
              <span>Potongan Diskon ({discountType === 'percent' ? `${numericValue}%` : 'Flat'}):</span>
              <span>-{formatIDR(calculatedDiscount)}</span>
            </div>
            <div className="flex justify-between text-white font-extrabold text-sm pt-1.5 border-t border-stone-800">
              <span>Subtotal Setelah Diskon:</span>
              <span className="text-emerald-400">{formatIDR(newTotal)}</span>
            </div>
          </div>

          {/* Manual Supervisor Override Gate */}
          {overrideNeeded && (
            <div className="p-3.5 bg-amber-950/20 border border-amber-800/60 rounded-xl space-y-2.5">
              <div className="flex items-start gap-2">
                <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    Memerlukan Otorisasi Manajer / Owner
                  </h4>
                  <p className="text-[11px] text-amber-200/80 leading-snug">
                    Diskon yang dimasukkan (
                    {discountType === 'percent' ? `${numericValue}%` : formatIDR(calculatedDiscount)}
                    ) melebihi batas wewenang kasir standar (maks {DEFAULT_DISCOUNT_LIMITS.maxCashierPercent}% /{' '}
                    {formatIDR(DEFAULT_DISCOUNT_LIMITS.maxCashierFlatAmount)}).
                  </p>
                </div>
              </div>

              {overrideApprover ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-950/50 border border-emerald-800 rounded-lg text-emerald-300 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <div>
                      <span className="font-bold">Otorisasi Terverifikasi:</span>
                      <p className="text-[11px] text-emerald-200">
                        {overrideApprover.name} ({overrideApprover.role})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOverrideApprover(null)}
                    className="text-[11px] text-stone-400 hover:text-white underline"
                  >
                    Ubah
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyPin} className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                        <KeyRound size={14} />
                      </div>
                      <input
                        type="password"
                        maxLength={6}
                        value={supervisorPin}
                        onChange={(e) => {
                          setSupervisorPin(e.target.value);
                          setPinError(null);
                        }}
                        placeholder="Masukkan PIN Manajer/Owner"
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl py-2 pl-9 pr-3 text-white text-xs font-mono tracking-widest placeholder:tracking-normal focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!supervisorPin.trim()}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Verifikasi
                    </button>
                  </div>

                  {pinError && (
                    <div className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-stone-400 bg-stone-900/90 p-1.5 rounded-lg border border-stone-800">
                    <HelpCircle size={12} className="text-[#b6d333] shrink-0" />
                    <span>PIN Supervisor: Hirakada (Owner): <strong>1234</strong></span>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-800 bg-stone-900 flex items-center justify-between gap-2">
          {currentDiscount ? (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2.5 rounded-xl border border-red-900/60 text-red-400 hover:bg-red-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Hapus Diskon</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={!isAuthorized || calculatedDiscount <= 0}
              className="px-5 py-2.5 bg-[#b6d333] hover:bg-[#c7e63b] disabled:opacity-40 text-stone-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-lg shadow-[#b6d333]/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Check size={15} />
              <span>
                {calculatedDiscount > 0
                  ? `Terapkan (-${formatIDR(calculatedDiscount)})`
                  : 'Terapkan Diskon'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
