import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Ingredient, IngredientCategory, UnitOfMeasure, InventoryCostLayer, StockMovement } from '../../types';
import { formatIDR } from '../../lib/currency';
import { Package, AlertTriangle, CheckCircle, Search, Plus, Trash2, Edit2 } from 'lucide-react';

export const IngredientsManager: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  // Form State
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<IngredientCategory>('coffee');
  const [baseUnit, setBaseUnit] = useState<UnitOfMeasure>('g');
  const [minStock, setMinStock] = useState<number>(500);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(100);
  const [notes, setNotes] = useState<string>('');

  const load = async () => {
    const items = await db.ingredients.toArray();
    setIngredients(items);
  };

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setEditingIngredient(null);
    const nextNum = ingredients.length + 1;
    setCode(`ING-${nextNum < 10 ? '00' : nextNum < 100 ? '0' : ''}${nextNum}`);
    setName('');
    setCategory('coffee');
    setBaseUnit('g');
    setMinStock(500);
    setInitialStock(1000);
    setUnitCost(150);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setCode(ing.code);
    setName(ing.name);
    setCategory(ing.category);
    setBaseUnit(ing.baseUnit);
    setMinStock(ing.minStock);
    setInitialStock(ing.currentStock);
    setUnitCost(0);
    setNotes(ing.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const ingId = editingIngredient ? editingIngredient.id : `ing-${Date.now()}`;
    const currentStockVal = editingIngredient ? editingIngredient.currentStock : Number(initialStock) || 0;

    const ingredientData: Ingredient = {
      id: ingId,
      code: code.trim() || `ING-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      category,
      baseUnit,
      minStock: Number(minStock) || 0,
      currentStock: currentStockVal,
      notes: notes.trim(),
    };

    await db.ingredients.put(ingredientData);

    // If new ingredient with initial stock, create initial FIFO cost layer
    if (!editingIngredient && initialStock > 0) {
      const layerId = `layer-init-${ingId}`;
      const costLayer: InventoryCostLayer = {
        id: layerId,
        ingredientId: ingId,
        batchNumber: `LOT-INIT-${code}`,
        receivedAt: new Date().toISOString(),
        initialQuantity: Number(initialStock),
        remainingQuantity: Number(initialStock),
        unitCost: Number(unitCost) || 0,
        supplierName: 'Stok Saldo Awal',
        isDepleted: false,
      };
      await db.costLayers.put(costLayer);

      const movement: StockMovement = {
        id: `mov-init-${Date.now()}`,
        ingredientId: ingId,
        ingredientName: ingredientData.name,
        timestamp: new Date().toISOString(),
        type: 'goods_receipt',
        quantity: Number(initialStock),
        unit: baseUnit,
        unitCost: Number(unitCost) || 0,
        referenceId: `LOT-INIT-${code}`,
        notes: 'Saldo Stok Awal Bahan',
        performedBy: 'Hirakada (Owner)',
      };
      await db.stockMovements.add(movement);
    }

    await db.auditLogs.add({
      id: `audit-ing-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: editingIngredient ? 'UPDATE_INGREDIENT' : 'CREATE_INGREDIENT',
      entity: 'ingredient',
      entityId: ingId,
      details: `${editingIngredient ? 'Memperbarui' : 'Menambahkan'} bahan baku: ${ingredientData.name} (${ingredientData.code})`,
    });

    setIsModalOpen(false);
    await load();
  };

  const handleDeleteIngredient = async (id: string, ingName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus bahan baku "${ingName}"?`)) {
      await db.ingredients.delete(id);
      await db.costLayers.where('ingredientId').equals(id).delete();
      await db.auditLogs.add({
        id: `audit-ing-del-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: 'usr-hirakada',
        actorName: 'Hirakada (Owner)',
        action: 'DELETE_INGREDIENT',
        entity: 'ingredient',
        entityId: id,
        details: `Menghapus bahan baku: ${ingName}`,
      });
      await load();
    }
  };

  const filtered = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Package size={24} className="text-[#b6d333]" />
            <span>Bahan Baku & Material Kemasan</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Daftar stok bahan perolehan, satuan ukuran (g, ml, pcs), dan batas peringatan stok minimum.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari bahan..."
              className="bg-[#232529] border border-stone-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#b6d333]"
            />
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Tambah Bahan Baku</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#232529] border border-stone-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-[#b6d333]/30 flex items-center justify-center text-[#b6d333] mx-auto">
            <Package size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Bahan Baku</h3>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Tambahkan bahan baku (seperti biji kopi, susu, sirup) atau kemasan (cup, sedotan) untuk resep minuman dan pelacakan inventaris FIFO.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-[#b6d333]/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Bahan Baku Pertama</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-3.5">Kode</th>
                  <th className="p-3.5">Nama Bahan</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5 text-right">Stok Min</th>
                  <th className="p-3.5 text-right">Stok Fisik</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {filtered.map((ing) => {
                  const isLow = ing.currentStock <= ing.minStock;
                  return (
                    <tr key={ing.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-stone-400">{ing.code}</td>
                      <td className="p-3.5 font-bold text-white">{ing.name}</td>
                      <td className="p-3.5">
                        <span className="text-[10px] bg-stone-800 text-[#b6d333] border border-[#b6d333]/20 px-2 py-0.5 rounded uppercase font-semibold">
                          {ing.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-stone-400">
                        {ing.minStock} {ing.baseUnit}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-white text-sm">
                        {ing.currentStock} {ing.baseUnit}
                      </td>
                      <td className="p-3.5 text-center">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[10px] inline-flex items-center gap-1">
                            <AlertTriangle size={12} />
                            <span>Menipis</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#b6d333]/15 text-[#b6d333] border border-[#b6d333]/30 font-bold text-[10px] inline-flex items-center gap-1">
                            <CheckCircle size={12} />
                            <span>Aman</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(ing)}
                            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                            title="Ubah Bahan"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                            className="p-1.5 text-stone-400 hover:text-red-400 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                            title="Hapus Bahan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Ingredient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#232529] border border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package size={18} className="text-[#b6d333]" />
                <span>{editingIngredient ? 'Ubah Bahan Baku' : 'Tambah Bahan Baku Baru'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Kode Bahan</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Contoh: ING-001"
                    className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
                  >
                    <option value="coffee">☕ Kopi (Coffee)</option>
                    <option value="tea">🍵 Teh & Daun</option>
                    <option value="dairy">🥛 Susu & Dairy</option>
                    <option value="syrup">🍯 Sirup & Gula</option>
                    <option value="topping">🧋 Topping (Boba, Jelly)</option>
                    <option value="packaging">📦 Kemasan (Cup, Lid, Straw)</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Nama Bahan Baku</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Biji Kopi Arabica Gayo"
                  className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Satuan Ukuran Dasar</label>
                  <select
                    value={baseUnit}
                    onChange={(e: any) => setBaseUnit(e.target.value)}
                    className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-[#b6d333]"
                  >
                    <option value="g">Gram (g) - Kopi, bubuk</option>
                    <option value="ml">Mililiter (ml) - Susu, sirup</option>
                    <option value="pcs">Pcs (Buah) - Cup, sedotan</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="L">Liter (L)</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Batas Minimum Peringatan</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
              </div>

              {!editingIngredient && (
                <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-200">Saldo Stok Awal (Opsional)</span>
                    <span className="text-[10px] text-stone-400">Otomatis buat layer FIFO</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-stone-400 text-[11px] block mb-1">
                        Jumlah Stok ({baseUnit})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={initialStock}
                        onChange={(e) => setInitialStock(Number(e.target.value))}
                        className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-[#b6d333]"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[11px] block mb-1">
                        Harga Beli/Satuan (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={unitCost}
                        onChange={(e) => setUnitCost(Number(e.target.value))}
                        className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-[#b6d333]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-stone-300 font-bold block mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Simpan di chiller suhu 4°C"
                  className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
                />
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
                  {editingIngredient ? 'Simpan Perubahan' : 'Buat Bahan Baku'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
