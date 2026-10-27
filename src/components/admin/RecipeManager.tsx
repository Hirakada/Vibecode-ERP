import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Recipe, Product, Ingredient, InventoryCostLayer, RecipeItem } from '../../types';
import { formatIDR } from '../../lib/currency';
import { calculateTheoreticalRecipeCost } from '../../lib/fifo';
import { BookOpen, Coffee, Plus, Trash2, Edit2, Layers, CheckCircle2 } from 'lucide-react';

export const RecipeManager: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [layers, setLayers] = useState<InventoryCostLayer[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([
    { ingredientId: '', quantity: 18, unit: 'g', isPackaging: false },
  ]);

  const load = async () => {
    const recs = await db.recipes.toArray();
    const prods = await db.products.toArray();
    const ings = await db.ingredients.toArray();
    const costLayers = await db.costLayers.toArray();

    setRecipes(recs);
    setProducts(prods);
    setIngredients(ings);
    setLayers(costLayers);

    if (prods.length > 0 && !selectedProductId) {
      setSelectedProductId(prods[0].id);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setEditingRecipe(null);
    if (products.length > 0) {
      // Pick first product that doesn't have a recipe, or just first product
      const existingProductIds = new Set(recipes.map((r) => r.productId));
      const unassigned = products.find((p) => !existingProductIds.has(p.id));
      setSelectedProductId(unassigned ? unassigned.id : products[0].id);
    }
    const defaultIng = ingredients.length > 0 ? ingredients[0].id : '';
    const defaultUnit = ingredients.length > 0 ? ingredients[0].baseUnit : 'g';
    setRecipeItems([
      { ingredientId: defaultIng, quantity: 20, unit: defaultUnit, isPackaging: false },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: Recipe) => {
    setEditingRecipe(rec);
    setSelectedProductId(rec.productId);
    setRecipeItems(rec.items.map((i) => ({ ...i })));
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    const defaultIng = ingredients.length > 0 ? ingredients[0].id : '';
    const defaultUnit = ingredients.length > 0 ? ingredients[0].baseUnit : 'g';
    setRecipeItems((prev) => [
      ...prev,
      { ingredientId: defaultIng, quantity: 1, unit: defaultUnit, isPackaging: false },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setRecipeItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof RecipeItem, value: any) => {
    setRecipeItems((prev) => {
      const next = [...prev];
      if (field === 'ingredientId') {
        const found = ingredients.find((i) => i.id === value);
        next[index] = {
          ...next[index],
          ingredientId: value,
          unit: found ? found.baseUnit : next[index].unit,
          isPackaging: found?.category === 'packaging',
        };
      } else {
        next[index] = {
          ...next[index],
          [field]: value,
        };
      }
      return next;
    });
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const validItems = recipeItems.filter((i) => i.ingredientId && i.quantity > 0);
    if (validItems.length === 0) {
      alert('Harap masukkan setidaknya satu bahan untuk resep.');
      return;
    }

    const recId = editingRecipe ? editingRecipe.id : `rec-${selectedProductId}-${Date.now()}`;
    const recipeData: Recipe = {
      id: recId,
      productId: selectedProductId,
      version: editingRecipe ? editingRecipe.version + 1 : 1,
      effectiveDate: new Date().toISOString().slice(0, 10),
      items: validItems,
    };

    await db.recipes.put(recipeData);

    // Update product recipeId reference
    const prod = await db.products.get(selectedProductId);
    if (prod) {
      prod.recipeId = recId;
      await db.products.put(prod);
    }

    await db.auditLogs.add({
      id: `audit-rec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: editingRecipe ? 'UPDATE_RECIPE' : 'CREATE_RECIPE',
      entity: 'recipe',
      entityId: recId,
      details: `${editingRecipe ? 'Memperbarui' : 'Membuat'} resep untuk produk: ${prod?.name || selectedProductId}`,
    });

    setIsModalOpen(false);
    await load();
  };

  const handleDeleteRecipe = async (id: string, prodName: string) => {
    if (confirm(`Hapus resep untuk produk "${prodName}"?`)) {
      await db.recipes.delete(id);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BookOpen size={24} className="text-[#b6d333]" />
            <span>Resep Minuman & Biaya HPP Teoretis</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Bill of Materials (BOM) per cup: takaran bahan baku, kemasan habis pakai, dan kalkulasi HPP otomatis dari layer FIFO aktif.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          disabled={products.length === 0 || ingredients.length === 0}
          className="flex items-center gap-1.5 bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus size={16} />
          <span>Buat Resep Baru</span>
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-[#232529] border border-stone-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-[#b6d333]/30 flex items-center justify-center text-[#b6d333] mx-auto">
            <BookOpen size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Resep Minuman (BOM)</h3>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Resep menghubungkan menu produk dengan stok bahan baku & kemasan. Setiap kali kasir menjual minuman, stok bahan akan dipotong secara akurat menggunakan antrian FIFO.
            </p>
          </div>
          {products.length === 0 ? (
            <p className="text-[11px] text-[#b6d333] font-semibold">
              Tip: Buat Produk Minuman dan Bahan Baku terlebih dahulu sebelum membuat resep.
            </p>
          ) : (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-[#b6d333]/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Buat Resep Pertama Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipes.map((recipe) => {
            const product = products.find((p) => p.id === recipe.productId);
            if (!product) return null;

            const theoreticalCost = calculateTheoreticalRecipeCost(recipe.items, layers);
            const margin =
              product.basePrice > 0
                ? Math.round(((product.basePrice - theoreticalCost) / product.basePrice) * 100)
                : 0;

            return (
              <div
                key={recipe.id}
                className="bg-[#232529] border border-stone-800 hover:border-stone-700 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#b6d333] uppercase">
                        Versi {recipe.version} • {product.code}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-0.5">{product.name}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-stone-300 block">Harga Jual</span>
                      <span className="text-xs font-black text-[#b6d333]">{formatIDR(product.basePrice)}</span>
                    </div>
                  </div>

                  {/* Composition Table */}
                  <div className="mt-3 bg-[#1a1b1e] rounded-xl p-3 border border-stone-800/80 space-y-1.5 text-xs">
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
                          <span className="font-mono font-bold text-stone-300">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Costing Summary & Actions */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-medium">Estimasi HPP FIFO:</span>
                    <span className="font-mono font-black text-[#b6d333] text-sm">
                      {formatIDR(theoreticalCost)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-stone-400 block font-medium">Gross Margin:</span>
                    <span className="font-black text-emerald-400 text-sm">{margin}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(recipe)}
                      className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Ubah Resep"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecipe(recipe.id, product.name)}
                      className="p-1.5 text-stone-400 hover:text-red-400 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Hapus Resep"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Recipe Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#232529] border border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen size={18} className="text-[#b6d333]" />
                <span>{editingRecipe ? 'Ubah Resep Minuman' : 'Buat Resep Minuman (BOM)'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="space-y-4 text-xs">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Pilih Menu Produk</label>
                <select
                  disabled={!!editingRecipe}
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-[#b6d333]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) - {formatIDR(p.basePrice)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-300">Komposisi Takaran per 1 Cup</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[#b6d333] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Tambah Baris Bahan</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {recipeItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#1a1b1e] border border-stone-800 rounded-xl flex items-center gap-2"
                    >
                      <select
                        value={item.ingredientId}
                        onChange={(e) => handleItemChange(idx, 'ingredientId', e.target.value)}
                        className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#b6d333]"
                      >
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.baseUnit})
                          </option>
                        ))}
                      </select>

                      <div className="w-24 flex items-center gap-1">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          placeholder="Jumlah"
                          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#b6d333]"
                        />
                        <span className="text-[10px] text-stone-400 font-mono">{item.unit}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={recipeItems.length <= 1}
                        className="p-1.5 text-stone-500 hover:text-red-400 disabled:opacity-20 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer"
                >
                  {editingRecipe ? 'Simpan Perubahan' : 'Simpan Resep (BOM)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
