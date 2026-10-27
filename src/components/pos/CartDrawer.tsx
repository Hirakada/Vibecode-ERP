import React, { useState } from 'react';
import { SaleItem, DiscountInfo } from '../../types';
import { formatIDR } from '../../lib/currency';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  X,
  Tag,
  ShieldCheck,
  Edit3,
  Percent,
  Truck,
  FileText,
  BadgePercent,
  DollarSign,
} from 'lucide-react';

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
  serviceFee: number;
  onChangeServiceFee: (fee: number) => void;
  deliveryFee: number;
  onChangeDeliveryFee: (fee: number) => void;
  onApplyItemDiscount: (
    itemId: string,
    discountAmount: number,
    discountInfo?: { type: 'percent' | 'flat'; value: number }
  ) => void;
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
  serviceFee,
  onChangeServiceFee,
  deliveryFee,
  onChangeDeliveryFee,
  onApplyItemDiscount,
}) => {
  // Item discount modal state
  const [editingItemForDiscount, setEditingItemForDiscount] = useState<SaleItem | null>(null);
  const [itemDiscType, setItemDiscType] = useState<'percent' | 'flat'>('percent');
  const [itemDiscVal, setItemDiscVal] = useState<number>(10);

  // Fee input view toggles
  const [showFeeControls, setShowFeeControls] = useState<boolean>(false);

  // Financial calculations
  const rawSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemDiscountsTotal = items.reduce((sum, item) => sum + (item.itemDiscount || 0), 0);
  const subtotalAfterItemDiscounts = Math.max(0, rawSubtotal - itemDiscountsTotal);
  const netTaxableSubtotal = Math.max(0, subtotalAfterItemDiscounts - discount);
  const tax = Math.round((netTaxableSubtotal * taxRatePercent) / 100);
  const grandTotal = Math.max(0, netTaxableSubtotal + tax + (serviceFee || 0) + (deliveryFee || 0));

  const openItemDiscountModal = (item: SaleItem) => {
    setEditingItemForDiscount(item);
    if (item.itemDiscountInfo) {
      setItemDiscType(item.itemDiscountInfo.type);
      setItemDiscVal(item.itemDiscountInfo.value);
    } else {
      setItemDiscType('percent');
      setItemDiscVal(10);
    }
  };

  const handleSaveItemDiscount = () => {
    if (!editingItemForDiscount) return;
    const itemRaw = editingItemForDiscount.unitPrice * editingItemForDiscount.quantity;
    let discAmount = 0;
    if (itemDiscType === 'percent') {
      discAmount = Math.round((itemRaw * itemDiscVal) / 100);
    } else {
      discAmount = itemDiscVal;
    }
    discAmount = Math.min(itemRaw, Math.max(0, discAmount));

    onApplyItemDiscount(editingItemForDiscount.id, discAmount, {
      type: itemDiscType,
      value: itemDiscVal,
    });
    setEditingItemForDiscount(null);
  };

  const handleRemoveItemDiscount = (itemId: string) => {
    onApplyItemDiscount(itemId, 0, undefined);
    if (editingItemForDiscount?.id === itemId) {
      setEditingItemForDiscount(null);
    }
  };

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
        className={`fixed bottom-0 left-0 right-0 max-h-[90vh] h-[90vh] lg:h-full lg:max-h-none lg:static w-full lg:w-96 bg-stone-900 border-t lg:border-t-0 lg:border-l border-stone-800 rounded-t-3xl lg:rounded-none flex flex-col z-50 transition-transform duration-200 ${
          isOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#b6d333]/10 text-[#b6d333] rounded-xl">
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
                className="text-stone-400 hover:text-red-400 text-xs font-semibold p-1.5 cursor-pointer"
              >
                Kosongkan
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-2 text-stone-400 hover:text-white rounded-full bg-stone-800 cursor-pointer"
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
            items.map((item) => {
              const itemRawTotal = item.unitPrice * item.quantity;
              const hasItemDiscount = (item.itemDiscount || 0) > 0;
              return (
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
                      {hasItemDiscount && (
                        <span className="text-[10px] line-through text-stone-500 block">
                          {formatIDR(itemRawTotal)}
                        </span>
                      )}
                      <span className="text-xs font-extrabold text-[#b6d333]">
                        {formatIDR(item.itemTotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="block ml-auto text-stone-500 hover:text-red-400 p-1 mt-1 transition-colors cursor-pointer"
                        title="Hapus dari keranjang"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Quantity and Item Discount Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-400">
                        @ {formatIDR(item.unitPrice)}
                      </span>

                      {/* Item Discount Trigger */}
                      <button
                        type="button"
                        onClick={() => openItemDiscountModal(item)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          hasItemDiscount
                            ? 'bg-[#b6d333]/20 text-[#b6d333] border border-[#b6d333]/40'
                            : 'bg-stone-800 text-stone-400 hover:text-[#b6d333] hover:bg-stone-750'
                        }`}
                        title="Beri Diskon per Item"
                      >
                        <BadgePercent size={11} />
                        <span>
                          {hasItemDiscount
                            ? item.itemDiscountInfo?.type === 'percent'
                              ? `-${item.itemDiscountInfo.value}%`
                              : `-${formatIDR(item.itemDiscount || 0)}`
                            : '+ Diskon Item'}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-stone-800 rounded-lg p-0.5 border border-stone-700/60">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-stone-700 flex items-center justify-center text-white hover:bg-stone-600 disabled:opacity-40 cursor-pointer"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-bold text-white w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-stone-700 flex items-center justify-center text-white hover:bg-stone-600 cursor-pointer"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pricing Summary & Checkout Button */}
        {items.length > 0 && (
          <div className="p-4 border-t border-stone-800 bg-stone-950/90 space-y-3">
            {/* Fees Toggle & Settings (Admin/Service + Ongkir) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowFeeControls(!showFeeControls)}
                  className="text-stone-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Truck size={13} className="text-[#b6d333]" />
                  <span>Biaya Layanan & Ongkir</span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    ({showFeeControls ? 'Tutup' : 'Atur'})
                  </span>
                </button>
                <div className="flex items-center gap-2 text-[11px]">
                  {serviceFee > 0 && (
                    <span className="text-stone-300 font-mono">
                      Adm: <strong className="text-white">{formatIDR(serviceFee)}</strong>
                    </span>
                  )}
                  {deliveryFee > 0 && (
                    <span className="text-stone-300 font-mono">
                      Ongkir: <strong className="text-white">{formatIDR(deliveryFee)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {showFeeControls && (
                <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
                  {/* Service / Admin Fee */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-stone-300 font-medium">Biaya Layanan / Admin:</span>
                      <span className="font-mono font-bold text-white">{formatIDR(serviceFee)}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[10px]">
                      {[0, 1000, 2000, 3000, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => onChangeServiceFee(val)}
                          className={`py-1 rounded font-bold cursor-pointer transition-colors ${
                            serviceFee === val
                              ? 'bg-[#b6d333] text-stone-950'
                              : 'bg-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          {val === 0 ? 'Rp 0' : `+${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ongkos Kirim / Delivery Fee */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-stone-300 font-medium">Ongkos Kirim (Delivery):</span>
                      <span className="font-mono font-bold text-white">{formatIDR(deliveryFee)}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[10px]">
                      {[0, 5000, 10000, 15000, 20000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => onChangeDeliveryFee(val)}
                          className={`py-1 rounded font-bold cursor-pointer transition-colors ${
                            deliveryFee === val
                              ? 'bg-[#b6d333] text-stone-950'
                              : 'bg-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          {val === 0 ? 'Rp 0' : `+${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Total Order Discount Promo Banner */}
            <div className="pt-0.5 pb-0.5">
              {!discountInfo || discount <= 0 ? (
                <button
                  type="button"
                  onClick={onOpenDiscountModal}
                  className="w-full py-2 px-3 bg-stone-800/80 hover:bg-stone-800 border border-dashed border-stone-700/80 hover:border-[#b6d333]/60 rounded-xl text-stone-300 hover:text-[#b6d333] text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Tag size={13} className="text-[#b6d333]" />
                    <span>Tambah Diskon Total Belanja</span>
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
                        Diskon Belanja {discountInfo.type === 'percent' ? `${discountInfo.value}%` : 'Flat'}
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

            {/* Complete Price Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal Menu:</span>
                <span className="text-stone-200 font-semibold">{formatIDR(rawSubtotal)}</span>
              </div>

              {itemDiscountsTotal > 0 && (
                <div className="flex justify-between text-[#b6d333]">
                  <span>Diskon Item:</span>
                  <span className="font-semibold">-{formatIDR(itemDiscountsTotal)}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between text-[#b6d333]">
                  <span>Diskon Total Belanja:</span>
                  <span className="font-semibold">-{formatIDR(discount)}</span>
                </div>
              )}

              {serviceFee > 0 && (
                <div className="flex justify-between text-stone-400">
                  <span>Biaya Layanan / Admin:</span>
                  <span className="text-stone-200 font-semibold">+{formatIDR(serviceFee)}</span>
                </div>
              )}

              {deliveryFee > 0 && (
                <div className="flex justify-between text-stone-400">
                  <span>Ongkos Kirim (Delivery):</span>
                  <span className="text-stone-200 font-semibold">+{formatIDR(deliveryFee)}</span>
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

      {/* Modal Diskon per Item */}
      {editingItemForDiscount && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-sm bg-[#232529] border border-stone-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <BadgePercent size={18} className="text-[#b6d333]" />
                <h3 className="text-sm font-bold text-white">Diskon per Item</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItemForDiscount(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="bg-stone-900 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-stone-400 block">Item Dipilih:</span>
              <div className="text-xs font-bold text-white">{editingItemForDiscount.productName}</div>
              <div className="text-[11px] text-stone-400 font-mono">
                {editingItemForDiscount.quantity} x {formatIDR(editingItemForDiscount.unitPrice)} ={' '}
                <strong className="text-stone-200">
                  {formatIDR(editingItemForDiscount.quantity * editingItemForDiscount.unitPrice)}
                </strong>
              </div>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setItemDiscType('percent')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  itemDiscType === 'percent'
                    ? 'bg-[#b6d333] text-stone-950'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <Percent size={14} />
                <span>Persentase (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setItemDiscType('flat')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  itemDiscType === 'flat'
                    ? 'bg-[#b6d333] text-stone-950'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <DollarSign size={14} />
                <span>Nominal (Rp)</span>
              </button>
            </div>

            {/* Preset chips */}
            {itemDiscType === 'percent' ? (
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[5, 10, 15, 20].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setItemDiscVal(p)}
                    className={`py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                      itemDiscVal === p
                        ? 'bg-[#b6d333]/20 border border-[#b6d333] text-[#b6d333]'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[2000, 5000, 10000].map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setItemDiscVal(nom)}
                    className={`py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                      itemDiscVal === nom
                        ? 'bg-[#b6d333]/20 border border-[#b6d333] text-[#b6d333]'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
                    }`}
                  >
                    {formatIDR(nom)}
                  </button>
                ))}
              </div>
            )}

            {/* Custom input */}
            <div>
              <label className="text-[11px] text-stone-400 font-semibold block mb-1">
                {itemDiscType === 'percent' ? 'Nilai Persentase (%)' : 'Nilai Nominal (Rp)'}
              </label>
              <input
                type="number"
                min="0"
                max={itemDiscType === 'percent' ? 100 : undefined}
                value={itemDiscVal || ''}
                onChange={(e) => setItemDiscVal(Number(e.target.value))}
                className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {editingItemForDiscount.itemDiscount ? (
                <button
                  type="button"
                  onClick={() => handleRemoveItemDiscount(editingItemForDiscount.id)}
                  className="px-3 py-2.5 bg-red-950/60 border border-red-800 text-red-300 font-bold text-xs rounded-xl hover:bg-red-900 cursor-pointer"
                >
                  Hapus
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSaveItemDiscount}
                className="flex-1 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Terapkan Diskon Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

