import { Sale, Product } from '../types';

export interface DailyTrendPoint {
  date: string;
  rawDate: string;
  dayName: string;
  netSales: number;
  grossSales: number;
  cogs: number;
  grossProfit: number;
  profitMargin: number; // percentage, e.g. 65 for 65%
  transactionCount: number;
  averageOrderValue: number;
}

export interface HourlyTrendPoint {
  hour: number;
  hourLabel: string;
  netSales: number;
  transactionCount: number;
}

export interface TopProductMetric {
  productId: string;
  productName: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  marginPercent: number;
  revenueSharePercent: number;
}

export interface CategoryMetric {
  name: string;
  quantitySold: number;
  totalRevenue: number;
  percentage: number;
}

const INDONESIAN_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const INDONESIAN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Formats a Date to "DD MMM" (e.g. "27 Okt")
 */
export function formatDayMonthIndo(d: Date): string {
  const day = d.getDate();
  const month = INDONESIAN_MONTHS[d.getMonth()];
  return `${day} ${month}`;
}

/**
 * Computes daily sales & profitability trend over the last N days
 */
export function calculateDailyTrend(
  sales: Sale[],
  daysCount: number = 7,
  endDateInput?: string | Date
): DailyTrendPoint[] {
  const baseEnd = endDateInput
    ? (typeof endDateInput === 'string' ? new Date(endDateInput) : endDateInput)
    : new Date();

  // Normalize end date to midnight of that day
  const normalizedEnd = new Date(baseEnd.getFullYear(), baseEnd.getMonth(), baseEnd.getDate());

  // Filter out void transactions
  const validSales = sales.filter((s) => s.status !== 'void');

  // Pre-group sales by YYYY-MM-DD
  const salesByDate: Record<string, Sale[]> = {};
  for (const s of validSales) {
    const dStr = s.createdAt.slice(0, 10);
    if (!salesByDate[dStr]) {
      salesByDate[dStr] = [];
    }
    salesByDate[dStr].push(s);
  }

  const result: DailyTrendPoint[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const curDate = new Date(normalizedEnd);
    curDate.setDate(normalizedEnd.getDate() - i);

    const year = curDate.getFullYear();
    const month = String(curDate.getMonth() + 1).padStart(2, '0');
    const day = String(curDate.getDate()).padStart(2, '0');
    const rawDate = `${year}-${month}-${day}`;

    const daySales = salesByDate[rawDate] || [];

    const grossSales = daySales.reduce((acc, s) => acc + (s.subtotal || 0), 0);
    const discounts = daySales.reduce((acc, s) => acc + (s.discount || 0), 0);
    const netSales = Math.max(0, grossSales - discounts);
    const cogs = daySales.reduce((acc, s) => acc + (s.totalCogs || 0), 0);
    const grossProfit = netSales - cogs;
    const profitMargin = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
    const transactionCount = daySales.length;
    const averageOrderValue = transactionCount > 0 ? Math.round(netSales / transactionCount) : 0;

    result.push({
      date: formatDayMonthIndo(curDate),
      rawDate,
      dayName: INDONESIAN_DAYS[curDate.getDay()],
      netSales,
      grossSales,
      cogs,
      grossProfit,
      profitMargin,
      transactionCount,
      averageOrderValue,
    });
  }

  return result;
}

/**
 * Computes hourly sales curve for a given target day (00:00 - 23:00)
 */
