import React, { useState, useEffect } from 'react';
import {
  Product,
  SaleItem,
  Sale,
  UserProfile,
  BusinessSettings,
  CashierShift,
  PaymentMethod,
} from '../../types';
import { db } from '../../lib/storage';
import { processSale, logReceiptReprint } from '../../services/salesService';
import { syncService, SyncStatusSummary } from '../../services/syncService';
import { formatIDR } from '../../lib/currency';
import { hasPermission } from '../../lib/permissions';
import { ProductCustomizerModal } from './ProductCustomizerModal';
import { CartDrawer } from './CartDrawer';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { ShiftModal } from './ShiftModal';
import { BluetoothPrinterModal } from '../shared/BluetoothPrinterModal';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { usePrinter } from '../../hooks/usePrinter';
import {
  Coffee,
  Search,
  ShoppingBag,
  Wifi,
  WifiOff,
  Clock,
  Printer,
  History,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Bluetooth,
} from 'lucide-react';

interface PosLayoutProps {
  currentUser: UserProfile;
  settings: BusinessSettings;
  onNavigateToAdmin?: () => void;
  onSwitchUser?: () => void;
}

export const PosLayout: React.FC<PosLayoutProps> = ({
  currentUser,
  settings,
  onNavigateToAdmin,
  onSwitchUser,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  // Modals state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | undefined>();
  const [currentReceiptSale, setCurrentReceiptSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isReceiptReprint, setIsReceiptReprint] = useState<boolean>(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState<boolean>(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  // Shift, Sync & Bluetooth state
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusSummary>(syncService.getStatus());
  const { isConnected: isBtConnected, deviceName: btDeviceName } = usePrinter();

  const canAccessAdmin = hasPermission(currentUser.role, 'access_admin');

  // Load products and active shift
  const loadInitialData = async () => {
    const allProds = await db.products.toArray();
    const prods = allProds.filter((p) => p.active);
    setProducts(prods);

    const shift = await db.shifts.where('status').equals('open').first();
    setCurrentShift(shift || null);

    const sales = await db.sales.orderBy('createdAt').reverse().limit(10).toArray();
    setRecentSales(sales);
  };

  useEffect(() => {
    loadInitialData();
    const unsubSync = syncService.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => {
      unsubSync();
    };
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const handleAddToCart = (newItem: SaleItem) => {
    setCartItems((prev) => {
      // Check if identical item (same product, variant, modifiers, and notes) already exists
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === newItem.productId &&
          i.variantId === newItem.variantId &&
          i.notes === newItem.notes &&
          JSON.stringify(i.selectedModifiers) === JSON.stringify(newItem.selectedModifiers)
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += newItem.quantity;
        updated[existingIdx].itemTotal =
          updated[existingIdx].quantity * updated[existingIdx].unitPrice;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQty, itemTotal: newQty * item.unitPrice }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscount(0);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const tax = Math.round(((subtotal - discount) * settings.taxRatePercent) / 100);
  const grandTotal = Math.max(0, subtotal - discount + tax);

  // Manual payment submission
  const handleConfirmPayment = async (
    method: PaymentMethod,
    amountPaid: number,
    change: number,
    ref?: string,
    notes?: string
  ) => {
    if (!currentShift) {
      setPaymentError('Tidak ada shift kasir yang aktif. Buka shift terlebih dahulu.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(undefined);

    try {
      const result = await processSale({
        items: cartItems,
        subtotal,
        discount,
        tax,
        grandTotal,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        shiftId: currentShift.id,
        paymentMethod: method,
        amountPaid,
        change,
        externalReference: ref,
        notes,
        isOffline: !syncStatus.isOnline,
      });

      if (!result.success) {
        setPaymentError(result.error || 'Gagal memproses transaksi');
        setIsProcessingPayment(false);
        return;
      }

      // Success: clear cart, close payment, open receipt
      setCartItems([]);
      setDiscount(0);
      setIsPaymentOpen(false);
      setIsCartOpen(false);
      setCurrentReceiptSale(result.sale);
      setIsReceiptReprint(false);
      setIsReceiptOpen(true);
      await loadInitialData();
    } catch (err: any) {
      setPaymentError(err.message || 'Terjadi kesalahan sistem saat memproses transaksi');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Reprint receipt
  const handleReprint = async (sale: Sale) => {
    const updated = await logReceiptReprint(sale.id, currentUser.name);
    setCurrentReceiptSale(updated || sale);
    setIsReceiptReprint(true);
    setIsReceiptOpen(true);
    setIsHistoryOpen(false);
    await loadInitialData();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none">
      {/* 1. TOP BAR */}
      <header className="bg-stone-900 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Coffee size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm tracking-wide">CAOZY</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded uppercase">
                POS
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Kasir: <strong className="text-stone-200">{currentUser.name}</strong> ({currentUser.role})
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Bluetooth Thermal Printer button */}
          <button
            type="button"
            onClick={() => setIsBluetoothModalOpen(true)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isBtConnected
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400'
                : 'bg-stone-800 hover:bg-stone-700 border-stone-700/80 text-stone-300'
            }`}
            title="Koneksi Printer Bluetooth Thermal"
          >
            <Bluetooth size={13} className={isBtConnected ? 'text-emerald-400' : 'text-stone-400'} />
            <span className="text-[11px] hidden sm:inline">
              {isBtConnected ? (btDeviceName || 'Printer') : 'Printer'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBtConnected ? 'bg-emerald-400' : 'bg-stone-500'
              }`}
            />
          </button>

          {/* Shift status button */}
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700/80 rounded-xl text-xs font-semibold text-stone-300 transition-colors"
            title="Kelola Shift & Kas"
          >
            <Clock size={13} className="text-amber-400" />
            <span className={currentShift ? 'text-emerald-400 font-bold' : 'text-stone-500'}>
              {currentShift ? 'Shift Buka' : 'Tutup'}
            </span>
          </button>

          {/* Offline / Syncing / Online Status Indicator */}
          <SyncStatusIndicator syncStatus={syncStatus} />

          {/* Transaction History / Reprint */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="p-1.5 sm:p-2 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700/80 transition-colors"
            title="Riwayat Transaksi & Cetak Ulang Struk"
          >
            <History size={15} />
          </button>

          {/* Admin Navigation (Only if authorized) */}
          {canAccessAdmin && onNavigateToAdmin && (
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-bold text-amber-400 transition-colors"
              title="Ke Admin ERP"
            >
              <span className="hidden sm:inline">Admin</span>
              <ArrowRight size={13} />
            </button>
          )}

          {/* Switch User Helper */}
          {onSwitchUser && (
            <button
              type="button"
              onClick={onSwitchUser}
              className="text-xs p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700/80 text-stone-300"
              title="Ganti Akun Pengujian"
            >
              {currentUser.avatar || '👤'}
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN POS WORKSPACE (Catalog Left, Persistent Cart Right on Desktop) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left catalog panel */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Search & Categories Bar */}
          <div className="p-3 sm:p-4 bg-stone-900/60 border-b border-stone-800/80 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu minuman (kopi, matcha, boba...)"
                className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Category Pills (Horizontal scrollable) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'Semua Menu' },
                { id: 'coffee', label: '☕ Kopi & Espresso' },
                { id: 'tea', label: '🍵 Teh & Matcha' },
                { id: 'mocktail', label: '🍋 Mocktail & Segar' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="p-3 sm:p-4 flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setCustomizingProduct(product)}
                  className="bg-stone-900/70 border border-stone-800 hover:border-amber-500/60 rounded-2xl p-3.5 text-left flex flex-col justify-between group active:scale-[0.98] transition-all hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-stone-500 font-semibold uppercase">
                        {product.code}
                      </span>
                      <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded font-medium">
                        {product.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-stone-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-stone-400 line-clamp-2 mt-1 leading-snug">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-stone-800/60">
                    <span className="text-xs sm:text-sm font-black text-amber-400">
                      {formatIDR(product.basePrice)}
                    </span>
                    <span className="text-[11px] font-bold text-stone-400 group-hover:text-white flex items-center gap-0.5">
                      Pilih +
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-12 text-center text-stone-500">
                <p className="text-sm">Tidak ada menu yang sesuai dengan pencarian.</p>
              </div>
            )}
          </div>
        </main>

        {/* Right Cart Panel (Always visible on desktop, drawer on mobile) */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onProceedToPayment={() => setIsPaymentOpen(true)}
          discount={discount}
          onSetDiscount={setDiscount}
          taxRatePercent={settings.taxRatePercent}
        />
      </div>

      {/* 3. MOBILE FLOATING CART TRIGGER */}
      <div className="lg:hidden p-3 bg-stone-900 border-t border-stone-800 sticky bottom-0 z-20">
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          disabled={cartItems.length === 0}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-between shadow-xl shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingBag size={20} />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-stone-950 text-amber-400 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </div>
            <span className="text-xs font-extrabold">Lihat Pesanan</span>
          </div>
          <span className="font-black text-sm">{formatIDR(grandTotal)}</span>
        </button>
      </div>

      {/* 4. MODALS */}
      {customizingProduct && (
        <ProductCustomizerModal
          product={customizingProduct}
          isOpen={!!customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {isPaymentOpen && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          grandTotal={grandTotal}
          onConfirmPayment={handleConfirmPayment}
          isProcessing={isProcessingPayment}
          errorMessage={paymentError}
        />
      )}

      {isReceiptOpen && currentReceiptSale && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setCurrentReceiptSale(null);
          }}
          sale={currentReceiptSale}
          settings={settings}
          isReprint={isReceiptReprint}
          onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
        />
      )}

      {isBluetoothModalOpen && (
        <BluetoothPrinterModal
          isOpen={isBluetoothModalOpen}
          onClose={() => setIsBluetoothModalOpen(false)}
          paperWidth={settings.receiptPaperWidth}
        />
      )}

      {isShiftModalOpen && (
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          shift={currentShift}
          onShiftClosed={async () => {
            await loadInitialData();
          }}
        />
      )}

      {/* Transaction History Modal in POS */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-stone-900 border border-stone-800 rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <History size={16} className="text-amber-400" />
                <span>Riwayat Transaksi Kasir</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {recentSales.length === 0 ? (
                <p className="text-xs text-stone-500 text-center py-6">Belum ada transaksi hari ini.</p>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 bg-stone-800/40 border border-stone-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-200">{sale.transactionNumber}</div>
                      <div className="text-[10px] text-stone-400">
                        {new Date(sale.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {sale.payment?.method.toUpperCase()} • {formatIDR(sale.grandTotal)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReprint(sale)}
                      className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-amber-400 font-bold rounded-lg text-xs flex items-center gap-1"
                    >
                      <Printer size={13} />
                      <span>Struk</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
