import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Sale, BusinessSettings } from '../../types';
import { formatIDR } from '../../lib/currency';
import { logReceiptReprint } from '../../services/salesService';
import { ReceiptModal } from '../pos/ReceiptModal';
import { Receipt, Search, Printer, Layers, Eye, X } from 'lucide-react';

interface TransactionsManagerProps {
  settings: BusinessSettings;
}

export const TransactionsManager: React.FC<TransactionsManagerProps> = ({ settings }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const load = async () => {
    const list = await db.sales.orderBy('createdAt').reverse().toArray();
    setSales(list);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = sales.filter(
    (s) =>
      s.transactionNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      (s.payment?.method && s.payment.method.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenReprint = async (sale: Sale) => {
    const updated = await logReceiptReprint(sale.id, 'Admin');
    setReceiptSale(updated || sale);
    setIsReceiptOpen(true);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Receipt size={22} className="text-amber-400" />
            <span>Riwayat Transaksi Penjualan & Alokasi FIFO</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Daftar lengkap transaksi POS, audit pembayaran manual, dekonstruksi HPP batch FIFO, dan cetak ulang struk.
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. Trx / Kasir..."
            className="bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-3">No. Transaksi</th>
                <th className="p-3">Waktu</th>
                <th className="p-3">Kasir</th>
                <th className="p-3">Metode Bayar</th>
                <th className="p-3 text-right">Total Transaksi</th>
                <th className="p-3 text-right">HPP (FIFO)</th>
                <th className="p-3 text-right">Laba Kotor</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {filtered.map((sale) => (
                <tr key={sale.id} className="hover:bg-stone-800/40">
                  <td className="p-3 font-mono font-bold text-amber-400">{sale.transactionNumber}</td>
                  <td className="p-3 text-stone-400">
                    {new Date(sale.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-3 text-stone-200">{sale.cashierName}</td>
                  <td className="p-3">
                    <span className="uppercase font-bold text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                      {sale.payment?.method || 'CASH'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-white">
                    {formatIDR(sale.grandTotal)}
                  </td>
                  <td className="p-3 text-right font-mono text-sky-400">
                    {formatIDR(sale.totalCogs)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-400">
                    {formatIDR(sale.grossProfit)}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {sale.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs"
                        title="Lihat Rincian HPP FIFO"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenReprint(sale)}
                        className="p-1.5 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-lg text-xs"
                        title="Cetak Ulang Struk"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-stone-500">
                    Belum ada transaksi ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail & FIFO Breakdown Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-xl bg-stone-900 border border-stone-800 rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-sky-400" />
                  <span>Dekonstruksi Biaya HPP FIFO — #{selectedSale.transactionNumber}</span>
                </h2>
                <p className="text-[11px] text-stone-400">
                  {new Date(selectedSale.createdAt).toLocaleString('id-ID')} WIB • Kasir: {selectedSale.cashierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Items Purchased */}
              <div className="space-y-1.5 bg-stone-950/60 p-3 rounded-2xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                  Item Minuman Terjual
                </span>
                {selectedSale.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-stone-200">
                    <span>
                      {i.quantity}x {i.productName} {i.variantName && `(${i.variantName})`}
                    </span>
                    <span className="font-bold">{formatIDR(i.itemTotal)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-stone-800 flex justify-between font-bold text-white">
                  <span>Grand Total:</span>
                  <span className="text-amber-400">{formatIDR(selectedSale.grandTotal)}</span>
                </div>
              </div>

              {/* FIFO Layer Allocations */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Alokasi Konsumsi Cost Layer FIFO Aktual
                </span>
                <div className="bg-stone-950/80 rounded-2xl border border-stone-800 overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-stone-900 text-stone-400 border-b border-stone-800">
                      <tr>
                        <th className="p-2.5">Layer ID</th>
                        <th className="p-2.5 text-right">Qty Terpakai</th>
                        <th className="p-2.5 text-right">Biaya / Unit</th>
                        <th className="p-2.5 text-right">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60 text-stone-300">
                      {selectedSale.costAllocations.map((alloc, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-mono text-stone-400">{alloc.layerId}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">
                            {alloc.quantityConsumed}
                          </td>
                          <td className="p-2.5 text-right font-mono">{formatIDR(alloc.unitCost)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-sky-400">
                            {formatIDR(alloc.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-stone-800/40 rounded-xl flex items-center justify-between font-bold">
                  <span className="text-stone-300">Total HPP Penjualan Ini:</span>
                  <span className="text-sky-400 font-mono text-sm">{formatIDR(selectedSale.totalCogs)}</span>
                </div>
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between font-bold">
                  <span className="text-emerald-300">Laba Kotor Bersih:</span>
                  <span className="text-emerald-400 font-mono text-sm">{formatIDR(selectedSale.grossProfit)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-stone-800 bg-stone-950 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reprint Receipt Modal */}
      {isReceiptOpen && receiptSale && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setReceiptSale(null);
          }}
          sale={receiptSale}
          settings={settings}
          isReprint={true}
        />
      )}
    </div>
  );
};
