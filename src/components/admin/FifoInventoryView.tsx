import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { InventoryCostLayer, StockMovement, Ingredient } from '../../types';
import { formatIDR } from '../../lib/currency';
import { allocateFifoLayers, calculateInventoryValuation } from '../../lib/fifo';
import { Layers, History, PlusCircle, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const FifoInventoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'layers' | 'movements' | 'adjust'>('layers');
  const [layers, setLayers] = useState<InventoryCostLayer[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientFilter, setSelectedIngredientFilter] = useState<string>('all');
  const [showDepleted, setShowDepleted] = useState<boolean>(false);

  // Adjustment form state
  const [adjustIngId, setAdjustIngId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'waste' | 'adjustment'>('waste');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    const allLayers = await db.costLayers.toArray();
    // Sort oldest received first
    allLayers.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    setLayers(allLayers);

    const movs = await db.stockMovements.orderBy('timestamp').reverse().toArray();
    setMovements(movs);

    const ings = await db.ingredients.toArray();
    setIngredients(ings);
    if (ings.length > 0 && !adjustIngId) {
      setAdjustIngId(ings[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalValuation = calculateInventoryValuation(layers);

  const filteredLayers = layers.filter((l) => {
    const matchIng = selectedIngredientFilter === 'all' || l.ingredientId === selectedIngredientFilter;
    const matchDepleted = showDepleted ? true : !l.isDepleted && l.remainingQuantity > 0;
    return matchIng && matchDepleted;
  });

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustIngId || adjustQty <= 0) return;

    const ing = ingredients.find((i) => i.id === adjustIngId);
    if (!ing) return;

    // Use FIFO to allocate reduction from oldest layers
    const ingLayers = layers.filter(
      (l) => l.ingredientId === adjustIngId && !l.isDepleted && l.remainingQuantity > 0
    );
    const fifoResult = allocateFifoLayers(ingLayers, adjustQty, false);

    if (!fifoResult.isSufficient) {
      alert(`Stok tidak mencukupi untuk pengurangan ini! Tersisa: ${ing.currentStock} ${ing.baseUnit}`);
      return;
    }

    // Persist updated layers
    for (const layer of fifoResult.updatedLayers) {
      await db.costLayers.put(layer);
    }

    // Update ingredient stock
    ing.currentStock = Math.max(0, ing.currentStock - adjustQty);
    await db.ingredients.put(ing);

    // Create stock movement
    const now = new Date().toISOString();
    await db.stockMovements.add({
      id: `mov-adj-${Date.now()}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      timestamp: now,
      type: adjustType,
      quantity: -adjustQty,
      unit: ing.baseUnit,
      performedBy: 'Staf Gudang (Inventory)',
      notes: `${adjustType === 'waste' ? 'Pembuangan/Wastage' : 'Penyesuaian Fisik/Opname'}: ${adjustNotes || '-'}`,
    });

    await db.auditLogs.add({
      id: `audit-adj-${Date.now()}`,
      timestamp: now,
      actorId: 'inventory',
      actorName: 'Staf Gudang',
      action: 'STOCK_ADJUSTMENT',
      entity: 'inventory',
      entityId: ing.id,
      details: `${adjustType.toUpperCase()} sebesar ${adjustQty} ${ing.baseUnit} pada ${ing.name}. Biaya FIFO teralokasi: ${formatIDR(fifoResult.totalCogs)}`,
    });

    setAdjustSuccessMsg(`Berhasil mencatat ${adjustType} sebesar ${adjustQty} ${ing.baseUnit}`);
    setAdjustQty(0);
    setAdjustNotes('');
    await loadData();
    setTimeout(() => setAdjustSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Layers size={22} className="text-amber-400" />
            <span>Manajemen Inventaris FIFO</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Metode First In, First Out ketat dengan pelacakan batch perolehan, alokasi biaya, dan mutasi stok.
          </p>
        </div>
        <div className="p-3 bg-stone-900 border border-stone-800 rounded-2xl flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Total Valuasi FIFO</span>
            <span className="text-sm sm:text-base font-black text-emerald-400">{formatIDR(totalValuation)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('layers')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'layers'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Batch & Layer Biaya Aktif ({layers.filter((l) => !l.isDepleted).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'movements'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Mutasi Stok (Stock Movement)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('adjust')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'adjust'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Pencatatan Basi / Penyesuaian (Waste)
        </button>
      </div>

      {/* TAB 1: FIFO COST LAYERS */}
      {activeTab === 'layers' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/60 p-3 rounded-2xl border border-stone-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Filter Bahan:</span>
              <select
                value={selectedIngredientFilter}
                onChange={(e) => setSelectedIngredientFilter(e.target.value)}
                className="bg-stone-800 border border-stone-700 text-stone-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="all">Semua Bahan Baku</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-stone-400">
              <input
                type="checkbox"
                checked={showDepleted}
                onChange={(e) => setShowDepleted(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Tampilkan Batch Habis (Depleted)</span>
            </label>
          </div>

          {/* Table / Cards */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
                  <tr>
                    <th className="p-3">Urutan FIFO & Batch</th>
                    <th className="p-3">Bahan Baku</th>
                    <th className="p-3">Waktu Penerimaan</th>
                    <th className="p-3">Pemasok</th>
                    <th className="p-3 text-right">Harga Beli / Unit</th>
                    <th className="p-3 text-right">Qty Awal</th>
                    <th className="p-3 text-right">Sisa Stok</th>
                    <th className="p-3 text-right">Nilai Sisa</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-stone-300">
                  {filteredLayers.map((layer, index) => {
                    const ing = ingredients.find((i) => i.id === layer.ingredientId);
                    const remainingVal = layer.remainingQuantity * layer.unitCost;

                    return (
                      <tr
                        key={layer.id}
                        className={`hover:bg-stone-800/40 transition-colors ${
                          layer.isDepleted ? 'opacity-40 bg-stone-950/20' : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-amber-400">
                          #{index + 1} • {layer.batchNumber}
                        </td>
                        <td className="p-3 font-semibold text-white">{ing?.name || 'Bahan'}</td>
                        <td className="p-3 text-stone-400">
                          {new Date(layer.receivedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3 text-stone-400">{layer.supplierName || '-'}</td>
                        <td className="p-3 text-right font-mono text-stone-200">
                          {formatIDR(layer.unitCost)} / {ing?.baseUnit}
                        </td>
                        <td className="p-3 text-right font-mono text-stone-400">
                          {layer.initialQuantity} {ing?.baseUnit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {layer.remainingQuantity} {ing?.baseUnit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {formatIDR(remainingVal)}
                        </td>
                        <td className="p-3 text-center">
                          {layer.isDepleted ? (
                            <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-500 font-semibold text-[10px]">
                              Habis
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                              Aktif
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
      )}

      {/* TAB 2: STOCK MOVEMENTS */}
      {activeTab === 'movements' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Jenis Mutasi</th>
                  <th className="p-3">Bahan Baku</th>
                  <th className="p-3 text-right">Perubahan Qty</th>
                  <th className="p-3">Petugas</th>
                  <th className="p-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {movements.map((mov) => {
                  const isPositive = mov.quantity > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-stone-800/40">
                      <td className="p-3 text-stone-400 whitespace-nowrap">
                        {new Date(mov.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            mov.type === 'goods_receipt'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : mov.type === 'sale_consumption'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {mov.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-white">{mov.ingredientName}</td>
                      <td
                        className={`p-3 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isPositive ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                      </td>
                      <td className="p-3 text-stone-400">{mov.performedBy}</td>
                      <td className="p-3 text-stone-400 max-w-xs truncate">{mov.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK ADJUSTMENT / WASTE FORM */}
      {activeTab === 'adjust' && (
        <div className="max-w-xl bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertOctagon size={18} className="text-amber-400" />
            <span>Pencatatan Bahan Rusak / Basi / Penyesuaian Fisik (Opname)</span>
          </h2>
          <p className="text-xs text-stone-400">
            Pengurangan stok akan dialokasikan langsung memotong cost layer FIFO tertua dan dicatat dalam audit trail.
          </p>

          {adjustSuccessMsg && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{adjustSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleApplyAdjustment} className="space-y-4 text-xs">
            <div>
              <label className="text-stone-300 font-bold block mb-1">Pilih Bahan Baku / Kemasan</label>
              <select
                value={adjustIngId}
                onChange={(e) => setAdjustIngId(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Tersedia: {ing.currentStock} {ing.baseUnit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-stone-300 font-bold block mb-1">Jenis Penyesuaian</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('waste')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    adjustType === 'waste'
                      ? 'border-red-500 bg-red-500/10 text-red-300'
                      : 'border-stone-800 bg-stone-800/40 text-stone-400'
                  }`}
                >
                  Basi / Tumpah / Expired (Waste)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('adjustment')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    adjustType === 'adjustment'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-stone-800 bg-stone-800/40 text-stone-400'
                  }`}
                >
                  Selisih Stock Opname
                </button>
              </div>
            </div>

            <div>
              <label className="text-stone-300 font-bold block mb-1">
                Jumlah Pengurangan (dalam unit dasar bahan)
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={adjustQty || ''}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                placeholder="Contoh: 100"
                className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="text-stone-300 font-bold block mb-1">Keterangan / Alasan</label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Contoh: Susu asam karena kulkas mati 2 jam"
                className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-400 text-stone-950 font-extrabold py-3 rounded-xl transition-colors cursor-pointer"
            >
              Potong Stok FIFO & Catat Mutasi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
