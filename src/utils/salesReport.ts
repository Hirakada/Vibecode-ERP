import { Sale, PaymentMethod } from '../types';

export interface DailySalesSummary {
  date: string;
  transactionCount: number;
  totalGross: number;
  totalDiscounts: number;
  totalTax: number;
  grandTotal: number;
  totalCogs: number;
  grossProfit: number;
  profitMarginPercent: number;
  totalItemsSold: number;
  averageBasketSize: number;
  averageItemsPerTransaction: number;
}

export interface ProductSalesBreakdown {
  productId: string;
  productName: string;
  category?: string;
  quantitySold: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  profitMarginPercent: number;
  quantitySharePercent: number;
  revenueSharePercent: number;
  transactionCount: number;
}

export interface PieChartSlice {
  id: string;
  label: string;
  value: number;
  percentage: number;
  startAngle: number; // in radians
  endAngle: number;   // in radians
  startDegrees: number;
  endDegrees: number;
  color: string;
  pathData: string;
  centerTextX: number;
  centerTextY: number;
  isOther?: boolean;
  itemCount?: number;
}

export interface PaymentBreakdownItem {
  method: PaymentMethod | 'other';
  label: string;
  count: number;
  totalAmount: number;
  percentage: number;
  color: string;
}

export interface HourlySalesItem {
  hour: number;
  label: string;
  count: number;
  totalRevenue: number;
}

export const SLICE_PALETTE = [
  '#b6d333', // Caozy Brand Lime
  '#10b981', // Emerald 500
  '#06b6d4', // Cyan 500
  '#8b5cf6', // Violet 500
  '#f59e0b', // Amber 500
  '#f43f5e', // Rose 500
  '#3b82f6', // Blue 500
  '#14b8a6', // Teal 500
  '#78716c', // Stone 500 (Lainnya)
];

/**
 * Normalizes date from ISO string to 'YYYY-MM-DD'
 */
