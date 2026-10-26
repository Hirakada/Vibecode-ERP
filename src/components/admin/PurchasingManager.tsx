import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Supplier, GoodsReceipt, Ingredient, GoodsReceiptItem } from '../../types';
import { formatIDR } from '../../lib/currency';
import { processGoodsReceipt } from '../../services/purchasingService';
import { Truck, Plus, PackageCheck, History, CheckCircle2 } from 'lucide-react';

export const PurchasingManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'receipts' | 'new-receipt' | 'suppliers'>('receipts');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // New Goods Receipt form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [items, setItems] = useState<GoodsReceiptItem[]>([
    {
      ingredientId: '',
      quantity: 1000,
      unit: 'g',
      unitCost: 130,
      batchNumber: '',
      expiryDate: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    const sups = await db.suppliers.toArray();
    setSuppliers(sups);
    if (sups.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(sups[0].id);
    }

    const rcpts = await db.goodsReceipts.orderBy('receivedAt').reverse().toArray();
    setReceipts(rcpts);

    const ings = await db.ingredients.toArray();
    setIngredients(ings);
    if (ings.length > 0 && !items[0].ingredientId) {
      setItems([
        {
          ingredientId: ings[0].id,
          quantity: 1000,
          unit: ings[0].baseUnit,
          unitCost: 120,
          batchNumber: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`,
          expiryDate: '',
        },
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemRow = () => {
    if (ingredients.length === 0) return;
    const defaultIng = ingredients[0];
    setItems([
      ...items,
      {
        ingredientId: defaultIng.id,
        quantity: 1000,
        unit: defaultIng.baseUnit,
        unitCost: 100,
        batchNumber: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`,
        expiryDate: '',
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof GoodsReceiptItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'ingredientId') {
      const matchedIng = ingredients.find((i) => i.id === value);
      if (matchedIng) {
        updated[index].unit = matchedIng.baseUnit;
      }
    }
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || items.length === 0) return;

    setIsSubmitting(true);
    try {
      const receipt = await processGoodsReceipt({
        supplierId: selectedSupplierId,
        items,
        notes: receiptNotes,
        receivedBy: 'Staf Penerimaan Gudang',
      });

      setSuccessMsg(`Penerimaan Barang #${receipt.receiptNumber} berhasil diposting. FIFO Cost Layer telah dibuat!`);
      await loadData();
      setActiveTab('receipts');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses penerimaan barang');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Truck size={22} className="text-amber-400" />
            <span>Pembelian & Penerimaan Barang (Goods Receipt)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Penerimaan barang fisik dari pemasok yang memvalidasi perolehan dan menciptakan layer biaya FIFO baru.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('new-receipt')}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
        >
          <Plus size={16} />
          <span>Terima Barang Baru</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-800 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'receipts'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Riwayat Penerimaan ({receipts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('new-receipt')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'new-receipt'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Form Penerimaan Barang Baru
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Daftar Pemasok ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: RECEIPTS HISTORY */}
      {activeTab === 'receipts' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-3">No. Penerimaan</th>
                  <th className="p-3">Waktu Diterima</th>
                  <th className="p-3">Pemasok</th>
                  <th className="p-3">Item Diterima</th>
                  <th className="p-3 text-right">Total Pembelian</th>
                  <th className="p-3">Penerima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {receipts.map((rcpt) => (
                  <tr key={rcpt.id} className="hover:bg-stone-800/40">
                    <td className="p-3 font-mono font-bold text-amber-400">{rcpt.receiptNumber}</td>
                    <td className="p-3 text-stone-400">
                      {new Date(rcpt.receivedAt).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3 font-semibold text-white">{rcpt.supplierName}</td>
                    <td className="p-3">
                      {rcpt.items.map((i, idx) => {
                        const ing = ingredients.find((ing) => ing.id === i.ingredientId);
                        return (
                          <div key={idx} className="text-[11px] text-stone-300">
                            • {ing?.name || 'Bahan'}: {i.quantity} {i.unit} @ {formatIDR(i.unitCost)} (Batch: {i.batchNumber})
                          </div>
                        );
                      })}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      {formatIDR(rcpt.totalAmount)}
                    </td>
                    <td className="p-3 text-stone-400">{rcpt.receivedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NEW GOODS RECEIPT FORM */}
      {activeTab === 'new-receipt' && (
        <form onSubmit={handleSubmitReceipt} className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 max-w-3xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <PackageCheck size={18} className="text-amber-400" />
            <span>Posting Penerimaan Barang (Goods Receipt Entry)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-stone-300 font-bold block mb-1">Pilih Pemasok (Supplier)</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                required
              >
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-stone-300 font-bold block mb-1">Catatan / No. Surat Jalan</label>
              <input
                type="text"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Contoh: SJ-2026-991 dari supir"
                className="w-full bg-stone-800 border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Items breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-200">Daftar Barang & Harga Perolehan (FIFO Layer)</label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Tambah Baris</span>
              </button>
            </div>

            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-stone-800/40 border border-stone-800 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs items-end"
              >
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-stone-400 block mb-0.5">Bahan Baku / Kemasan</span>
                  <select
                    value={item.ingredientId}
                    onChange={(e) => handleUpdateItem(idx, 'ingredientId', e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2 focus:outline-none"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.baseUnit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">Jumlah ({item.unit})</span>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity || ''}
                    onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-stone-400 block mb-0.5">Harga / Unit (Rp)</span>
                  <input
                    type="number"
                    min="1"
                    value={item.unitCost || ''}
                    onChange={(e) => handleUpdateItem(idx, 'unitCost', Number(e.target.value))}
                    className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-stone-400 block mb-0.5">No. Batch / Lot</span>
                    <input
                      type="text"
                      value={item.batchNumber}
                      onChange={(e) => handleUpdateItem(idx, 'batchNumber', e.target.value)}
                      placeholder="LOT-..."
                      className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg p-2 text-[11px]"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-stone-500 hover:text-red-400 p-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold py-3.5 rounded-xl text-xs transition-colors cursor-pointer mt-4"
          >
            {isSubmitting ? 'Memproses FIFO Layers...' : 'Posting Penerimaan Barang & Tambah Stok'}
          </button>
        </form>
      )}

      {/* TAB 3: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{sup.name}</span>
                <span className="text-[10px] bg-stone-800 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                  {sup.code}
                </span>
              </div>
              <p className="text-stone-400">Kontak: {sup.contactPerson} ({sup.phone})</p>
              <p className="text-stone-500 text-[11px]">{sup.address}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
