import React, { useState, useId } from 'react';
import {
  ProductSalesBreakdown,
  PieChartSlice,
  calculatePieChartSlices,
} from '../../utils/salesReport';
import { formatIDR } from '../../lib/currency';
import { PieChart as PieChartIcon, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';

interface ProductPieChartProps {
  products: ProductSalesBreakdown[];
  metric: 'quantity' | 'revenue';
  onMetricChange: (metric: 'quantity' | 'revenue') => void;
  selectedProductId?: string | null;
  onSelectProduct?: (productId: string | null) => void;
}

export const ProductPieChart: React.FC<ProductPieChartProps> = ({
  products,
  metric,
  onMetricChange,
  selectedProductId,
  onSelectProduct,
}) => {
  const chartId = useId();
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);

  const activeHoverId = hoveredSliceId || selectedProductId;

  const totalValue = products.reduce(
    (sum, p) => sum + (metric === 'quantity' ? p.quantitySold : p.totalRevenue),
    0
  );

  const slices = calculatePieChartSlices(products, metric, {
    maxSlices: 6,
    centerX: 160,
    centerY: 160,
    innerRadius: 75,
    outerRadius: 130,
  });

  const activeSlice = slices.find((s) => s.id === activeHoverId) || null;

  if (products.length === 0 || totalValue === 0) {
    return (
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[360px]">
        <div className="w-14 h-14 rounded-2xl bg-stone-800/80 border border-stone-700/60 flex items-center justify-center text-stone-500 mb-3">
          <PieChartIcon size={28} />
        </div>
        <h4 className="text-sm font-bold text-stone-300">Belum Ada Data Produk</h4>
        <p className="text-xs text-stone-500 max-w-xs mt-1">
          Visualisasi diagram lingkaran akan otomatis muncul ketika ada transaksi penjualan pada tanggal ini.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg flex flex-col">
      {/* Chart Header & Metric Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChartIcon size={16} className="text-amber-400" />
            <span>Pangsa Produk Terlaris (Pie Chart)</span>
          </h3>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Komposisi penjualan {metric === 'quantity' ? 'berdasarkan unit cup' : 'berdasarkan kontribusi omzet'}
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="inline-flex p-1 bg-stone-950 rounded-xl border border-stone-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onMetricChange('quantity')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              metric === 'quantity'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShoppingBag size={12} />
            <span>Kuantitas (Cup)</span>
          </button>
          <button
            type="button"
            onClick={() => onMetricChange('revenue')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              metric === 'revenue'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <DollarSign size={12} />
            <span>Omzet (Rp)</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas & Visual Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-4">
        {/* SVG Donut / Pie Visualization */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
          <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
            <svg
              viewBox="0 0 320 320"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label="Diagram Lingkaran Produk Terlaris"
            >
              <defs>
                <filter id={`${chartId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Slices */}
              <g className="transition-transform duration-300">
                {slices.map((slice) => {
                  const isHovered = activeHoverId === slice.id;
                  return (
                    <path
                      key={slice.id}
                      d={slice.pathData}
                      fill={slice.color}
                      stroke="#1c1917"
                      strokeWidth={isHovered ? 3 : 2}
                      className="cursor-pointer transition-all duration-200"
                      style={{
                        transformOrigin: '160px 160px',
                        transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                        opacity: activeHoverId ? (isHovered ? 1 : 0.45) : 0.95,
                        filter: isHovered ? `url(#${chartId}-shadow)` : 'none',
                      }}
                      onMouseEnter={() => {
                        setHoveredSliceId(slice.id);
                        if (onSelectProduct) onSelectProduct(slice.id);
                      }}
                      onMouseLeave={() => {
                        setHoveredSliceId(null);
                        if (onSelectProduct) onSelectProduct(null);
                      }}
                      onClick={() => {
                        if (onSelectProduct) {
                          onSelectProduct(selectedProductId === slice.id ? null : slice.id);
                        }
                      }}
                    >
                      <title>{`${slice.label}: ${
                        metric === 'quantity'
                          ? `${slice.value} Cup`
                          : formatIDR(slice.value)
                      } (${slice.percentage}%)`}</title>
                    </path>
                  );
                })}
              </g>

              {/* Inner Cutout Decorative Circle */}
              <circle
                cx="160"
                cy="160"
                r="74"
                className="fill-stone-900 pointer-events-none"
              />
            </svg>

            {/* Dynamic Center Info Hub */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-8">
              {activeSlice ? (
                <div className="animate-in fade-in zoom-in-95 duration-150">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mb-1"
                    style={{ backgroundColor: activeSlice.color }}
                  />
                  <p className="text-[11px] font-medium text-stone-300 line-clamp-1 max-w-[130px]">
                    {activeSlice.label}
                  </p>
                  <p className="text-base sm:text-lg font-black text-white leading-tight">
                    {metric === 'quantity'
                      ? `${activeSlice.value} Cup`
                      : formatIDR(activeSlice.value)}
                  </p>
                  <p className="text-xs font-bold text-amber-400">
                    {activeSlice.percentage}%
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    {metric === 'quantity' ? 'Total Minuman' : 'Total Omzet'}
                  </span>
                  <p className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
                    {metric === 'quantity'
                      ? `${totalValue} Cup`
                      : formatIDR(totalValue)}
                  </p>
                  <span className="text-[10px] text-stone-400 font-medium block mt-0.5">
                    {products.length} menu terjual
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend & Breakdown List */}
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 pb-1 px-2 uppercase tracking-wider">
            <span>Menu Produk</span>
            <span>{metric === 'quantity' ? 'Volume' : 'Omzet'} & Porsi</span>
          </div>

          <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1">
            {slices.map((slice, index) => {
              const isHovered = activeHoverId === slice.id;
              return (
                <div
                  key={slice.id}
                  onMouseEnter={() => {
                    setHoveredSliceId(slice.id);
                    if (onSelectProduct) onSelectProduct(slice.id);
                  }}
                  onMouseLeave={() => {
                    setHoveredSliceId(null);
                    if (onSelectProduct) onSelectProduct(null);
                  }}
                  onClick={() => {
                    if (onSelectProduct) {
                      onSelectProduct(selectedProductId === slice.id ? null : slice.id);
                    }
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isHovered
                      ? 'bg-stone-800/90 border-amber-500/50 shadow-md translate-x-1'
                      : 'bg-stone-950/40 border-stone-800/80 hover:bg-stone-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-3 h-3 rounded-md shrink-0 shadow-xs"
                      style={{ backgroundColor: slice.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-200 truncate">
                        {slice.label}
                      </p>
                      <p className="text-[10px] text-stone-400 font-mono">
                        {slice.isOther ? 'Gabungan' : `Peringkat #${index + 1}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-white">
                      {metric === 'quantity'
                        ? `${slice.value} Cup`
                        : formatIDR(slice.value)}
                    </div>
                    <div className="text-[10px] font-mono text-amber-400 font-bold">
                      {slice.percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