export function getLocalDateString(isoOrDateStr?: string | Date): string {
  if (!isoOrDateStr) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (isoOrDateStr instanceof Date) {
    return `${isoOrDateStr.getFullYear()}-${String(isoOrDateStr.getMonth() + 1).padStart(2, '0')}-${String(isoOrDateStr.getDate()).padStart(2, '0')}`;
  }
  if (isoOrDateStr.length >= 10 && isoOrDateStr[4] === '-' && isoOrDateStr[7] === '-') {
    return isoOrDateStr.slice(0, 10);
  }
  const d = new Date(isoOrDateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Filters sales records for a specified date (YYYY-MM-DD)
 * Ignores voided transactions.
 */
export function filterSalesByDate(sales: Sale[], dateStr: string): Sale[] {
  if (!sales || !Array.isArray(sales)) return [];
  const targetDate = dateStr.slice(0, 10);
  return sales.filter((sale) => {
    if (sale.status === 'void') return false;
    const saleDate = getLocalDateString(sale.createdAt);
    return saleDate === targetDate;
  });
}

/**
 * Calculates high-level financial and operational daily metrics
 */
export function calculateDailySalesSummary(sales: Sale[], dateStr: string): DailySalesSummary {
  const summary: DailySalesSummary = {
    date: dateStr,
    transactionCount: sales.length,
    totalGross: 0,
    totalDiscounts: 0,
    totalTax: 0,
    grandTotal: 0,
    totalCogs: 0,
    grossProfit: 0,
    profitMarginPercent: 0,
    totalItemsSold: 0,
    averageBasketSize: 0,
    averageItemsPerTransaction: 0,
  };

  if (!sales || sales.length === 0) {
    return summary;
  }

  for (const sale of sales) {
    summary.totalGross += sale.subtotal || 0;
    summary.totalDiscounts += sale.discount || 0;
    summary.totalTax += sale.tax || 0;
    summary.grandTotal += sale.grandTotal || 0;
    summary.totalCogs += sale.totalCogs || 0;
    summary.grossProfit += sale.grossProfit !== undefined ? sale.grossProfit : (sale.grandTotal - (sale.totalCogs || 0));

    if (sale.items && Array.isArray(sale.items)) {
      for (const item of sale.items) {
        summary.totalItemsSold += item.quantity || 0;
      }
    }
  }

  if (summary.grandTotal > 0) {
    summary.profitMarginPercent = Math.round((summary.grossProfit / summary.grandTotal) * 1000) / 10;
  }

  if (summary.transactionCount > 0) {
    summary.averageBasketSize = Math.round(summary.grandTotal / summary.transactionCount);
    summary.averageItemsPerTransaction = Math.round((summary.totalItemsSold / summary.transactionCount) * 10) / 10;
  }

  return summary;
}

/**
 * Aggregates sales line items by product, sorted by quantity sold or revenue
 */
export function getTopSellingProducts(
  sales: Sale[],
  sortBy: 'quantity' | 'revenue' = 'quantity'
): ProductSalesBreakdown[] {
  if (!sales || sales.length === 0) return [];

  const productMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      quantitySold: number;
      totalRevenue: number;
      totalCogs: number;
      transactionSet: Set<string>;
    }
  >();

  let overallQuantity = 0;
  let overallRevenue = 0;

  for (const sale of sales) {
    if (!sale.items || !Array.isArray(sale.items)) continue;

    // Estimate COGS per item proportion if available
    const saleItemCount = sale.items.reduce((s, it) => s + (it.quantity || 1), 0);
    const avgItemCogs = saleItemCount > 0 ? (sale.totalCogs || 0) / saleItemCount : 0;

    for (const item of sale.items) {
      const pid = item.productId || item.productName;
      const qty = item.quantity || 0;
      const rev = item.itemTotal !== undefined ? item.itemTotal : (item.unitPrice || 0) * qty;
      const estimatedCogs = avgItemCogs * qty;

      overallQuantity += qty;
      overallRevenue += rev;

      const existing = productMap.get(pid);
      if (existing) {
        existing.quantitySold += qty;
        existing.totalRevenue += rev;
        existing.totalCogs += estimatedCogs;
        existing.transactionSet.add(sale.id);
      } else {
        productMap.set(pid, {
          productId: item.productId,
          productName: item.productName || 'Tanpa Nama',
          quantitySold: qty,
          totalRevenue: rev,
          totalCogs: estimatedCogs,
          transactionSet: new Set([sale.id]),
        });
      }
    }
  }

  const list: ProductSalesBreakdown[] = [];

  for (const item of productMap.values()) {
    const grossProfit = item.totalRevenue - item.totalCogs;
    const profitMarginPercent = item.totalRevenue > 0
      ? Math.round((grossProfit / item.totalRevenue) * 1000) / 10
      : 0;

    const quantitySharePercent = overallQuantity > 0
      ? Math.round((item.quantitySold / overallQuantity) * 1000) / 10
      : 0;

    const revenueSharePercent = overallRevenue > 0
      ? Math.round((item.totalRevenue / overallRevenue) * 1000) / 10
      : 0;

    list.push({
      productId: item.productId,
      productName: item.productName,
      quantitySold: item.quantitySold,
      totalRevenue: item.totalRevenue,
      totalCogs: Math.round(item.totalCogs),
      grossProfit: Math.round(grossProfit),
      profitMarginPercent,
      quantitySharePercent,
      revenueSharePercent,
      transactionCount: item.transactionSet.size,
    });
  }

  list.sort((a, b) => {
    if (sortBy === 'quantity') {
      return b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue;
    }
    return b.totalRevenue - a.totalRevenue || b.quantitySold - a.quantitySold;
  });

  return list;
}

/**
 * Creates SVG Arc Path string for Donut or Pie slices
 */
export function describeArc(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngleRad: number,
  endAngleRad: number
): string {
  // Guard against full 360 circle (2PI) SVG arc glitch
  const angleDiff = endAngleRad - startAngleRad;
  const isNearlyFullCircle = angleDiff >= 2 * Math.PI - 0.0001;

  if (isNearlyFullCircle) {
    if (innerRadius === 0) {
      return `M ${centerX} ${centerY - outerRadius} ` +
             `A ${outerRadius} ${outerRadius} 0 1 0 ${centerX} ${centerY + outerRadius} ` +
             `A ${outerRadius} ${outerRadius} 0 1 0 ${centerX} ${centerY - outerRadius} Z`;
    }
    // Donut full ring
    return `M ${centerX} ${centerY - outerRadius} ` +
           `A ${outerRadius} ${outerRadius} 0 1 0 ${centerX} ${centerY + outerRadius} ` +
           `A ${outerRadius} ${outerRadius} 0 1 0 ${centerX} ${centerY - outerRadius} ` +
           `M ${centerX} ${centerY - innerRadius} ` +
           `A ${innerRadius} ${innerRadius} 0 1 1 ${centerX} ${centerY + innerRadius} ` +
           `A ${innerRadius} ${innerRadius} 0 1 1 ${centerX} ${centerY - innerRadius} Z`;
  }

  const startOuterX = centerX + outerRadius * Math.cos(startAngleRad);
  const startOuterY = centerY + outerRadius * Math.sin(startAngleRad);
  const endOuterX = centerX + outerRadius * Math.cos(endAngleRad);
  const endOuterY = centerY + outerRadius * Math.sin(endAngleRad);

  const largeArcFlag = angleDiff > Math.PI ? 1 : 0;

  if (innerRadius <= 0) {
    // Full Pie Slice (wedge)
    return [
      `M ${centerX} ${centerY}`,
      `L ${startOuterX} ${startOuterY}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`,
      'Z',
    ].join(' ');
  }

  // Donut Arc
  const startInnerX = centerX + innerRadius * Math.cos(endAngleRad);
  const startInnerY = centerY + innerRadius * Math.sin(endAngleRad);
  const endInnerX = centerX + innerRadius * Math.cos(startAngleRad);
  const endInnerY = centerY + innerRadius * Math.sin(startAngleRad);

  return [
    `M ${startOuterX} ${startOuterY}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`,
    `L ${startInnerX} ${startInnerY}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInnerX} ${endInnerY}`,
    'Z',
  ].join(' ');
}

/**
 * Calculates SVG Pie/Donut Chart slices with coordinates, angles, and color palette
 */
export function calculatePieChartSlices(
  products: ProductSalesBreakdown[],
  metric: 'quantity' | 'revenue' = 'quantity',
  options: {
    maxSlices?: number;
    centerX?: number;
    centerY?: number;
    innerRadius?: number;
    outerRadius?: number;
  } = {}
): PieChartSlice[] {
  const {
    maxSlices = 6,
    centerX = 150,
    centerY = 150,
    innerRadius = 70,
    outerRadius = 120,
  } = options;

  if (!products || products.length === 0) return [];

  const totalValue = products.reduce(
    (sum, p) => sum + (metric === 'quantity' ? p.quantitySold : p.totalRevenue),
    0
  );

  if (totalValue <= 0) return [];

  // Group top N slices and combine the rest into 'Lainnya'
  type IntermediateSlice = {
    id: string;
    label: string;
    value: number;
    isOther?: boolean;
    itemCount?: number;
  };

  const intermediate: IntermediateSlice[] = [];

  if (products.length <= maxSlices) {
    products.forEach((p) => {
      intermediate.push({
        id: p.productId,
        label: p.productName,
        value: metric === 'quantity' ? p.quantitySold : p.totalRevenue,
        itemCount: 1,
      });
    });
  } else {
    // Take top maxSlices - 1
    const topItems = products.slice(0, maxSlices - 1);
    const otherItems = products.slice(maxSlices - 1);

    topItems.forEach((p) => {
      intermediate.push({
        id: p.productId,
        label: p.productName,
        value: metric === 'quantity' ? p.quantitySold : p.totalRevenue,
        itemCount: 1,
      });
    });

    const otherTotal = otherItems.reduce(
      (sum, p) => sum + (metric === 'quantity' ? p.quantitySold : p.totalRevenue),
      0
    );

    if (otherTotal > 0) {
      intermediate.push({
        id: 'slice-others',
        label: `Lainnya (${otherItems.length} produk)`,
        value: otherTotal,
        isOther: true,
        itemCount: otherItems.length,
      });
    }
  }

  // Calculate angles (starting at -90 degrees / top of circle)
  let currentAngle = -Math.PI / 2;
  const slices: PieChartSlice[] = [];

  intermediate.forEach((item, index) => {
    const fraction = item.value / totalValue;
    const angleDelta = fraction * (2 * Math.PI);
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleDelta;
    currentAngle = endAngle;

    const percentage = Math.round(fraction * 1000) / 10;
    const midAngle = startAngle + angleDelta / 2;
    const labelRadius = innerRadius + (outerRadius - innerRadius) / 2;
    const centerTextX = centerX + labelRadius * Math.cos(midAngle);
    const centerTextY = centerY + labelRadius * Math.sin(midAngle);

    const color = item.isOther
      ? SLICE_PALETTE[SLICE_PALETTE.length - 1]
      : SLICE_PALETTE[index % (SLICE_PALETTE.length - 1)];

    const pathData = describeArc(
      centerX,
      centerY,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle
    );

    slices.push({
      id: item.id,
      label: item.label,
      value: item.value,
      percentage,
      startAngle,
      endAngle,
      startDegrees: (startAngle * 180) / Math.PI,
      endDegrees: (endAngle * 180) / Math.PI,
      color,
      pathData,
      centerTextX,
      centerTextY,
      isOther: item.isOther,
      itemCount: item.itemCount,
    });
  });

  return slices;
}

/**
 * Breakdown of payment methods for the chosen day
 */
export function calculatePaymentBreakdown(sales: Sale[]): PaymentBreakdownItem[] {
  if (!sales || sales.length === 0) return [];

  const counts: Record<string, { count: number; total: number }> = {
    cash: { count: 0, total: 0 },
    qris: { count: 0, total: 0 },
    transfer: { count: 0, total: 0 },
    ewallet: { count: 0, total: 0 },
  };

  let grandTotal = 0;

  for (const sale of sales) {
    const method = sale.payment?.method || 'cash';
    if (!counts[method]) {
      counts[method] = { count: 0, total: 0 };
    }
    counts[method].count += 1;
    const amount = sale.grandTotal || 0;
    counts[method].total += amount;
    grandTotal += amount;
  }

  const meta: Record<string, { label: string; color: string }> = {
    cash: { label: 'Tunai (Cash)', color: '#10b981' },
    qris: { label: 'QRIS Statis/Dinamis', color: '#f59e0b' },
    transfer: { label: 'Transfer Bank', color: '#3b82f6' },
    ewallet: { label: 'E-Wallet', color: '#8b5cf6' },
  };

  const results: PaymentBreakdownItem[] = [];

  for (const [key, data] of Object.entries(counts)) {
    if (data.count > 0) {
      results.push({
        method: key as PaymentMethod,
        label: meta[key]?.label || key.toUpperCase(),
        count: data.count,
        totalAmount: data.total,
        percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 1000) / 10 : 0,
        color: meta[key]?.color || '#94a3b8',
      });
    }
  }

  results.sort((a, b) => b.totalAmount - a.totalAmount);
  return results;
}