export function calculateHourlyTrend(
  sales: Sale[],
  targetDateStr?: string
): HourlyTrendPoint[] {
  const target = targetDateStr || new Date().toISOString().slice(0, 10);
  const validSales = sales.filter(
    (s) => s.status !== 'void' && s.createdAt.startsWith(target)
  );

  const hourlyMap: Record<number, { netSales: number; count: number }> = {};
  for (let h = 8; h <= 22; h++) {
    hourlyMap[h] = { netSales: 0, count: 0 };
  }

  for (const s of validSales) {
    const hour = new Date(s.createdAt).getHours();
    if (hourlyMap[hour]) {
      hourlyMap[hour].netSales += Math.max(0, (s.subtotal || 0) - (s.discount || 0));
      hourlyMap[hour].count += 1;
    }
  }

  return Object.keys(hourlyMap).map((hStr) => {
    const h = parseInt(hStr, 10);
    return {
      hour: h,
      hourLabel: `${String(h).padStart(2, '0')}:00`,
      netSales: hourlyMap[h].netSales,
      transactionCount: hourlyMap[h].count,
    };
  });
}

/**
 * Computes top selling products sorted by quantity or revenue
 */
export function calculateTopProducts(
  sales: Sale[],
  products: Product[] = [],
  limit: number = 8
): TopProductMetric[] {
  const validSales = sales.filter((s) => s.status !== 'void');

  const prodMetaMap: Record<string, { category: string }> = {};
  for (const p of products) {
    prodMetaMap[p.id] = { category: p.category || 'Menu' };
  }

  const map: Record<
    string,
    {
      productId: string;
      productName: string;
      category: string;
      quantitySold: number;
      totalRevenue: number;
      totalCogs: number;
    }
  > = {};

  let overallRevenue = 0;

  for (const s of validSales) {
    // Estimate cogs ratio per item if totalCogs is provided
    const saleSubtotal = Math.max(1, s.subtotal || 1);
    const saleDiscount = s.discount || 0;
    const netMultiplier = Math.max(0, 1 - saleDiscount / saleSubtotal);

    for (const item of s.items || []) {
      const pid = item.productId || item.productName;
      if (!map[pid]) {
        map[pid] = {
          productId: pid,
          productName: item.productName,
          category: prodMetaMap[item.productId]?.category || 'Minuman',
          quantitySold: 0,
          totalRevenue: 0,
          totalCogs: 0,
        };
      }

      const itemNetRevenue = Math.round(item.itemTotal * netMultiplier);
      map[pid].quantitySold += item.quantity;
      map[pid].totalRevenue += itemNetRevenue;

      // Approximate item proportional COGS if totalCogs is present
      const itemCogs = s.totalCogs ? Math.round((item.itemTotal / saleSubtotal) * s.totalCogs) : 0;
      map[pid].totalCogs += itemCogs;

      overallRevenue += itemNetRevenue;
    }
  }

  const list = Object.values(map).map((p) => {
    const grossProfit = p.totalRevenue - p.totalCogs;
    const marginPercent = p.totalRevenue > 0 ? Math.round((grossProfit / p.totalRevenue) * 100) : 0;
    const revenueSharePercent = overallRevenue > 0 ? Math.round((p.totalRevenue / overallRevenue) * 100) : 0;
    return {
      ...p,
      grossProfit,
      marginPercent,
      revenueSharePercent,
    };
  });

  // Sort by quantitySold descending, secondary by totalRevenue
  list.sort((a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue);

  return list.slice(0, limit);
}

/**
 * Computes category revenue breakdown
 */
export function calculateCategoryBreakdown(
  topProducts: TopProductMetric[]
): CategoryMetric[] {
  const catMap: Record<string, { quantity: number; revenue: number }> = {};
  let totalRev = 0;

  for (const p of topProducts) {
    const cat = p.category || 'Lainnya';
    if (!catMap[cat]) {
      catMap[cat] = { quantity: 0, revenue: 0 };
    }
    catMap[cat].quantity += p.quantitySold;
    catMap[cat].revenue += p.totalRevenue;
    totalRev += p.totalRevenue;
  }

  return Object.entries(catMap).map(([name, data]) => ({
    name,
    quantitySold: data.quantity,
    totalRevenue: data.revenue,
    percentage: totalRev > 0 ? Math.round((data.revenue / totalRev) * 100) : 0,
  }));
}
