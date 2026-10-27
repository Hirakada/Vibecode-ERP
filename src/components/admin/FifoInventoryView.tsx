import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { InventoryCostLayer, StockMovement, Ingredient } from '../../types';
import { formatIDR } from '../../lib/currency';
import { allocateFifoLayers, calculateInventoryValuation } from '../../lib/fifo';
import {
  Layers,
  History,
  AlertOctagon,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  X,
  Search,
  Scale,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';

export const FifoInventoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'layers' | 'movements' | 'adjust'>('layers');
  const [layers, setLayers] = useState<InventoryCostLayer[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientFilter, setSelectedIngredientFilter] = useState<string>('all');
  const [showDepleted, setShowDepleted] = useState<boolean>(false);

  // Set Habis Modal State
  const [layerToDeplete, setLayerToDeplete] = useState<InventoryCostLayer | null>(null);
  const [depleteReason, setDepleteReason] = useState<string>('Kadaluarsa / Rusak / Basi / Habis Fisik di Bar');
  const [isDepleting, setIsDepleting] = useState<boolean>(false);

  // Adjustment & Stock Opname form state
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

  // Handle Set Habis on a single FIFO layer
  const handleConfirmSetDepleted = async () => {
    if (!layerToDeplete) return;
    const ing = ingredients.find((i) => i.id === layerToDeplete.ingredientId);
    if (!ing) return;

    setIsDepleting(true);
    try {
      const remainingQty = layerToDeplete.remainingQuantity;
      const wasteCost = Math.round(remainingQty * layerToDeplete.unitCost);
      const now = new Date().toISOString();

      // 1. Set layer to depleted
      layerToDeplete.remainingQuantity = 0;
      layerToDeplete.isDepleted = true;
      await db.costLayers.put(layerToDeplete);

      // 2. Deduct ingredient stock
      ing.currentStock = Math.max(0, ing.currentStock - remainingQty);
      await db.ingredients.put(ing);

      // 3. Log stock movement as waste
      await db.stockMovements.add({
        id: `mov-waste-${Date.now()}`,
        ingredientId: ing.id,
        ingredientName: ing.name,
        timestamp: now,
        type: 'waste',
        quantity: -remainingQty,
        unit: ing.baseUnit,
        performedBy: 'Hirakada (Owner / Head Bar)',
        notes: `Set Habis Manual Batch ${layerToDeplete.batchNumber}: ${depleteReason} (Biaya Terbuang: ${formatIDR(wasteCost)})`,
      });

      // 4. Record as waste cost in expenses so financial accounting is accurate
      if (wasteCost > 0) {
        await db.expenses.add({
          id: `exp-waste-${Date.now()}`,
          date: now,
          category: 'operasional',
          amount: wasteCost,
          description: `Beban Kerugian Bahan Terbuang (Set Habis): ${ing.name} (${remainingQty} ${ing.baseUnit}) Batch ${layerToDeplete.batchNumber} - ${depleteReason}`,
          paymentMethod: 'cash',
          recordedBy: 'Hirakada (Owner)',
        });
      }

      // 5. Audit Log
      await db.auditLogs.add({
        id: `audit-waste-${Date.now()}`,
        timestamp: now,
        actorId: 'usr-hirakada',
        actorName: 'Hirakada (Owner)',
        action: 'SET_STOCK_DEPLETED_WASTE',
        entity: 'inventory',
        entityId: layerToDeplete.id,
        details: `Set Habis manual batch ${layerToDeplete.batchNumber} (${ing.name}) sebanyak ${remainingQty} ${ing.baseUnit}. Beban kerugian terbuang dicatat: ${formatIDR(wasteCost)}.`,
      });

      setAdjustSuccessMsg(
        `Batch ${layerToDeplete.batchNumber} berhasil diset habis. Kerugian terbuang sebesar ${formatIDR(wasteCost)} telah dicatat ke Beban Operasional.`
      );
      setLayerToDeplete(null);
      await loadData();
      setTimeout(() => setAdjustSuccessMsg(null), 4500);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status batch menjadi habis.');
    } finally {
      setIsDepleting(false);
    }
  };

  // Handle Set Habis for ALL active layers of an ingredient
  const handleSetAllDepletedForIngredient = async (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;

    const activeLayers = layers.filter(
      (l) => l.ingredientId === ingredientId && !l.isDepleted && l.remainingQuantity > 0
    );

    if (activeLayers.length === 0) {
      alert(`Stok bahan "${ing.name}" sudah kosong / 0.`);
      return;
    }

    const totalQty = activeLayers.reduce((s, l) => s + l.remainingQuantity, 0);
    const totalCost = activeLayers.reduce((s, l) => s + l.remainingQuantity * l.unitCost, 0);

    const ok = confirm(
      `Apakah Anda yakin ingin men-SET HABIS seluruh stok "${ing.name}"?\n\n` +
      `Sisa Stok: ${totalQty} ${ing.baseUnit}\n` +
      `Total Biaya Terbuang (Waste): ${formatIDR(totalCost)}\n\n` +
      `Nilai ini akan dicatat ke Pengeluaran/Beban Kerugian Operasional.`
    );
    if (!ok) return;

    const now = new Date().toISOString();
    for (const l of activeLayers) {
      l.remainingQuantity = 0;
      l.isDepleted = true;
      await db.costLayers.put(l);
    }

    ing.currentStock = 0;
    await db.ingredients.put(ing);

    await db.stockMovements.add({
      id: `mov-waste-all-${Date.now()}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      timestamp: now,
      type: 'waste',
      quantity: -totalQty,
      unit: ing.baseUnit,
      performedBy: 'Hirakada (Owner)',
      notes: `Set Habis Total Bahan (Cek Fisik Kosong): ${totalQty} ${ing.baseUnit} (Biaya: ${formatIDR(totalCost)})`,
    });

    if (totalCost > 0) {
      await db.expenses.add({
        id: `exp-waste-all-${Date.now()}`,
        date: now,
        category: 'operasional',
        amount: Math.round(totalCost),
        description: `Beban Kerugian Bahan Terbuang (Set Habis Total): ${ing.name} (${totalQty} ${ing.baseUnit})`,
        paymentMethod: 'cash',
        recordedBy: 'Hirakada (Owner)',
      });
    }

    await db.auditLogs.add({
      id: `audit-waste-all-${Date.now()}`,
      timestamp: now,
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: 'SET_ALL_DEPLETED_WASTE',
      entity: 'inventory',
      entityId: ing.id,
      details: `Set Habis total stok ${ing.name} (${totalQty} ${ing.baseUnit}). Kerugian terbuang: ${formatIDR(totalCost)}.`,
    });

    setAdjustSuccessMsg(
      `Seluruh stok ${ing.name} diset habis. Beban kerugian ${formatIDR(totalCost)} dicatat ke Pengeluaran Operasional.`
    );
    await loadData();
    setTimeout(() => setAdjustSuccessMsg(null), 4500);
  };

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

    const now = new Date().toISOString();
    const costValue = Math.round(fifoResult.totalCogs);

    // Create stock movement
    await db.stockMovements.add({
      id: `mov-adj-${Date.now()}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      timestamp: now,
      type: adjustType,
      quantity: -adjustQty,
      unit: ing.baseUnit,
      performedBy: 'Hirakada (Owner / Barista)',
      notes: `${adjustType === 'waste' ? 'Pembuangan/Wastage' : 'Penyesuaian Fisik/Opname'}: ${adjustNotes || '-'} (Biaya: ${formatIDR(costValue)})`,
    });

    // Record as waste expense if type is waste
    if (adjustType === 'waste' && costValue > 0) {
      await db.expenses.add({
        id: `exp-waste-adj-${Date.now()}`,
        date: now,
        category: 'operasional',
        amount: costValue,
        description: `Beban Kerugian Bahan Terbuang (Waste): ${ing.name} (${adjustQty} ${ing.baseUnit}) - ${adjustNotes || 'Pembuangan bahan'}`,
        paymentMethod: 'cash',
        recordedBy: 'Hirakada (Owner)',
      });
    }

    await db.auditLogs.add({
      id: `audit-adj-${Date.now()}`,
      timestamp: now,
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: 'STOCK_ADJUSTMENT',
      entity: 'inventory',
      entityId: ing.id,
      details: `${adjustType.toUpperCase()} sebesar ${adjustQty} ${ing.baseUnit} pada ${ing.name}. Biaya FIFO teralokasi: ${formatIDR(costValue)}`,
    });

    setAdjustSuccessMsg(
      `Berhasil mencatat ${adjustType} sebesar ${adjustQty} ${ing.baseUnit}. ${
        adjustType === 'waste' ? `Kerugian ${formatIDR(costValue)} dibukukan ke beban operasional.` : ''
      }`
    );
    setAdjustQty(0);
    setAdjustNotes('');
    await loadData();
    setTimeout(() => setAdjustSuccessMsg(null), 4000);
  };

  const selectedIngObj = ingredients.find((i) => i.id === adjustIngId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Layers size={22} className="text-[#b6d333]" />
            <span>Manajemen Inventaris FIFO & Cek Stok</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Pelacakan batch perolehan, alokasi biaya FIFO, cek stok manual, dan fitur set habis dengan pencatatan biaya terbuang (waste cost).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 px-4 bg-[#232529] border border-stone-800 rounded-2xl flex items-center gap-3">
            <span className="text-xs text-stone-400">Total Nilai Stok (FIFO):</span>
            <span className="text-sm font-black text-[#b6d333] font-mono">
              {formatIDR(totalValuation)}
            </span>
          </div>
        </div>
      </div>

      {adjustSuccessMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{adjustSuccessMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-800 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('layers')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'layers'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Layer Biaya FIFO ({filteredLayers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Mutasi Stok & Log Biaya Terbuang ({movements.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('adjust')}
          className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'adjust'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Cek Stok Manual & Set Habis (Stock Opname)
        </button>
      </div>

      {/* TAB 1: FIFO COST LAYERS */}
      {activeTab === 'layers' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#232529] p-3 rounded-2xl border border-stone-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Filter Bahan:</span>
              <select
                value={selectedIngredientFilter}
                onChange={(e) => setSelectedIngredientFilter(e.target.value)}
                className="bg-[#1a1b1e] border border-stone-700 text-stone-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#b6d333]"
              >
                <option value="all">Semua Bahan Baku ({ingredients.length})</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Tersedia: {ing.currentStock} {ing.baseUnit})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-stone-400">
              <input
                type="checkbox"
                checked={showDepleted}
                onChange={(e) => setShowDepleted(e.target.checked)}
                className="accent-[#b6d333] rounded w-4 h-4"
              />
              <span>Tampilkan Batch yang Sudah Habis</span>
            </label>
          </div>

          {/* Table */}
          <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
            {filteredLayers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Layers size={36} className="text-stone-600 mx-auto" />
                <h4 className="text-xs font-bold text-white">Belum Ada Layer Biaya FIFO</h4>
                <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                  Catat penerimaan stok bahan di menu Pembelian/Goods Receipt untuk membentuk batch FIFO dengan harga perolehan presisi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
                    <tr>
                      <th className="p-3">Urutan & Batch LOT</th>
                      <th className="p-3">Bahan Baku</th>
                      <th className="p-3">Tgl Masuk</th>
                      <th className="p-3 text-right">Harga Beli</th>
                      <th className="p-3 text-right">Sisa Stok</th>
                      <th className="p-3 text-right">Nilai Sisa</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Aksi Cek Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 text-stone-300">
                    {filteredLayers.map((layer, index) => {
                      const ing = ingredients.find((i) => i.id === layer.ingredientId);
                      const remainingVal = layer.remainingQuantity * layer.unitCost;
                      const canDeplete = !layer.isDepleted && layer.remainingQuantity > 0;

                      return (
                        <tr
                          key={layer.id}
                          className={`hover:bg-stone-800/40 transition-colors ${
                            layer.isDepleted ? 'opacity-40 bg-stone-950/20' : ''
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-[#b6d333]">
                            #{index + 1} • {layer.batchNumber}
                          </td>
                          <td className="p-3 font-semibold text-white">
                            {ing?.name || 'Bahan'}
                          </td>
                          <td className="p-3 text-stone-400">
                            {new Date(layer.receivedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="p-3 text-right font-mono text-stone-200">
                            {formatIDR(layer.unitCost)}/{ing?.baseUnit}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white">
                            {layer.remainingQuantity.toLocaleString('id-ID')} {ing?.baseUnit}
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
                              <span className="px-2 py-0.5 rounded-full bg-[#b6d333]/15 text-[#b6d333] border border-[#b6d333]/30 font-bold text-[10px]">
                                Tersedia
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {canDeplete ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setLayerToDeplete(layer);
                                  setDepleteReason('Kadaluarsa / Rusak / Basi / Habis Fisik di Bar');
                                }}
                                className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/90 text-red-300 border border-red-800/80 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                                title="Set sisa batch ini menjadi habis dan catat kerugian biaya"
                              >
                                <Trash2 size={12} />
                                <span>Set Habis (Waste)</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-stone-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENTS */}
      {activeTab === 'movements' && (
        <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
          {movements.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              Belum ada mutasi stok atau pembuangan yang tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
                  <tr>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Jenis Mutasi</th>
                    <th className="p-3">Bahan Baku</th>
                    <th className="p-3 text-right">Perubahan Qty</th>
                    <th className="p-3">Petugas</th>
                    <th className="p-3">Keterangan & Beban Biaya</th>
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
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                              mov.type === 'goods_receipt'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : mov.type === 'sale_consumption'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                : mov.type === 'waste'
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {mov.type === 'goods_receipt'
                              ? 'Barang Masuk'
                              : mov.type === 'sale_consumption'
                              ? 'Konsumsi POS'
                              : mov.type === 'waste'
                              ? 'Terbuang (Waste)'
                              : 'Penyesuaian Fisik'}
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
                        <td className="p-3 text-stone-300 text-[11px]">{mov.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CEK STOK MANUAL & STOCK OPNAME */}
      {activeTab === 'adjust' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Form Pengurangan / Waste Parsial */}
          <div className="bg-[#232529] border border-stone-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-stone-800 pb-2">
              <Scale size={16} className="text-[#b6d333]" />
              <span>Cek Stok Parsial / Catat Basi (Waste)</span>
            </h2>

            <form onSubmit={handleApplyAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Pilih Bahan Baku</label>
                <select
                  value={adjustIngId}
                  onChange={(e) => setAdjustIngId(e.target.value)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (Stok Sistem: {ing.currentStock} {ing.baseUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Jenis Pencatatan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('waste')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      adjustType === 'waste'
                        ? 'border-red-500 bg-red-500/10 text-red-300'
                        : 'border-stone-800 bg-[#1a1b1e] text-stone-400'
                    }`}
                  >
                    Basi / Terbuang (Waste Cost)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      adjustType === 'adjustment'
                        ? 'border-[#b6d333] bg-[#b6d333]/10 text-[#b6d333]'
                        : 'border-stone-800 bg-[#1a1b1e] text-stone-400'
                    }`}
                  >
                    Selisih Cek Fisik Opname
                  </button>
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Jumlah Pengurangan ({selectedIngObj?.baseUnit || 'unit'})
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={adjustQty || ''}
                  onChange={(e) => setAdjustQty(Number(e.target.value) || 0)}
                  placeholder="Contoh: 200"
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333] font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Alasan / Catatan</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Contoh: Susu tumpah di bar / sirup kadaluarsa"
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Potong Stok & Catat Kerugian Biaya
              </button>
            </form>
          </div>

          {/* Card 2: Quick Action "Set Habis Total Bahan Baku" */}
          <div className="bg-[#232529] border border-stone-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-stone-800 pb-2">
              <ClipboardCheck size={16} className="text-[#b6d333]" />
              <span>Cek Stok Fisik & Tombol "Set Habis Manual"</span>
            </h2>

            <p className="text-xs text-stone-400 leading-relaxed">
              Jika saat cek fisik di outlet suatu bahan baku telah habis total (misal botol sirup pecah atau susu asam seluruhnya), gunakan tombol berikut untuk mengosongkan sisa stok. Sistem akan menghitung sisa nilai rupiah bahan dan otomatis mencatatnya sebagai <strong>Beban Kerugian Terbuang (Waste Cost)</strong>.
            </p>

            <div className="space-y-3 pt-2">
              {ingredients.length === 0 ? (
                <p className="text-xs text-stone-500">Belum ada bahan baku terdaftar.</p>
              ) : (
                ingredients.map((ing) => {
                  const ingLayers = layers.filter(
                    (l) => l.ingredientId === ing.id && !l.isDepleted && l.remainingQuantity > 0
                  );
                  const activeStock = ingLayers.reduce((s, l) => s + l.remainingQuantity, 0);
                  const activeValue = ingLayers.reduce((s, l) => s + l.remainingQuantity * l.unitCost, 0);

                  return (
                    <div
                      key={ing.id}
                      className="p-3 bg-[#1a1b1e] border border-stone-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{ing.name}</span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          Stok: <strong className="text-stone-200">{activeStock} {ing.baseUnit}</strong> (Nilai: {formatIDR(activeValue)})
                        </span>
                      </div>

                      {activeStock > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSetAllDepletedForIngredient(ing.id)}
                          className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800/80 text-red-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Set Habis (Waste Cost)
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-500 font-semibold px-2 py-1 bg-stone-900 rounded-lg">
                          Sudah 0 (Habis)
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION: SET HABIS BATCH */}
      {layerToDeplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#232529] border border-red-800/80 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="text-sm font-black text-red-400 flex items-center gap-2">
                <AlertTriangle size={18} />
                <span>Konfirmasi Set Habis (Catat Biaya Terbuang)</span>
              </h3>
              <button
                type="button"
                onClick={() => setLayerToDeplete(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            {(() => {
              const ing = ingredients.find((i) => i.id === layerToDeplete.ingredientId);
              const wasteCost = Math.round(layerToDeplete.remainingQuantity * layerToDeplete.unitCost);

              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#1a1b1e] border border-stone-800 rounded-xl space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Bahan Baku:</span>
                      <strong className="text-white">{ing?.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Batch / LOT:</span>
                      <span className="font-mono text-[#b6d333] font-bold">{layerToDeplete.batchNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Sisa Stok Dibuang:</span>
                      <strong className="text-red-400 font-mono">
                        {layerToDeplete.remainingQuantity} {ing?.baseUnit}
                      </strong>
                    </div>
                    <div className="flex justify-between border-t border-stone-800 pt-1.5">
                      <span className="text-stone-300 font-bold">Total Kerugian (Waste Cost):</span>
                      <strong className="text-red-400 font-mono text-sm">
                        {formatIDR(wasteCost)}
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-400">
                    Sisa kuantitas batch ini akan di-nolkan dan statusnya diubah menjadi <strong>Habis (Depleted)</strong>. Biaya sisa perolehan senilai {formatIDR(wasteCost)} akan otomatis dibukukan ke dalam pengeluaran beban operasional outlet.
                  </p>

                  <div>
                    <label className="text-stone-300 font-bold block mb-1">
                      Alasan Pembuangan / Habis:
                    </label>
                    <input
                      type="text"
                      value={depleteReason}
                      onChange={(e) => setDepleteReason(e.target.value)}
                      className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-red-500 text-xs"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setLayerToDeplete(null)}
                      className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isDepleting}
                      onClick={handleConfirmSetDepleted}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl cursor-pointer shadow-md shadow-red-600/20"
                    >
                      {isDepleting ? 'Memproses...' : 'Ya, Set Habis & Catat Waste'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
