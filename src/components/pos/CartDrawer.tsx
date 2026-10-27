import React from 'react';
import { SaleItem, DiscountInfo } from '../../types';
import { formatIDR } from '../../lib/currency';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, X, Tag, ShieldCheck, Edit3 } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: SaleItem[];
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onProceedToPayment: () => void;
  discount: number;
  discountInfo: DiscountInfo | null;
  onOpenDiscountModal: () => void;
  onClearDiscount: () => void;
  taxRatePercent: number;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToPayment,
  discount,
  discountInfo,
  onOpenDiscountModal,
  onClearDiscount,
  taxRatePercent,
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const tax = Math.round(((subtotal - discount) * taxRatePercent) / 100);
  const grandTotal = Math.max(0, subtotal - discount + tax);

  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-200 lg:static lg:inset-auto lg:z-auto ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'
      }`}
    >
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs lg:hidden"
        onClick={onClose}
      />

      {/* Cart Container */}
      <aside
        className={`fixed bottom-0 left-0 right-0 max-h-[85vh] h-[85vh] lg:h-full lg:max-h-none lg:static w-full lg:w-96 bg-stone-900 border-t lg:border-t-0 lg:border-l border-stone-800 rounded-t-3xl lg:rounded-none flex flex-col z-50 transition-transform duration-200 ${
          isOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Keranjang Pesanan</h2>
              <p className="text-[11px] text-stone-400">{items.length} item dipilih</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-stone-400 hover:text-red-400 text-xs font-semibold p-1.5"
              >
                Kosongkan
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-2 text-stone-400 hover:text-white rounded-full bg-stone-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
              <div className="w-16 h-16 rounded-2xl bg-stone-800/60 flex items-center justify-center mb-3">
                <ShoppingBag size={28} className="text-stone-600" />
              </div>
              <p className="text-sm font-semibold text-stone-400">Keranjang masih kosong</p>
              <p className="text-xs text-stone-600 mt-1">
                Pilih menu minuman di sebelah untuk menambahkan ke pesanan.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-stone-800/40 border border-stone-800 rounded-2xl space-y-2 hover:border-stone-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <h3 className="text-xs font-bold text-white leading-tight">{item.productName}</h3>
                    {item.variantName && (
                      <span className="inline-block text-[10px] bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded mt-1 font-medium">
                        {item.variantName}
                      </span>
                    )}
                    {item.selectedModifiers.length > 0 && (
                      <div className="text-[10px] text-amber-400/90 mt-1 leading-snug">
                        {item.selectedModifiers.map((m) => `+ ${m.name}`).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[10px] italic text-stone-400 mt-1">
                        &quot;{item.notes}&quot;
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-white">
                      {formatIDR(item.itemTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="block ml-auto text-stone-500 hover:text-red-400 p-1 mt-1 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                  <span className="text-[11px] text-stone-400">
                    @ {formatIDR(item.unitPrice)}
                  </span>
                  <div className="flex items-center gap-2 bg-stone-800 rounded-lg p-0.5 border border-stone-700/60">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-stone-700 flex items-center justify-center text-white hover:bg-stone-600 disabled:opacity-40"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-xs font-bold text-white w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-stone-700 flex items-center justify-center text-white hover:bg-stone-600"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary & Checkout Button */}
        {items.length > 0 && (
          <div className="p-4 border-t border-stone-800 bg-stone-950/80 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal:</span>
                <span className="text-stone-200 font-semibold">{formatIDR(subtotal)}</span>
              </div>

              {/* Dedicated Diskon Button & Active Discount Card */}
              <div className="pt-1 pb-1">
                {!discountInfo || discount <= 0 ? (
                  <button
                    type="button"
                    onClick={onOpenDiscountModal}
                    className="w-full py-2 px-3 bg-stone-800/80 hover:bg-stone-800 border border-dashed border-stone-700/80 hover:border-[#b6d333]/60 rounded-xl text-stone-300 hover:text-[#b6d333] text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Tag size={13} className="text-[#b6d333]" />
                      <span>Tambah Diskon / Promo</span>
                    </div>
                    <span className="text-[10px] bg-[#b6d333]/15 text-[#b6d333] px-1.5 py-0.5 rounded font-bold">
                      Diskon % / Rp
                    </span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-[#b6d333]/10 border border-[#b6d333]/40 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Tag size={13} className="text-[#b6d333] shrink-0" />
                        <span className="font-bold text-[#b6d333]">
                          Diskon {discountInfo.type === 'percent' ? `${discountInfo.value}%` : 'Flat'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[#b6d333]">
                          -{formatIDR(discount)}
                        </span>
                        <button
                          type="button"
                          onClick={onOpenDiscountModal}
                          className="p-1 text-stone-400 hover:text-[#b6d333] rounded cursor-pointer"
                          title="Ubah diskon"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={onClearDiscount}
                          className="p-1 text-stone-400 hover:text-red-400 rounded cursor-pointer"
                          title="Hapus diskon"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-0.5">
                      <span className="truncate max-w-[180px]">{discountInfo.reason}</span>
                      {discountInfo.approvedBy && (
                        <span className="flex items-center gap-1 text-[#b6d333] font-semibold bg-[#b6d333]/15 px-1.5 py-0.5 rounded border border-[#b6d333]/30">
                          <ShieldCheck size={11} />
                          <span>Otorisasi: {discountInfo.approvedBy}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-[#b6d333] text-xs font-semibold">
                  <span>Potongan Diskon:</span>
                  <span>-{formatIDR(discount)}</span>
                </div>
              )}

              {taxRatePercent > 0 && (
                <div className="flex justify-between text-stone-400">
                  <span>Pajak Resto (PB1 {taxRatePercent}%):</span>
                  <span className="text-stone-200">{formatIDR(tax)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-stone-800">
                <span>Total Tagihan:</span>
                <span className="text-[#b6d333] text-base">{formatIDR(grandTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToPayment}
              className="w-full bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black py-3.5 px-4 rounded-xl flex items-center justify-between shadow-lg shadow-[#b6d333]/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span className="font-black">Bayar Sekarang</span>
              <div className="flex items-center gap-1.5 font-black text-sm">
                <span>{formatIDR(grandTotal)}</span>
                <ArrowRight size={16} />
              </div>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
