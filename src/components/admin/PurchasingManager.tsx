import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Supplier, GoodsReceipt, Ingredient, GoodsReceiptItem } from '../../types';
import { formatIDR } from '../../lib/currency';
import { processGoodsReceipt } from '../../services/purchasingService';
import {
  Truck,
  Plus,
  PackageCheck,
  CheckCircle2,
  Building2,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Phone,
  User,
  MapPin,
  Mail,
  Calendar,
} from 'lucide-react';

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
      unitCost: 120,
      batchNumber: '',
      expiryDate: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Supplier Modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supCode, setSupCode] = useState<string>('');
  const [supName, setSupName] = useState<string>('');
  const [supContact, setSupContact] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supEmail, setSupEmail] = useState<string>('');
  const [supAddress, setSupAddress] = useState<string>('');

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
    if (ings.length > 0 && !items[0]?.ingredientId) {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      setItems([
        {
          ingredientId: ings[0].id,
          quantity: 1000,
          unit: ings[0].baseUnit,
          unitCost: 120,
          batchNumber: `LOT-${todayStr}-${Math.floor(10 + Math.random() * 90)}`,
          expiryDate: '',
        },
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddSupplierModal = () => {
    setEditingSupplier(null);
    const nextNum = suppliers.length + 1;
    setSupCode(`SUP-${nextNum < 10 ? '0' : ''}${nextNum}`);
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setIsSupplierModalOpen(true);
  };

  const openEditSupplierModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupCode(sup.code);
    setSupName(sup.name);
    setSupContact(sup.contactPerson || '');
    setSupPhone(sup.phone || '');
    setSupEmail(sup.email || '');
    setSupAddress(sup.address || '');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      alert('Nama pemasok wajib diisi.');
      return;
    }

    const supplierId = editingSupplier ? editingSupplier.id : `sup-${Date.now()}`;
    const newSup: Supplier = {
      id: supplierId,
      code: supCode.trim() || `SUP-${Date.now().toString().slice(-4)}`,
      name: supName.trim(),
      contactPerson: supContact.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim() || undefined,
      address: supAddress.trim(),
    };

    await db.suppliers.put(newSup);
    await db.auditLogs.add({
      id: `audit-sup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: editingSupplier ? 'UPDATE_SUPPLIER' : 'CREATE_SUPPLIER',
      entity: 'supplier',
      entityId: newSup.id,
      details: `${editingSupplier ? 'Memperbarui' : 'Mendaftarkan'} data pemasok: ${newSup.name} (${newSup.code})`,
    });

    setIsSupplierModalOpen(false);
    await loadData();
    setSelectedSupplierId(newSup.id);
    setSuccessMsg(`Pemasok "${newSup.name}" berhasil disimpan!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleDeleteSupplier = async (sup: Supplier) => {
    if (confirm(`Hapus pemasok "${sup.name}"? Data riwayat penerimaan sebelumnya tetap tersimpan.`)) {
      await db.suppliers.delete(sup.id);
      await loadData();
      if (selectedSupplierId === sup.id) {
        const remaining = suppliers.filter((s) => s.id !== sup.id);
        setSelectedSupplierId(remaining.length > 0 ? remaining[0].id : '');
      }
    }
  };

  const handleAddItemRow = () => {
    if (ingredients.length === 0) return;
    const defaultIng = ingredients[0];
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    setItems([
      ...items,
      {
        ingredientId: defaultIng.id,
        quantity: 1000,
        unit: defaultIng.baseUnit,
        unitCost: 100,
        batchNumber: `LOT-${todayStr}-${Math.floor(10 + Math.random() * 90)}`,
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
    setFormError(null);

    if (!selectedSupplierId) {
      setFormError('Silakan pilih pemasok terlebih dahulu. Jika belum ada, klik "+ Tambah Pemasok Baru".');
      return;
    }

    if (items.length === 0) {
      setFormError('Mohon tambahkan minimal 1 item barang yang diterima.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.ingredientId) {
        setFormError(`Baris #${i + 1}: Bahan baku belum dipilih.`);
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setFormError(`Baris #${i + 1}: Jumlah barang harus lebih besar dari 0.`);
        return;
      }
      if (item.unitCost < 0) {
        setFormError(`Baris #${i + 1}: Harga perolehan tidak boleh negatif.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const receipt = await processGoodsReceipt({
        supplierId: selectedSupplierId,
        items,
        notes: receiptNotes,
        receivedBy: 'Hirakada (Owner / Head Bar)',
      });

      setSuccessMsg(
        `Penerimaan Barang #${receipt.receiptNumber} senilai ${formatIDR(
          receipt.totalAmount
        )} berhasil diposting! FIFO Cost Layer telah aktif.`
      );
      setReceiptNotes('');
      await loadData();
      setActiveTab('receipts');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal memproses penerimaan barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalReceiptEstimation = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Truck size={22} className="text-[#b6d333]" />
            <span>Pembelian & Penerimaan Barang (Goods Receipt)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Pencatatan faktur barang masuk dari pemasok, registrasi batch LOT, dan pembentukan layer biaya FIFO otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAddSupplierModal}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-[#b6d333] border border-[#b6d333]/30 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Building2 size={15} />
            <span>+ Pemasok Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new-receipt')}
            className="px-3.5 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#b6d333]/20 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Terima Barang Baru</span>
          </button>
        </div>
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
              ? 'border-[#b6d333] text-[#b6d333]'
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
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Form Penerimaan Barang Masuk
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Daftar Pemasok ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: RECEIPTS HISTORY */}
      {activeTab === 'receipts' && (
        <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
          {receipts.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <PackageCheck size={36} className="text-stone-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Belum Ada Riwayat Penerimaan Barang</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Catat penerimaan stok bahan baku dari supplier untuk mengaktifkan pelacakan FIFO dan biaya pokok minuman secara presisi.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('new-receipt')}
                className="mt-2 px-4 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>Input Penerimaan Pertama</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
                  <tr>
                    <th className="p-3">No. Penerimaan</th>
                    <th className="p-3">Waktu Masuk</th>
                    <th className="p-3">Pemasok</th>
                    <th className="p-3">Item Diterima & Batch FIFO</th>
                    <th className="p-3 text-right">Total Pembelian</th>
                    <th className="p-3">Penerima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-stone-300">
                  {receipts.map((rcpt) => (
                    <tr key={rcpt.id} className="hover:bg-stone-800/40">
                      <td className="p-3 font-mono font-bold text-[#b6d333]">
                        {rcpt.receiptNumber}
                      </td>
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
                              • <span className="font-semibold text-stone-100">{ing?.name || 'Bahan'}</span>:{' '}
                              {i.quantity.toLocaleString('id-ID')} {i.unit} @ {formatIDR(i.unitCost)} (Batch:{' '}
                              <span className="font-mono text-[#b6d333]">{i.batchNumber}</span>)
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
          )}
        </div>
      )}

      {/* TAB 2: NEW GOODS RECEIPT FORM */}
      {activeTab === 'new-receipt' && (
        <form
          onSubmit={handleSubmitReceipt}
          className="bg-[#232529] border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5 max-w-3xl"
        >
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PackageCheck size={18} className="text-[#b6d333]" />
              <span>Input Faktur & Penerimaan Barang Masuk (FIFO Cost Layer)</span>
            </h2>
            <span className="text-[11px] text-stone-400 font-mono">
              Total: <span className="font-bold text-emerald-400">{formatIDR(totalReceiptEstimation)}</span>
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Supplier Selection Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-stone-300 font-bold flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#b6d333]" />
                  <span>Pilih Pemasok (Supplier) *</span>
                </label>
                <button
                  type="button"
                  onClick={openAddSupplierModal}
                  className="text-[11px] font-bold text-[#b6d333] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>+ Pemasok Baru</span>
                </button>
              </div>

              {suppliers.length === 0 ? (
                <div className="p-3 bg-[#1a1b1e] border border-amber-600/40 rounded-xl space-y-2">
                  <p className="text-[11px] text-amber-300">
                    Belum ada data pemasok. Anda harus mendaftarkan pemasok sebelum memproses barang masuk.
                  </p>
                  <button
                    type="button"
                    onClick={openAddSupplierModal}
                    className="w-full py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    + Buat Pemasok Sekarang
                  </button>
                </div>
              ) : (
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                  required
                >
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name} ({sup.code}) {sup.contactPerson ? `- CP: ${sup.contactPerson}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-stone-300 font-bold block mb-1">
                Catatan / No. Surat Jalan / Faktur
              </label>
              <input
                type="text"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Contoh: Faktur SJ-2026-889 via Kurir"
                className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
              />
            </div>
          </div>

          {/* Items breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-t border-stone-800 pt-3">
              <label className="text-xs font-bold text-stone-200">
                Daftar Bahan Baku Masuk & Penetapan Harga Perolehan (HPP FIFO)
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-[#b6d333] hover:text-[#c7e63b] flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Baris Bahan</span>
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="p-4 bg-[#1a1b1e] border border-stone-800 rounded-xl text-center space-y-2">
                <p className="text-xs text-amber-300">
                  Belum ada bahan baku di inventaris. Silakan buat bahan baku terlebih dahulu di modul "Bahan Baku".
                </p>
              </div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#1a1b1e] border border-stone-800 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs items-end"
                >
                  <div className="sm:col-span-4">
                    <span className="text-[10px] text-stone-400 block mb-0.5">Bahan Baku / Kemasan</span>
                    <select
                      value={item.ingredientId}
                      onChange={(e) => handleUpdateItem(idx, 'ingredientId', e.target.value)}
                      className="w-full bg-[#232529] border border-stone-700 text-white rounded-lg p-2 focus:outline-none focus:border-[#b6d333]"
                    >
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.baseUnit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-stone-400 block mb-0.5">Jumlah ({item.unit})</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-full bg-[#232529] border border-stone-700 text-white rounded-lg p-2 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <span className="text-[10px] text-stone-400 block mb-0.5">
                      Harga Satuan (Rp/{item.unit})
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={item.unitCost || ''}
                      onChange={(e) => handleUpdateItem(idx, 'unitCost', Number(e.target.value))}
                      className="w-full bg-[#232529] border border-stone-700 text-white rounded-lg p-2 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-stone-400 block mb-0.5">No. Batch / Lot</span>
                    <input
                      type="text"
                      value={item.batchNumber}
                      onChange={(e) => handleUpdateItem(idx, 'batchNumber', e.target.value)}
                      placeholder="LOT-..."
                      className="w-full bg-[#232529] border border-stone-700 text-white rounded-lg p-2 text-[11px] font-mono focus:outline-none focus:border-[#b6d333]"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-center justify-center">
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-stone-500 hover:text-red-400 p-2 cursor-pointer transition-colors"
                        title="Hapus baris"
                      >
                        ✕
                      </button>
                    ) : (
                      <div className="w-6" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || suppliers.length === 0 || ingredients.length === 0}
            className="w-full bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black py-3 rounded-xl text-xs transition-colors cursor-pointer mt-4 shadow-lg shadow-[#b6d333]/15"
          >
            {isSubmitting
              ? 'Memproses FIFO Cost Layers...'
              : `Posting Penerimaan Barang (${formatIDR(totalReceiptEstimation)})`}
          </button>
        </form>
      )}

      {/* TAB 3: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#232529] border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-xs text-stone-300 font-bold">
              Total Terdaftar: {suppliers.length} Pemasok
            </span>
            <button
              type="button"
              onClick={openAddSupplierModal}
              className="px-3.5 py-1.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#b6d333]/15"
            >
              <Plus size={14} />
              <span>Tambah Pemasok Baru</span>
            </button>
          </div>

          {suppliers.length === 0 ? (
            <div className="p-8 bg-[#232529] border border-stone-800 rounded-2xl text-center space-y-3">
              <Building2 size={36} className="text-stone-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Belum Ada Pemasok Terdaftar</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Daftarkan supplier kopi, susu, sirup, teh, atau cup kemasan Anda agar riwayat pembelian tercatat rapi.
              </p>
              <button
                type="button"
                onClick={openAddSupplierModal}
                className="mt-2 px-4 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Daftarkan Pemasok Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="p-4 bg-[#232529] border border-stone-800 rounded-2xl space-y-2.5 text-xs hover:border-stone-700 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{sup.name}</span>
                      <span className="text-[10px] bg-stone-900 text-[#b6d333] border border-[#b6d333]/30 px-2 py-0.5 rounded font-mono font-bold">
                        {sup.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditSupplierModal(sup)}
                        className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg cursor-pointer transition-colors"
                        title="Edit Pemasok"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(sup)}
                        className="p-1.5 hover:bg-red-950/40 text-stone-500 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                        title="Hapus Pemasok"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-stone-400 text-[11px]">
                    {sup.contactPerson && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-stone-500" />
                        <span>Kontak Person: <strong className="text-stone-300">{sup.contactPerson}</strong></span>
                      </div>
                    )}
                    {sup.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-stone-500" />
                        <span>Telepon: <span className="font-mono text-stone-300">{sup.phone}</span></span>
                      </div>
                    )}
                    {sup.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-stone-500" />
                        <span>Email: <span className="text-stone-300">{sup.email}</span></span>
                      </div>
                    )}
                    {sup.address && (
                      <div className="flex items-start gap-1.5 pt-0.5">
                        <MapPin size={12} className="text-stone-500 mt-0.5 shrink-0" />
                        <span className="text-stone-400">{sup.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUPPLIER MODAL (ADD / EDIT) */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#232529] border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Building2 size={18} className="text-[#b6d333]" />
                <span>{editingSupplier ? 'Edit Data Pemasok' : 'Tambah Pemasok Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Kode *</label>
                  <input
                    type="text"
                    value={supCode}
                    onChange={(e) => setSupCode(e.target.value)}
                    placeholder="SUP-01"
                    className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono focus:outline-none focus:border-[#b6d333]"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-stone-300 font-bold block mb-1">Nama Pemasok / Distributor *</label>
                  <input
                    type="text"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="Contoh: PT Roastery Nusantara"
                    className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Contact Person (PIC)</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Contoh: Budi Susanto"
                    className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">No. Telp / WhatsApp</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Email (Opsional)</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="order@supplier.com"
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Alamat / Lokasi Gudang</label>
                <textarea
                  rows={2}
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Jl. Raya Pergudangan No..."
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black rounded-xl cursor-pointer shadow-md shadow-[#b6d333]/20"
                >
                  {editingSupplier ? 'Simpan Perubahan' : 'Daftarkan Pemasok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
