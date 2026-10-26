import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Recipe, Product, Ingredient, InventoryCostLayer } from '../../types';
import { formatIDR } from '../../lib/currency';
import { calculateTheoreticalRecipeCost } from '../../lib/fifo';
import { BookOpen, Coffee, Percent, Layers } from 'lucide-react';

export const RecipeManager: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [layers, setLayers] = useState<InventoryCostLayer[]>([]);

  useEffect(() => {
    const load = async () => {
      const recs = await db.recipes.toArray();
      const prods = await db.products.toArray();
      const ings = await db.ingredients.toArray();
      const costLayers = await db.costLayers.toArray();

      setRecipes(recs);
      setProducts(prods);
      setIngredients(ings);
      setLayers(costLayers);
    };
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <BookOpen size={22} className="text-amber-400" />
          <span>Resep Minuman & Biaya HPP Teoretis</span>
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Bill of Materials (BOM) per cup: takaran bahan baku, kemasan habis pakai, dan kalkulasi HPP otomatis dari layer FIFO aktif.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recipes.map((recipe) => {
          const product = products.find((p) => p.id === recipe.productId);
          if (!product) return null;

          const theoreticalCost = calculateTheoreticalRecipeCost(recipe.items, layers);
          const margin = product.basePrice > 0
            ? Math.round(((product.basePrice - theoreticalCost) / product.basePrice) * 100)
            : 0;

          return (
            <div
              key={recipe.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                      Versi {recipe.version} • {product.code}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{product.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-stone-300 block">Harga Jual</span>
                    <span className="text-xs font-black text-amber-400">{formatIDR(product.basePrice)}</span>
                  </div>
                </div>

                {/* Composition Table */}
                <div className="mt-3 bg-stone-950/60 rounded-xl p-3 border border-stone-800/80 space-y-1.5 text-xs">
                  <div className="text-[10px] uppercase font-bold text-stone-500 pb-1 border-b border-stone-800 flex justify-between">
                    <span>Komponen Bahan & Kemasan</span>
                    <span>Takaran per Cup</span>
                  </div>
                  {recipe.items.map((item, idx) => {
                    const ing = ingredients.find((i) => i.id === item.ingredientId);
                    return (
                      <div key={idx} className="flex justify-between text-stone-300">
                        <span className={item.isPackaging ? 'text-stone-400' : 'text-stone-200'}>
                          {ing?.name || 'Item'} {item.isPackaging && '(Kemasan)'}
                        </span>
                        <span className="font-mono font-semibold text-stone-300">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Costing Summary */}
              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 block font-medium">Estimasi HPP FIFO:</span>
                  <span className="font-mono font-black text-sky-400 text-sm">{formatIDR(theoreticalCost)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block font-medium">Gross Margin:</span>
                  <span className="font-bold text-emerald-400 text-sm">{margin}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
