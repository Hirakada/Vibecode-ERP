import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Ingredient } from '../../types';
import { Package, AlertTriangle, CheckCircle, Search } from 'lucide-react';

export const IngredientsManager: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const items = await db.ingredients.toArray();
      setIngredients(items);
    };
    load();
  }, []);

  const filtered = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Package size={22} className="text-amber-400" />
            <span>Bahan Baku & Material Kemasan</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Daftar stok bahan perolehan, satuan ukuran (g, ml, pcs), dan batas peringatan stok minimum.
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bahan..."
            className="bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-3">Kode</th>
                <th className="p-3">Nama Bahan</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Stok Minimum</th>
                <th className="p-3 text-right">Stok Fisik Saat Ini</th>
                <th className="p-3 text-center">Status Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {filtered.map((ing) => {
                const isLow = ing.currentStock <= ing.minStock;
                return (
                  <tr key={ing.id} className="hover:bg-stone-800/40">
                    <td className="p-3 font-mono font-bold text-stone-400">{ing.code}</td>
                    <td className="p-3 font-bold text-white">{ing.name}</td>
                    <td className="p-3">
                      <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded uppercase font-semibold">
                        {ing.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-stone-400">
                      {ing.minStock} {ing.baseUnit}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white text-sm">
                      {ing.currentStock} {ing.baseUnit}
                    </td>
                    <td className="p-3 text-center">
                      {isLow ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[10px] inline-flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span>Menipis</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle size={12} />
                          <span>Aman</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
