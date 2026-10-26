import React from 'react';
import { Sale, BusinessSettings } from '../../types';
import { formatIDR } from '../../lib/currency';

interface ThermalReceiptProps {
  sale: Sale;
  settings: BusinessSettings;
  paperWidth?: '58mm' | '80mm';
  isReprint?: boolean;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  sale,
  settings,
  paperWidth = '58mm',
  isReprint = false,
}) => {
  const is58 = paperWidth === '58mm';
  const widthClass = is58 ? 'w-[280px]' : 'w-[360px]';

  const formattedDate = new Date(sale.createdAt).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="thermal-receipt-print-area"
      className={`${widthClass} mx-auto bg-white text-black p-4 font-mono-receipt text-xs leading-tight shadow-sm border border-stone-200 print:border-none print:shadow-none print:w-full print:p-0 select-text`}
      style={{ fontSize: is58 ? '11px' : '12px' }}
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-stone-400">
        <h1 className="font-extrabold text-base tracking-wider uppercase">{settings.businessName}</h1>
        <p className="text-[10px] text-stone-600 whitespace-pre-line mt-0.5">{settings.address}</p>
        <p className="text-[10px] text-stone-600">Telp: {settings.phone}</p>
      </div>

      {/* Reprint Watermark Banner */}
      {(isReprint || sale.isReprinted) && (
        <div className="my-1.5 py-0.5 bg-stone-200 border border-stone-400 text-center font-bold tracking-widest text-xs uppercase">
          *** SALINAN STRUK (REPRINT) ***
        </div>
      )}

      {/* Metadata */}
      <div className="py-2 border-b border-dashed border-stone-400 text-[11px] space-y-0.5">
        <div className="flex justify-between">
          <span>No:</span>
          <span className="font-bold">{sale.transactionNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Waktu:</span>
          <span>{formattedDate} WIB</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir:</span>
          <span>{sale.cashierName}</span>
        </div>
        {sale.syncStatus === 'pending_sync' && (
          <div className="text-center text-[10px] bg-amber-100 text-amber-900 font-semibold py-0.5 mt-1 rounded">
            [MODE OFFLINE - TERSIMPAN LOKAL]
          </div>
        )}
      </div>

      {/* Item List */}
      <div className="py-2 border-b border-dashed border-stone-400 space-y-2">
        {sale.items.map((item, idx) => (
          <div key={idx} className="text-[11px]">
            <div className="font-semibold text-stone-900">{item.productName}</div>
            {item.variantName && (
              <div className="text-[10px] text-stone-600 pl-2">Varian: {item.variantName}</div>
            )}
            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
              <div className="text-[10px] text-stone-600 pl-2">
                {item.selectedModifiers.map((m) => `+ ${m.name}`).join(', ')}
              </div>
            )}
            {item.notes && (
              <div className="text-[10px] italic text-stone-500 pl-2">Catatan: {item.notes}</div>
            )}
            <div className="flex justify-between pt-0.5 pl-2">
              <span className="text-stone-600">
                {item.quantity} x {formatIDR(item.unitPrice)}
              </span>
              <span className="font-bold">{formatIDR(item.itemTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="py-2 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatIDR(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div>
            <div className="flex justify-between text-stone-700 font-medium">
              <span>
                Diskon {sale.discountInfo?.type === 'percent' ? `(${sale.discountInfo.value}%)` : ''}:
              </span>
              <span>-{formatIDR(sale.discount)}</span>
            </div>
            {sale.discountInfo?.reason && (
              <div className="text-[10px] text-stone-500 pl-2">
                * {sale.discountInfo.reason}
                {sale.discountInfo.customReason ? `: ${sale.discountInfo.customReason}` : ''}
              </div>
            )}
            {sale.discountInfo?.approvedBy && (
              <div className="text-[10px] text-emerald-800 font-semibold pl-2">
                Otorisasi: {sale.discountInfo.approvedBy}
              </div>
            )}
          </div>
        )}
        {sale.tax > 0 && (
          <div className="flex justify-between">
            <span>Pajak (PB1):</span>
            <span>{formatIDR(sale.tax)}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-stone-300">
          <span>TOTAL:</span>
          <span>{formatIDR(sale.grandTotal)}</span>
        </div>
      </div>

      {/* Payment Details */}
      {sale.payment && (
        <div className="py-2 border-b border-dashed border-stone-400 text-[11px] space-y-0.5">
          <div className="flex justify-between">
            <span>Metode:</span>
            <span className="font-bold uppercase">{sale.payment.method}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-bold text-emerald-800">LUNAS (TERKONFIRMASI)</span>
          </div>
          {sale.payment.method === 'cash' && (
            <>
              <div className="flex justify-between">
                <span>Bayar:</span>
                <span>{formatIDR(sale.payment.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kembali:</span>
                <span>{formatIDR(sale.payment.change)}</span>
              </div>
            </>
          )}
          {sale.payment.externalReference && (
            <div className="flex justify-between text-[10px] text-stone-600">
              <span>Ref / No. Trx:</span>
              <span className="truncate max-w-[150px]">{sale.payment.externalReference}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-3 text-[10px] text-stone-600 whitespace-pre-line leading-relaxed">
        {settings.receiptFooter}
      </div>
    </div>
  );
};
