import React, { useState } from 'react';
import { Product, ProductVariant, ProductModifier, SaleItem } from '../../types';
import { formatIDR } from '../../lib/currency';
import { X, Plus, Minus, Check } from 'lucide-react';

interface ProductCustomizerModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: SaleItem) => void;
}

export const ProductCustomizerModal: React.FC<ProductCustomizerModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants[0]
  );
  const [selectedModifiers, setSelectedModifiers] = useState<ProductModifier[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const variantDelta = selectedVariant ? selectedVariant.priceDelta : 0;
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
  const unitPrice = product.basePrice + variantDelta + modifiersTotal;
  const totalPrice = unitPrice * quantity;

  const toggleModifier = (mod: ProductModifier) => {
    if (selectedModifiers.some((m) => m.id === mod.id)) {
      setSelectedModifiers(selectedModifiers.filter((m) => m.id !== mod.id));
    } else {
      setSelectedModifiers([...selectedModifiers, mod]);
    }
  };

  const handleConfirm = () => {
    const saleItem: SaleItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      unitPrice,
      quantity,
      selectedModifiers: selectedModifiers.map((m) => ({
        modifierId: m.id,
        name: m.name,
        price: m.price,
      })),
      itemTotal: totalPrice,
      notes: notes.trim() || undefined,
    };

    onAddToCart(saleItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-white">{product.name}</h2>
            <p className="text-xs text-amber-400 font-semibold">{formatIDR(product.basePrice)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-full bg-stone-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {product.description && (
            <p className="text-xs text-stone-400 leading-relaxed">{product.description}</p>
          )}

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block mb-2">
                Pilih Ukuran / Varian
              </label>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-stone-800 bg-stone-800/40 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{v.name}</span>
                        {isSelected && <Check size={14} className="text-amber-400" />}
                      </div>
                      <span className="text-[11px] text-stone-400 mt-1">
                        {v.priceDelta > 0 ? `+${formatIDR(v.priceDelta)}` : 'Standar'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifiers & Toppings */}
          {product.modifiers.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block mb-2">
                Tambahan & Custom (Opsional)
              </label>
              <div className="space-y-1.5">
                {product.modifiers.map((mod) => {
                  const isChecked = selectedModifiers.some((m) => m.id === mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModifier(mod)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-stone-800 bg-stone-800/40 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked
                              ? 'border-amber-500 bg-amber-500 text-stone-950'
                              : 'border-stone-600 bg-stone-900'
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-medium">{mod.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-amber-400">
                        {mod.price > 0 ? `+${formatIDR(mod.price)}` : 'Gratis'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block mb-1.5">
              Catatan untuk Barista
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pisah es, jangan terlalu manis..."
              className="w-full bg-stone-800/80 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-stone-300">Jumlah Minuman</span>
            <div className="flex items-center gap-3 bg-stone-800 rounded-xl p-1 border border-stone-700">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-stone-700 flex items-center justify-center text-white hover:bg-stone-600 disabled:opacity-40"
                disabled={quantity <= 1}
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-bold text-white w-6 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-stone-700 flex items-center justify-center text-white hover:bg-stone-600"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/60">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3.5 px-4 rounded-xl flex items-center justify-between shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-transform"
          >
            <span>Tambah ke Pesanan</span>
            <span className="font-extrabold">{formatIDR(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
