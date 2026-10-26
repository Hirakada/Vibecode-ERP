import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Product } from '../../types';
import { formatIDR } from '../../lib/currency';
import { Coffee, CheckCircle, XCircle } from 'lucide-react';

export const ProductsManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    const prods = await db.products.toArray();
    setProducts(prods);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleProductActive = async (product: Product) => {
    product.active = !product.active;
    await db.products.put(product);
    await load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Coffee size={22} className="text-amber-400" />
          <span>Katalog Produk & Menu Minuman</span>
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Daftar menu minuman Caozy, varian ukuran, opsi tambahan (modifier), dan status ketersediaan di POS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-stone-500 font-bold uppercase">{product.code}</span>
                <span className="text-[10px] bg-stone-800 text-amber-400 px-2 py-0.5 rounded font-semibold uppercase">
                  {product.category}
                </span>
              </div>
              <h3 className="font-bold text-sm text-white">{product.name}</h3>
              <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>

              {/* Variants */}
              {product.variants.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-stone-800 text-[11px] text-stone-300 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">Varian:</span>
                  <div className="flex flex-wrap gap-1">
                    {product.variants.map((v) => (
                      <span key={v.id} className="bg-stone-800 px-2 py-0.5 rounded text-stone-300">
                        {v.name} {v.priceDelta > 0 && `(+${formatIDR(v.priceDelta)})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-500 block">Harga Dasar</span>
                <span className="text-sm font-black text-amber-400">{formatIDR(product.basePrice)}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleProductActive(product)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  product.active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-stone-800 text-stone-500'
                }`}
              >
                {product.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span>{product.active ? 'Aktif di POS' : 'Non-aktif'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