/**
 * Hourly sales distribution to identify peak rush hours
 */
export function calculateHourlySalesBreakdown(sales: Sale[]): HourlySalesItem[] {
  const hoursMap: Record<number, { count: number; total: number }> = {};
  for (let i = 0; i < 24; i++) {
    hoursMap[i] = { count: 0, total: 0 };
  }

  if (sales && sales.length > 0) {
    for (const sale of sales) {
      const d = new Date(sale.createdAt);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        hoursMap[h].count += 1;
        hoursMap[h].total += sale.grandTotal || 0;
      }
    }
  }

  const list: HourlySalesItem[] = [];
  for (let i = 0; i < 24; i++) {
    list.push({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      count: hoursMap[i].count,
      totalRevenue: hoursMap[i].total,
    });
  }
  return list;
}

/**
 * Generates CSV string for exporting daily report
 */
export function exportSalesReportToCsv(
  dateStr: string,
  summary: DailySalesSummary,
  products: ProductSalesBreakdown[]
): string {
  const lines: string[] = [];

  lines.push(`"LAPORAN PENJUALAN HARIAN - CAOZY ERP"`);
  lines.push(`"Tanggal","${dateStr}"`);
  lines.push(`"Total Transaksi","${summary.transactionCount}"`);
  lines.push(`"Total Item Terjual","${summary.totalItemsSold}"`);
  lines.push(`"Penjualan Kotor (Gross)","${summary.totalGross}"`);
  lines.push(`"Diskon Promo","${summary.totalDiscounts}"`);
  lines.push(`"Pajak Restoran/PB1","${summary.totalTax}"`);
  lines.push(`"Total Omzet Bersih","${summary.grandTotal}"`);
  lines.push(`"Total HPP (FIFO COGS)","${summary.totalCogs}"`);
  lines.push(`"Laba Kotor (Gross Profit)","${summary.grossProfit}"`);
  lines.push(`"Margin Laba (%)","${summary.profitMarginPercent}%"`);
  lines.push(`"Rata-rata Keranjang (ATV)","${summary.averageBasketSize}"`);
  lines.push('');
  lines.push(`"PERINGKAT PRODUK TERLARIS"`);
  lines.push(
    `"Peringkat","ID Produk","Nama Produk","Qty Terjual","Omzet (IDR)","HPP (IDR)","Laba Kotor (IDR)","Margin %","Porsi Qty %","Porsi Omzet %","Jumlah Nota"`
  );

  products.forEach((p, index) => {
    lines.push(
      `"${index + 1}","${p.productId}","${p.productName.replace(/"/g, '""')}","${p.quantitySold}","${p.totalRevenue}","${p.totalCogs}","${p.grossProfit}","${p.profitMarginPercent}%","${p.quantitySharePercent}%","${p.revenueSharePercent}%","${p.transactionCount}"`
    );
  });

  return lines.join('\n');
}
