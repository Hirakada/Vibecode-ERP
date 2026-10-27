import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import {
  Supplier,
  GoodsReceipt,
  Ingredient,
  GoodsReceiptItem,
  PurchaseOrder,
  PurchaseOrderItem,
  AuditLog,
} from '../../types';
import { formatIDR } from '../../lib/currency';
import {
  createPurchaseOrder,
  confirmGoodsArrivalAndStock,
  cancelPurchaseOrder,
} from '../../services/purchasingService';
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
  Clock,
  Shield,
  FileText,
  Eye,
  Percent,
  Layers,
  ArrowRight,
  Info,
  Check,
  Ban,
} from 'lucide-react';

interface PurchaseFormItemState {
  ingredientId: string;
  packQty: number; // e.g. 2 pcs
  contentPerPack: number; // e.g. 488 g/ml per pcs
  pricePerPack: number; // e.g. 12000 Rp per pcs
  itemDiscountType: 'flat' | 'percent';
  itemDiscountValue: number;
  batchNumber: string;
  expiryDate?: string;
}

export const PurchasingManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'receipts' | 'new-po' | 'audit' | 'suppliers'>('orders');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseLogs, setPurchaseLogs] = useState<AuditLog[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Filter state for POs
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'arrived' | 'cancelled'>('all');

  // Form State: New PO
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [receiveMode, setReceiveMode] = useState<'waiting' | 'instant'>('waiting');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [formItems, setFormItems] = useState<PurchaseFormItemState[]>([
    {
      ingredientId: '',
      packQty: 2,
      contentPerPack: 488,
      pricePerPack: 12000,
      itemDiscountType: 'flat',
      itemDiscountValue: 0,
      batchNumber: '',
      expiryDate: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Physical Arrival Inspection Modal state
  const [inspectingOrder, setInspectingOrder] = useState<PurchaseOrder | null>(null);
  const [arrivalItems, setArrivalItems] = useState<
    {
      ingredientId: string;
      ingredientName: string;
      unit: string;
      plannedStock: number;
      quantityReceived: number;
      batchNumber: string;
      expiryDate: string;
    }[]
  >([]);
  const [receiverName, setReceiverName] = useState<string>('Hirakada (Owner / Head Bar)');
  const [inspectionNotes, setInspectionNotes] = useState<string>('');
  const [isConfirmingArrival, setIsConfirmingArrival] = useState<boolean>(false);

  // PO Detail Modal state
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [orderSpecificLogs, setOrderSpecificLogs] = useState<AuditLog[]>([]);

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

    const pos = await db.purchaseOrders.orderBy('orderDate').reverse().toArray();
    setOrders(pos);

    const rcpts = await db.goodsReceipts.orderBy('receivedAt').reverse().toArray();
    setReceipts(rcpts);

    const ings = await db.ingredients.toArray();
    setIngredients(ings);

    const allLogs = await db.auditLogs.orderBy('timestamp').reverse().toArray();
    const pLogs = allLogs.filter(
      (l) =>
        l.entity === 'purchases' ||
        l.entity === 'supplier' ||
        l.action.startsWith('PURCHASE_') ||
        l.action.startsWith('GOODS_RECEIPT_') ||
        l.action.includes('SUPPLIER')
    );
    setPurchaseLogs(pLogs);

    if (ings.length > 0 && !formItems[0]?.ingredientId) {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      setFormItems([
        {
          ingredientId: ings[0].id,
          packQty: 2,
          contentPerPack: 488,
          pricePerPack: 12000,
          itemDiscountType: 'flat',
          itemDiscountValue: 0,
          batchNumber: `LOT-${todayStr}-${Math.floor(10 + Math.random() * 90)}`,
          expiryDate: '',
        },
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Physical Inspection Modal
  const openArrivalInspectionModal = (po: PurchaseOrder) => {
    setInspectingOrder(po);
    setReceiverName('Hirakada (Owner / Head Bar)');
    setInspectionNotes('Fisik barang telah dicek: kemasan utuh, segel baik, isi sesuai faktur.');
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const initialRows = po.items.map((item, idx) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      return {
        ingredientId: item.ingredientId,
        ingredientName: ing?.name || item.ingredientName || 'Bahan Baku',
        unit: item.unit,
        plannedStock: item.totalStockPlanned,
        quantityReceived: item.quantityReceived || item.totalStockPlanned,
        batchNumber: item.batchNumber || `LOT-${todayStr}-${Math.floor(10 + Math.random() * 90)}`,
        expiryDate: item.expiryDate || '',
      };
    });

    setArrivalItems(initialRows);
  };

  const handleConfirmArrivalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingOrder) return;

    setIsConfirmingArrival(true);
    try {
      const result = await confirmGoodsArrivalAndStock({
        purchaseOrderId: inspectingOrder.id,
        receivedBy: receiverName.trim() || 'Hirakada (Owner)',
        notes: inspectionNotes.trim() || 'Verifikasi fisik selesai dan disetujui',
        verifiedItems: arrivalItems.map((row) => ({
          ingredientId: row.ingredientId,
          quantityReceived: Number(row.quantityReceived) || 1,
          batchNumber: row.batchNumber.trim(),
          expiryDate: row.expiryDate ? row.expiryDate.trim() : undefined,
        })),
      });

      setSuccessMsg(
        `Barang PO #${inspectingOrder.poNumber} berhasil diverifikasi & tiba fisik! No Penerimaan: ${result.goodsReceipt.receiptNumber}. Stok telah diupdate ke Layer FIFO.`
      );
      setInspectingOrder(null);
      await loadData();
      setActiveTab('receipts');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses kedatangan fisik barang.');
    } finally {
      setIsConfirmingArrival(false);
    }
  };

  const handleCancelOrder = async (po: PurchaseOrder) => {
    if (
      !confirm(
        `Batalkan transaksi pembelian PO #${po.poNumber} (${formatIDR(po.grandTotal)})?\nStatus akan diubah menjadi 'cancelled'.`
      )
    ) {
      return;
    }

    try {
      await cancelPurchaseOrder(po.id, 'Hirakada (Owner)');
      setSuccessMsg(`PO #${po.poNumber} berhasil dibatalkan.`);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan PO.');
    }
  };

  const openViewOrderModal = async (po: PurchaseOrder) => {
    setViewingOrder(po);
    const logs = await db.auditLogs
      .where('entityId')
      .equals(po.id)
      .reverse()
      .sortBy('timestamp');
    setOrderSpecificLogs(logs);
  };

  // Add Item in New PO Form
  const handleAddFormItem = () => {
    if (ingredients.length === 0) return;
    const defaultIng = ingredients[0];
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    setFormItems([
      ...formItems,
      {
        ingredientId: defaultIng.id,
        packQty: 1,
        contentPerPack: 1000,
        pricePerPack: 50000,
        itemDiscountType: 'flat',
        itemDiscountValue: 0,
        batchNumber: `LOT-${todayStr}-${Math.floor(10 + Math.random() * 90)}`,
        expiryDate: '',
      },
    ]);
  };

  const handleUpdateFormItem = (index: number, field: keyof PurchaseFormItemState, value: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const handleRemoveFormItem = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Calculate live PO financials
  const calculatedItems = formItems.map((item) => {
    const rawTotal = (item.packQty || 0) * (item.pricePerPack || 0);
    let itemDisc = 0;
    if (item.itemDiscountType === 'percent') {
      itemDisc = Math.round((rawTotal * (item.itemDiscountValue || 0)) / 100);
    } else {
      itemDisc = Math.min(rawTotal, Number(item.itemDiscountValue) || 0);
    }
    const netTotal = Math.max(0, rawTotal - itemDisc);
    const totalStock = (item.packQty || 0) * (item.contentPerPack || 0);
    const estHppPerUnit = totalStock > 0 ? netTotal / totalStock : 0;

    return {
      rawTotal,
      itemDisc,
      netTotal,
      totalStock,
      estHppPerUnit,
    };
  });

  const rawSubtotal = calculatedItems.reduce((acc, curr) => acc + curr.rawTotal, 0);
  const totalItemDiscounts = calculatedItems.reduce((acc, curr) => acc + curr.itemDisc, 0);
  const totalNetItems = Math.max(0, rawSubtotal - totalItemDiscounts);
  const grandTotal = Math.max(
    0,
    totalNetItems - (Number(orderDiscount) || 0) + (Number(deliveryFee) || 0) + (Number(serviceFee) || 0)
  );

  const handleSubmitNewPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSupplierId) {
      setFormError('Silakan pilih pemasok terlebih dahulu.');
      return;
    }

    if (formItems.length === 0) {
      setFormError('Mohon masukkan minimal 1 baris bahan baku.');
      return;
    }

    for (let i = 0; i < formItems.length; i++) {
      const it = formItems[i];
      if (!it.ingredientId) {
        setFormError(`Baris #${i + 1}: Bahan baku belum dipilih.`);
        return;
      }
      if (!it.packQty || it.packQty <= 0) {
        setFormError(`Baris #${i + 1}: Jumlah kemasan/pcs harus lebih besar dari 0.`);
        return;
      }
      if (!it.contentPerPack || it.contentPerPack <= 0) {
        setFormError(`Baris #${i + 1}: Isi per kemasan harus lebih besar dari 0.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const itemsToSubmit: PurchaseOrderItem[] = formItems.map((item, idx) => {
        const ing = ingredients.find((i) => i.id === item.ingredientId);
        const calc = calculatedItems[idx];
        return {
          ingredientId: item.ingredientId,
          ingredientName: ing?.name || 'Bahan',
          unit: ing ? ing.baseUnit : 'pcs',
          packQty: Number(item.packQty),
          contentPerPack: Number(item.contentPerPack),
          pricePerPack: Number(item.pricePerPack),
          totalStockPlanned: calc.totalStock,
          itemRawTotal: calc.rawTotal,
          itemDiscount: calc.itemDisc,
          itemDiscountInfo: {
            type: item.itemDiscountType,
            value: item.itemDiscountValue,
          },
          itemNetTotal: calc.netTotal,
          batchNumber: item.batchNumber.trim(),
          expiryDate: item.expiryDate?.trim() || undefined,
        };
      });

      const po = await createPurchaseOrder({
        supplierId: selectedSupplierId,
        items: itemsToSubmit,
        orderDiscount: Number(orderDiscount) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        serviceFee: Number(serviceFee) || 0,
        notes: orderNotes.trim() || undefined,
        orderedBy: 'Hirakada (Owner / Barista)',
        instantReceive: receiveMode === 'instant',
      });

      if (receiveMode === 'instant') {
        setSuccessMsg(
          `Pembelian #${po.poNumber} senilai ${formatIDR(
            po.grandTotal
          )} berhasil dicatat & barang LANGSUNG DITERIMA. Stok FIFO aktif!`
        );
        setActiveTab('receipts');
      } else {
        setSuccessMsg(
          `Pesanan Pembelian #${po.poNumber} berhasil dibuat dengan status "Menunggu Kedatangan (waiting)". Stok BELUM bertambah sampai fisik tiba & diverifikasi.`
        );
        setActiveTab('orders');
      }

      setOrderNotes('');
      setDeliveryFee(0);
      setServiceFee(0);
      setOrderDiscount(0);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi pembelian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supplier modal handlers
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
    if (confirm(`Hapus pemasok "${sup.name}"? Data riwayat transaksi sebelumnya tetap tersimpan.`)) {
      await db.suppliers.delete(sup.id);
      await loadData();
      if (selectedSupplierId === sup.id) {
        const remaining = suppliers.filter((s) => s.id !== sup.id);
        setSelectedSupplierId(remaining.length > 0 ? remaining[0].id : '');
      }
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Truck size={22} className="text-[#b6d333]" />
            <span>Manajemen Pembelian & Penerimaan Barang</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Siklus procurement terverifikasi: Pesan (waiting) → Verifikasi fisik tiba (arrived) → FIFO Cost Layer & Update Stok.
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
            onClick={() => setActiveTab('new-po')}
            className="px-3.5 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#b6d333]/20 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Buat Pembelian (PO)</span>
          </button>
        </div>
      </div>

      {/* Capex Separation Disclaimer Banner */}
      <div className="bg-[#1f2228] border border-amber-600/30 rounded-2xl p-3.5 flex items-start gap-3">
        <Info size={18} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-stone-300">
          <span className="font-bold text-amber-300">Pemisahan Biaya & Aset Tetap: </span>
          Modul ini khusus untuk <strong>Bahan Baku & Kemasan Konsumsi (COGS / HPP)</strong>. Untuk pembelian aset tetap
          seperti mesin espresso, kulkas, grinder, atau renovasi ruko, gunakan modul{' '}
          <strong className="text-white bg-stone-800 px-1.5 py-0.5 rounded font-mono">Aset & Capex</strong> agar tercatat
          sebagai nilai buku aset dan penyusutan berkala, bukan biaya habis pakai.
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-800 gap-4 text-xs font-bold overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'orders'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Daftar Pembelian (PO) ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`pb-2.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'receipts'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Riwayat Penerimaan Fisik ({receipts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('new-po')}
          className={`pb-2.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'new-po'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          + Form Pembelian Baru
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Audit Transaksi Pembelian ({purchaseLogs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`pb-2.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'suppliers'
              ? 'border-[#b6d333] text-[#b6d333]'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Daftar Pemasok ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Status Filter Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400 font-bold mr-1">Filter Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#b6d333] text-stone-950 font-black'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              Semua ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('waiting')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'waiting'
                  ? 'bg-amber-500 text-stone-950 font-black'
                  : 'bg-amber-950/40 text-amber-400 border border-amber-800/40 hover:bg-amber-900/40'
              }`}
            >
              <Clock size={12} />
              <span>Menunggu Kedatangan ({orders.filter((o) => o.status === 'waiting').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('arrived')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'arrived'
                  ? 'bg-emerald-500 text-stone-950 font-black'
                  : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/40'
              }`}
            >
              <CheckCircle2 size={12} />
              <span>Diterima & Tiba ({orders.filter((o) => o.status === 'arrived').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'cancelled'
                  ? 'bg-stone-600 text-white font-black'
                  : 'bg-stone-900 text-stone-500 border border-stone-800 hover:bg-stone-800'
              }`}
            >
              <Ban size={12} />
              <span>Dibatalkan ({orders.filter((o) => o.status === 'cancelled').length})</span>
            </button>
          </div>

          <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Truck size={36} className="text-stone-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">Tidak Ada Transaksi Pembelian</h3>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  {statusFilter === 'all'
                    ? 'Belum ada pembelian bahan baku yang dibuat. Mulai dengan membuat Purchase Order baru.'
                    : `Tidak ada pesanan pembelian dengan filter status "${statusFilter}".`}
                </p>
                {statusFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('new-po')}
                    className="mt-2 px-4 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>+ Buat Pembelian Sekarang</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1a1b1e] text-stone-400 uppercase font-semibold border-b border-stone-800">
                    <tr>
                      <th className="p-3">No. PO & Tanggal</th>
                      <th className="p-3">Pemasok</th>
                      <th className="p-3">Status Alur</th>
                      <th className="p-3">Rincian Item Dipesan</th>
                      <th className="p-3 text-right">Rincian Biaya & Total</th>
                      <th className="p-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 text-stone-300">
                    {filteredOrders.map((po) => {
                      return (
                        <tr key={po.id} className="hover:bg-stone-800/40">
                          <td className="p-3">
                            <span className="font-mono font-bold text-[#b6d333] block">{po.poNumber}</span>
                            <span className="text-[10px] text-stone-400">
                              {new Date(po.orderDate).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="block text-[10px] text-stone-500 mt-0.5">Oleh: {po.orderedBy}</span>
                          </td>
                          <td className="p-3 font-semibold text-white">
                            <div>{po.supplierName}</div>
                            {po.notes && (
                              <div className="text-[10px] text-stone-400 italic max-w-xs truncate mt-0.5">
                                "{po.notes}"
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {po.status === 'waiting' && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <Clock size={11} />
                                  <span>Menunggu Kedatangan</span>
                                </span>
                                <span className="block text-[10px] text-amber-300/80 italic">
                                  ⏳ Stok belum bertambah
                                </span>
                              </div>
                            )}
                            {po.status === 'arrived' && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 size={11} />
                                  <span>Diterima & Tiba</span>
                                </span>
                                <span className="block text-[10px] text-stone-400 font-mono">
                                  {po.receiptNumber || 'GR Aktif'}
                                </span>
                              </div>
                            )}
                            {po.status === 'cancelled' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-800 text-stone-400 border border-stone-700">
                                <Ban size={11} />
                                <span>Dibatalkan</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {po.items.map((it, idx) => (
                                <div key={idx} className="text-[11px] text-stone-300">
                                  • <strong className="text-stone-100">{it.ingredientName || 'Bahan'}</strong>:{' '}
                                  <span className="font-mono">
                                    {it.packQty} pcs x {it.contentPerPack} {it.unit} (
                                    {it.totalStockPlanned.toLocaleString('id-ID')} {it.unit})
                                  </span>{' '}
                                  - Net: {formatIDR(it.itemNetTotal)}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="text-[11px] space-y-0.5">
                              <div className="text-stone-400">Subtotal: {formatIDR(po.rawSubtotal)}</div>
                              {po.itemDiscountTotal > 0 && (
                                <div className="text-amber-400">Disc Item: -{formatIDR(po.itemDiscountTotal)}</div>
                              )}
                              {po.orderDiscount > 0 && (
                                <div className="text-amber-400">Disc Faktur: -{formatIDR(po.orderDiscount)}</div>
                              )}
                              {po.deliveryFee > 0 && (
                                <div className="text-cyan-400">Ongkir: +{formatIDR(po.deliveryFee)}</div>
                              )}
                              {po.serviceFee > 0 && (
                                <div className="text-purple-400">Admin: +{formatIDR(po.serviceFee)}</div>
                              )}
                              <div className="font-mono font-black text-sm text-emerald-400 pt-1 border-t border-stone-800">
                                {formatIDR(po.grandTotal)}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1.5 items-center justify-center min-w-[140px]">
                              {po.status === 'waiting' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openArrivalInspectionModal(po)}
                                    className="w-full px-3 py-1.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-[#b6d333]/20 cursor-pointer transition-colors"
                                  >
                                    <PackageCheck size={14} />
                                    <span>Terima & Verifikasi</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelOrder(po)}
                                    className="text-[10px] text-stone-500 hover:text-red-400 underline cursor-pointer"
                                  >
                                    Batalkan PO
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => openViewOrderModal(po)}
                                className="w-full px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-[11px] rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Eye size={12} />
                                <span>Detail & Audit</span>
                              </button>
                            </div>
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

      {/* TAB 2: GOODS RECEIPTS HISTORY (Matches user screenshot image_d21c89b5.png) */}
      {activeTab === 'receipts' && (
        <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
          {receipts.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <PackageCheck size={36} className="text-stone-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Belum Ada Riwayat Penerimaan Fisik Barang</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Penerimaan barang fisik dari PO waiting yang telah tiba dan diverifikasi akan muncul di sini bersama nomor
                faktur & Cost Layer FIFO aktif.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('new-po')}
                className="mt-2 px-4 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>+ Buat Pembelian Baru</span>
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
                        <div>{rcpt.receiptNumber}</div>
                        {rcpt.poNumber && (
                          <div className="text-[10px] text-stone-500 font-mono">PO: {rcpt.poNumber}</div>
                        )}
                        {rcpt.verifiedPhysicalInspection && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded text-[9px] font-bold">
                            ✓ Fisik Terverifikasi
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-stone-400 whitespace-nowrap">
                        {new Date(rcpt.receivedAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-semibold text-white">
                        <div>{rcpt.supplierName}</div>
                        {rcpt.notes && <div className="text-[10px] text-stone-400 italic">"{rcpt.notes}"</div>}
                      </td>
                      <td className="p-3">
                        {rcpt.items.map((i, idx) => {
                          const ing = ingredients.find((ing) => ing.id === i.ingredientId);
                          return (
                            <div key={idx} className="text-[11px] text-stone-300">
                              • <span className="font-semibold text-stone-100">{ing?.name || 'Bahan'}</span>:{' '}
                              <span className="font-mono font-bold text-white">
                                {i.quantity.toLocaleString('id-ID')} {i.unit}
                              </span>{' '}
                              @ {formatIDR(i.unitCost)} (Batch:{' '}
                              <span className="font-mono text-[#b6d333] font-bold">{i.batchNumber}</span>
                              {i.expiryDate ? ` - Exp: ${i.expiryDate}` : ''})
                            </div>
                          );
                        })}
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-mono font-bold text-emerald-400 text-sm">
                          {formatIDR(rcpt.totalAmount)}
                        </div>
                        {(rcpt.deliveryFee || 0) > 0 && (
                          <div className="text-[10px] text-cyan-400">Ongkir: +{formatIDR(rcpt.deliveryFee || 0)}</div>
                        )}
                        {(rcpt.serviceFee || 0) > 0 && (
                          <div className="text-[10px] text-purple-400">Admin: +{formatIDR(rcpt.serviceFee || 0)}</div>
                        )}
                      </td>
                      <td className="p-3 text-stone-300">
                        <span className="font-medium">{rcpt.receivedBy}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FORM PEMBELIAN BARU (PO) */}
      {activeTab === 'new-po' && (
        <form
          onSubmit={handleSubmitNewPO}
          className="bg-[#232529] border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-6 max-w-4xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-3 gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck size={18} className="text-[#b6d333]" />
                <span>Buat Pesanan Pembelian Bahan Baku & Kemasan (Purchase Order)</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Rincian diskon per item, diskon belanja faktur, ongkir, dan admin fee dihitung secara akurat ke HPP unit FIFO.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-stone-400 font-mono block">Grand Total Pembelian:</span>
              <span className="text-base font-black text-emerald-400 font-mono">{formatIDR(grandTotal)}</span>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Mode Selector: Waiting vs Instant */}
          <div className="p-3.5 bg-[#1a1b1e] border border-stone-800 rounded-xl space-y-2">
            <span className="text-xs font-bold text-stone-200 block">Pilih Alur Pembelian:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors flex items-start gap-3 ${
                  receiveMode === 'waiting'
                    ? 'bg-[#232529] border-[#b6d333] text-white shadow-md shadow-[#b6d333]/10'
                    : 'bg-[#18191c] border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="receiveMode"
                  value="waiting"
                  checked={receiveMode === 'waiting'}
                  onChange={() => setReceiveMode('waiting')}
                  className="mt-0.5 accent-[#b6d333]"
                />
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-stone-200">
                    <Clock size={14} className="text-amber-400" />
                    <span>Pesan Dulu (Status: Waiting Arrival) - Direkomendasikan</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    PO dicatat untuk supplier. <strong>Stok BELUM bertambah</strong> sampai kurir tiba dan petugas melakukan
                    verifikasi fisik jumlah dan batch LOT.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors flex items-start gap-3 ${
                  receiveMode === 'instant'
                    ? 'bg-[#232529] border-[#b6d333] text-white shadow-md shadow-[#b6d333]/10'
                    : 'bg-[#18191c] border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <input
                  type="radio"
                  name="receiveMode"
                  value="instant"
                  checked={receiveMode === 'instant'}
                  onChange={() => setReceiveMode('instant')}
                  className="mt-0.5 accent-[#b6d333]"
                />
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-stone-200">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Beli & Terima Langsung (Instant Arrival)</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    Untuk pembelian tunai langsung bawa pulang (misal belanja di supermarket). Stok langsung masuk ke layer
                    FIFO saat disimpan.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Supplier and Order Notes */}
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
                    Belum ada data pemasok. Daftarkan pemasok terlebih dahulu.
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
                Catatan Pesanan / No. Surat Jalan / Faktur
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Contoh: Faktur SJ-2026-889 via Kurir Same Day"
                className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
              />
            </div>
          </div>

          {/* Items breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-t border-stone-800 pt-3">
              <label className="text-xs font-bold text-stone-200">
                Daftar Bahan Baku, Kemasan, & Diskon per Item
              </label>
              <button
                type="button"
                onClick={handleAddFormItem}
                className="text-xs font-bold text-[#b6d333] hover:text-[#c7e63b] flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Baris Bahan</span>
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="p-4 bg-[#1a1b1e] border border-stone-800 rounded-xl text-center space-y-2">
                <p className="text-xs text-amber-300">
                  Belum ada master bahan baku. Silakan daftarkan bahan baku di menu "Bahan Baku" terlebih dahulu.
                </p>
              </div>
            ) : (
              formItems.map((item, idx) => {
                const calc = calculatedItems[idx];
                const selectedIng = ingredients.find((i) => i.id === item.ingredientId);
                const unit = selectedIng?.baseUnit || 'pcs';

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#1a1b1e] border border-stone-800 rounded-xl space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-end">
                      {/* Bahan Baku */}
                      <div className="sm:col-span-3">
                        <span className="text-[10px] text-stone-400 block mb-0.5">Bahan Baku / Kemasan</span>
                        <select
                          value={item.ingredientId}
                          onChange={(e) => handleUpdateFormItem(idx, 'ingredientId', e.target.value)}
                          className="w-full bg-[#232529] border border-stone-700 text-white rounded-lg p-2 focus:outline-none focus:border-[#b6d333]"
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.baseUnit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Jumlah Pcs / Kemasan */}
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-stone-400 block mb-0.5">Jml Pcs / Box</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.packQty || ''}
                          onChange={(e) => handleUpdateFormItem(idx, 'packQty', Number(e.target.value))}
                          placeholder="2"
                          className="w-full bg-[#232529] border border-stone-700 text-white rounded-lg p-2 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
                        />
                      </div>

                      {/* Isi per Pcs (e.g. 488 g atau ml) */}
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-stone-400 block mb-0.5">
                          Isi / Pcs ({unit})
                        </span>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.contentPerPack || ''}
                          onChange={(e) => handleUpdateFormItem(idx, 'contentPerPack', Number(e.target.value))}
                          placeholder="488"
                          className="w-full bg-[#232529] border border-stone-700 text-white rounded-lg p-2 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
                        />
                      </div>

                      {/* Harga per Pcs */}
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-stone-400 block mb-0.5">
                          Harga / Pcs (Rp)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.pricePerPack || ''}
                          onChange={(e) => handleUpdateFormItem(idx, 'pricePerPack', Number(e.target.value))}
                          placeholder="12000"
                          className="w-full bg-[#232529] border border-stone-700 text-white rounded-lg p-2 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
                        />
                      </div>

                      {/* Diskon per Item */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-amber-400 font-bold">Diskon Item</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateFormItem(
                                idx,
                                'itemDiscountType',
                                item.itemDiscountType === 'flat' ? 'percent' : 'flat'
                              )
                            }
                            className="text-[9px] text-[#b6d333] hover:underline cursor-pointer"
                          >
                            {item.itemDiscountType === 'flat' ? 'Rp' : '%'}
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={item.itemDiscountValue || ''}
                          onChange={(e) =>
                            handleUpdateFormItem(idx, 'itemDiscountValue', Number(e.target.value))
                          }
                          placeholder={item.itemDiscountType === 'flat' ? '2000' : '10'}
                          className="w-full bg-[#232529] border border-amber-500/40 text-amber-300 rounded-lg p-2 font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Hapus baris */}
                      <div className="sm:col-span-1 flex items-center justify-center">
                        {formItems.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(idx)}
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

                    {/* Batch lot, expiration and item summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-800/80 text-[11px] items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500 text-[10px] whitespace-nowrap">No. Batch/LOT:</span>
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) => handleUpdateFormItem(idx, 'batchNumber', e.target.value)}
                          placeholder="LOT-..."
                          className="w-full bg-[#232529] border border-stone-700 text-white rounded px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-[#b6d333]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500 text-[10px] whitespace-nowrap">Expired:</span>
                        <input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={(e) => handleUpdateFormItem(idx, 'expiryDate', e.target.value)}
                          className="w-full bg-[#232529] border border-stone-700 text-white rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#b6d333]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 text-stone-300">
                        <span className="px-2 py-0.5 bg-stone-800 rounded text-stone-300 font-mono text-[10px]">
                          Masuk: <strong className="text-white">{calc.totalStock.toLocaleString('id-ID')} {unit}</strong>
                        </span>
                        <span className="px-2 py-0.5 bg-[#b6d333]/10 border border-[#b6d333]/30 rounded text-[#b6d333] font-mono text-[10px]">
                          Net: <strong>{formatIDR(calc.netTotal)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Delivery Fee, Service Fee, and Order Discount */}
          <div className="p-4 bg-[#1a1b1e] border border-stone-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-stone-200 block">
              Biaya Tambahan & Diskon Total Belanja (Faktur)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-stone-300 font-medium block mb-1">
                  Diskon Total Faktur / Belanja (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full bg-[#232529] border border-amber-500/40 text-amber-300 rounded-xl p-2 font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-stone-300 font-medium block mb-1">
                  Ongkos Kirim / Delivery Fee (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={deliveryFee || ''}
                  onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full bg-[#232529] border border-cyan-500/40 text-cyan-300 rounded-xl p-2 font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-stone-300 font-medium block mb-1">
                  Biaya Layanan / Admin Fee (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={serviceFee || ''}
                  onChange={(e) => setServiceFee(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full bg-[#232529] border border-purple-500/40 text-purple-300 rounded-xl p-2 font-mono font-bold focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          {/* Financial Breakdown Summary Box */}
          <div className="p-4 bg-[#18191c] border border-stone-800 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Subtotal Kotor Barang ({calculatedItems.length} item):</span>
              <span className="font-mono">{formatIDR(rawSubtotal)}</span>
            </div>
            {totalItemDiscounts > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Total Diskon per Item:</span>
                <span className="font-mono">-{formatIDR(totalItemDiscounts)}</span>
              </div>
            )}
            {orderDiscount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Diskon Faktur / Total Belanja:</span>
                <span className="font-mono">-{formatIDR(orderDiscount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-cyan-400">
                <span>Ongkos Kirim (Delivery Fee):</span>
                <span className="font-mono">+{formatIDR(deliveryFee)}</span>
              </div>
            )}
            {serviceFee > 0 && (
              <div className="flex justify-between text-purple-400">
                <span>Biaya Layanan / Admin Fee:</span>
                <span className="font-mono">+{formatIDR(serviceFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-stone-800">
              <span className="text-[#b6d333]">Grand Total yang Dibayarkan:</span>
              <span className="font-mono text-emerald-400 text-base">{formatIDR(grandTotal)}</span>
            </div>
            <div className="text-[10px] text-stone-500 italic pt-1">
              * Biaya ongkir & admin serta diskon belanja akan dialokasikan secara proporsional ke HPP unit layer FIFO tiap bahan saat diverifikasi tiba.
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || suppliers.length === 0 || ingredients.length === 0}
            className="w-full bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black py-3 rounded-xl text-xs transition-colors cursor-pointer mt-4 shadow-lg shadow-[#b6d333]/15 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Menyimpan Pesanan...</span>
            ) : receiveMode === 'waiting' ? (
              <>
                <Clock size={16} />
                <span>Simpan Pesanan Pembelian (Status: Waiting Arrival)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Posting Pembelian & Penerimaan Barang ({formatIDR(grandTotal)})</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 4: AUDIT TRANSAKSI PEMBELIAN */}
      {activeTab === 'audit' && (
        <div className="bg-[#232529] border border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-3.5 bg-[#1a1b1e] border-b border-stone-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Shield size={15} className="text-amber-400" />
              <span>Audit Log Khusus Pengadaan & Pembelian Bahan</span>
            </span>
            <span className="text-[11px] text-stone-400 font-mono">
              Total Log: {purchaseLogs.length} kejadian
            </span>
          </div>

          {purchaseLogs.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              Belum ada riwayat audit transaksi pembelian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18191c] text-stone-400 uppercase font-semibold border-b border-stone-800">
                  <tr>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Petugas</th>
                    <th className="p-3">Aksi</th>
                    <th className="p-3">Rincian Audit Pengadaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-stone-300">
                  {purchaseLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-800/40">
                      <td className="p-3 text-stone-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-semibold text-white whitespace-nowrap">{log.actorName}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            log.action === 'PURCHASE_ORDER_CREATED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : log.action === 'GOODS_RECEIPT_ARRIVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : log.action === 'PURCHASE_ORDER_CANCELLED'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-stone-300 max-w-xl">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SUPPLIERS */}
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

      {/* PHYSICAL ARRIVAL INSPECTION MODAL */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleConfirmArrivalSubmit}
            className="w-full max-w-2xl bg-[#232529] border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <PackageCheck size={20} className="text-[#b6d333]" />
                <div>
                  <h3 className="font-black text-sm text-white">
                    Verifikasi Fisik & Penerimaan Barang (PO: #{inspectingOrder.poNumber})
                  </h3>
                  <p className="text-[10px] text-stone-400">
                    Penerimaan bukan sekadar ACC/konfirmasi satu klik, melainkan pencatatan verifikasi fisik barang.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-[#1a1b1e] border border-stone-800 rounded-xl space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-400">Pemasok:</span>
                <span className="font-bold text-white">{inspectingOrder.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Tanggal Dipesan:</span>
                <span className="text-stone-300">
                  {new Date(inspectingOrder.orderDate).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Total Faktur Pembelian:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatIDR(inspectingOrder.grandTotal)}
                </span>
              </div>
            </div>

            {/* Item Rows for Physical Check */}
            <div className="space-y-3">
              <span className="font-bold text-stone-200 block">
                Verifikasi Jumlah Fisik Diterima & No. Batch LOT Kemasan:
              </span>
              {arrivalItems.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#1a1b1e] border border-stone-800 rounded-xl space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{row.ingredientName}</span>
                    <span className="text-stone-400 text-[10px] font-mono">
                      Rencana: {row.plannedStock.toLocaleString('id-ID')} {row.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block mb-0.5">
                        Jml Fisik Diterima ({row.unit})
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={row.quantityReceived}
                        onChange={(e) => {
                          const updated = [...arrivalItems];
                          updated[idx].quantityReceived = Number(e.target.value);
                          setArrivalItems(updated);
                        }}
                        className="w-full bg-[#232529] border border-stone-700 text-white rounded p-1.5 font-mono font-bold focus:outline-none focus:border-[#b6d333]"
                        required
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 block mb-0.5">
                        No. Batch / LOT Fisik
                      </span>
                      <input
                        type="text"
                        value={row.batchNumber}
                        onChange={(e) => {
                          const updated = [...arrivalItems];
                          updated[idx].batchNumber = e.target.value;
                          setArrivalItems(updated);
                        }}
                        placeholder="LOT-..."
                        className="w-full bg-[#232529] border border-stone-700 text-white rounded p-1.5 font-mono focus:outline-none focus:border-[#b6d333]"
                        required
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 block mb-0.5">
                        Tgl Kadaluarsa (Exp)
                      </span>
                      <input
                        type="date"
                        value={row.expiryDate}
                        onChange={(e) => {
                          const updated = [...arrivalItems];
                          updated[idx].expiryDate = e.target.value;
                          setArrivalItems(updated);
                        }}
                        className="w-full bg-[#232529] border border-stone-700 text-white rounded p-1.5 focus:outline-none focus:border-[#b6d333]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Receiver info and inspection notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Nama Petugas Penerima Fisik *
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                  required
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Catatan Pemeriksaan Fisik
                </label>
                <input
                  type="text"
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Kondisi kemasan utuh, tidak bocor..."
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isConfirmingArrival}
                className="px-5 py-2 bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 text-stone-950 font-black rounded-xl cursor-pointer shadow-md shadow-[#b6d333]/20 flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>
                  {isConfirmingArrival
                    ? 'Memverifikasi...'
                    : 'Konfirmasi Fisik & Masukkan ke Stok FIFO'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW ORDER DETAIL & AUDIT MODAL */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#232529] border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-[#b6d333]" />
                <div>
                  <h3 className="font-black text-sm text-white">
                    Detail Pesanan Pembelian #{viewingOrder.poNumber}
                  </h3>
                  <span className="text-[10px] text-stone-400">
                    Dibuat pada {new Date(viewingOrder.orderDate).toLocaleString('id-ID')} oleh {viewingOrder.orderedBy}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status and Supplier */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#1a1b1e] border border-stone-800 rounded-xl">
              <div>
                <span className="text-stone-500 text-[10px] block">Pemasok:</span>
                <span className="font-bold text-white text-xs">{viewingOrder.supplierName}</span>
              </div>
              <div>
                <span className="text-stone-500 text-[10px] block">Status:</span>
                <span
                  className={`inline-block font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                    viewingOrder.status === 'arrived'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : viewingOrder.status === 'waiting'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {viewingOrder.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <span className="font-bold text-stone-200 block">Item Barang:</span>
              <div className="border border-stone-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1a1b1e] text-stone-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2">Kemasan & Isi</th>
                      <th className="p-2 text-right">Harga Pcs</th>
                      <th className="p-2 text-right">Diskon</th>
                      <th className="p-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 text-stone-300">
                    {viewingOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-semibold text-white">{it.ingredientName || 'Bahan'}</td>
                        <td className="p-2">
                          {it.packQty} pcs x {it.contentPerPack} {it.unit}
                        </td>
                        <td className="p-2 text-right font-mono">{formatIDR(it.pricePerPack)}</td>
                        <td className="p-2 text-right font-mono text-amber-400">
                          {it.itemDiscount ? `-${formatIDR(it.itemDiscount)}` : 'Rp 0'}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-white">
                          {formatIDR(it.itemNetTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-[#18191c] border border-stone-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal Barang:</span>
                <span className="font-mono">{formatIDR(viewingOrder.rawSubtotal)}</span>
              </div>
              {viewingOrder.itemDiscountTotal > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Diskon Item:</span>
                  <span className="font-mono">-{formatIDR(viewingOrder.itemDiscountTotal)}</span>
                </div>
              )}
              {viewingOrder.orderDiscount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Diskon Total Belanja:</span>
                  <span className="font-mono">-{formatIDR(viewingOrder.orderDiscount)}</span>
                </div>
              )}
              {viewingOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-cyan-400">
                  <span>Ongkos Kirim (Delivery Fee):</span>
                  <span className="font-mono">+{formatIDR(viewingOrder.deliveryFee)}</span>
                </div>
              )}
              {viewingOrder.serviceFee > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>Biaya Layanan (Admin Fee):</span>
                  <span className="font-mono">+{formatIDR(viewingOrder.serviceFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-emerald-400 pt-1.5 border-t border-stone-800">
                <span>Grand Total:</span>
                <span className="font-mono">{formatIDR(viewingOrder.grandTotal)}</span>
              </div>
            </div>

            {/* Audit History for this order */}
            {orderSpecificLogs.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-stone-800">
                <span className="font-bold text-stone-300 block text-[11px] flex items-center gap-1.5">
                  <Shield size={12} className="text-amber-400" />
                  <span>Jejak Audit PO Ini:</span>
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {orderSpecificLogs.map((log) => (
                    <div key={log.id} className="p-2 bg-[#1a1b1e] rounded-lg text-[10px] space-y-0.5">
                      <div className="flex justify-between text-stone-400">
                        <span className="font-semibold text-white">{log.actorName}</span>
                        <span>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-stone-300">{log.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIER MODAL (ADD / EDIT) */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#232529] border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 size={16} className="text-[#b6d333]" />
                <span>{editingSupplier ? 'Edit Data Pemasok' : 'Tambah Pemasok Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Kode Pemasok</label>
                  <input
                    type="text"
                    value={supCode}
                    onChange={(e) => setSupCode(e.target.value)}
                    placeholder="SUP-01"
                    className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-stone-300 font-bold block mb-1">Nama Pemasok / Vendor *</label>
                  <input
                    type="text"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="PT Greenfields Indonesia"
                    className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Contact Person (Sales / PIC)</label>
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="Budi - Sales Representative"
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">No. Telepon / WA</label>
                  <input
                    type="tel"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 font-mono focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Email</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="sales@vendor.com"
                    className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Alamat Gudang / Kantor Pemasok</label>
                <textarea
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Jl. Pergudangan Daan Mogot KM 12..."
                  rows={2}
                  className="w-full bg-[#1a1b1e] border border-stone-700 text-white rounded-xl p-2.5 focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black rounded-xl cursor-pointer shadow-md shadow-[#b6d333]/20"
                >
                  Simpan Pemasok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
