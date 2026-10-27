import React, { useState, useEffect } from 'react';
import {
  Product,
  SaleItem,
  Sale,
  UserProfile,
  BusinessSettings,
  CashierShift,
  PaymentMethod,
  DiscountInfo,
  MenuCategory,
} from '../../types';
import { db } from '../../lib/storage';
import { processSale, logReceiptReprint } from '../../services/salesService';
import { syncService, SyncStatusSummary } from '../../services/syncService';
import { formatIDR } from '../../lib/currency';
import { hasPermission } from '../../lib/permissions';
import { ProductCustomizerModal } from './ProductCustomizerModal';
import { CartDrawer } from './CartDrawer';
import { PaymentModal } from './PaymentModal';
import { DiscountModal } from './DiscountModal';
import { ReceiptModal } from './ReceiptModal';
import { ShiftModal } from './ShiftModal';
import { BluetoothPrinterModal } from '../shared/BluetoothPrinterModal';
import { CategoryManagerModal } from '../admin/CategoryManagerModal';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { CaozyLogo } from '../shared/CaozyLogo';
import { usePrinter } from '../../hooks/usePrinter';
import {
  Coffee,
  Search,
  ShoppingBag,
  Clock,
  Printer,
  History,
  ArrowRight,
  Bluetooth,
  PlusCircle,
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
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);

  // Modals state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | undefined>();
  const [currentReceiptSale, setCurrentReceiptSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isReceiptReprint, setIsReceiptReprint] = useState<boolean>(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
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

    const cats = await db.categories.toArray();
    setCategories(cats);

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

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchCategory =
      selectedCategory === 'all' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Cart operations
  const handleAddToCart = (item: SaleItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.variantId === item.variantId &&
          JSON.stringify(i.selectedModifiers) === JSON.stringify(item.selectedModifiers)
      );

      if (existingIndex > -1) {
        const next = [...prev];
        const exist = next[existingIndex];
        const newQty = exist.quantity + item.quantity;
        next[existingIndex] = {
          ...exist,
          quantity: newQty,
          itemTotal: exist.unitPrice * newQty,
        };
        return next;
      }
      return [...prev, item];
    });
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    setCartItems((prev) => {
      if (newQty <= 0) {
        return prev.filter((i) => i.id !== itemId);
      }
      return prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQty,
              itemTotal: item.unitPrice * newQty,
            }
          : item
      );
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setDiscountInfo(null);
  };

  // Cart calculations
  const rawSubtotal = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const netSubtotal = Math.max(0, rawSubtotal - discount);
  const tax = Math.round((netSubtotal * settings.taxRatePercent) / 100);
  const grandTotal = netSubtotal + tax;

  // Handle Payment Confirmation
  const handleConfirmPayment = async (
    method: PaymentMethod,
    amountPaid: number,
    change: number,
    referenceNumber?: string,
    notes?: string
  ) => {
    if (!currentShift) {
      setPaymentError('Shift kasir belum dibuka. Buka shift terlebih dahulu.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(undefined);

    try {
      const res = await processSale({
        items: cartItems,
        subtotal: rawSubtotal,
        discount,
        discountInfo: discountInfo || undefined,
        tax,
        grandTotal,
        paymentMethod: method,
        amountPaid,
        change,
        externalReference: referenceNumber,
        notes,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        shiftId: currentShift.id,
        isOffline: !syncStatus.isOnline,
      });

      if (res.success && res.sale) {
        // Reset cart and open receipt modal
        setCartItems([]);
        setDiscount(0);
        setDiscountInfo(null);
        setIsPaymentOpen(false);
        setCurrentReceiptSale(res.sale);
        setIsReceiptReprint(false);
        setIsReceiptOpen(true);
        await loadInitialData();
      } else {
        setPaymentError(res.error || 'Gagal memproses transaksi.');
      }
    } catch (err: any) {
      console.error('Payment checkout failed:', err);
      setPaymentError(err.message || 'Gagal memproses transaksi.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleReprint = async (sale: Sale) => {
    const updated = await logReceiptReprint(sale.id, currentUser.name);
    setCurrentReceiptSale(updated || sale);
    setIsReceiptReprint(true);
    setIsReceiptOpen(true);
    setIsHistoryOpen(false);
    await loadInitialData();
  };

  return (
    <div className="min-h-screen bg-[#1a1b1e] text-stone-100 flex flex-col font-sans select-none">
      {/* 1. TOP BAR */}
      <header className="bg-[#232529] border-b border-[#353840] px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <CaozyLogo variant="badge" size="sm" showText={false} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1.5">
                <span>caozy</span>
                <span className="text-[10px] bg-[#b6d333]/20 text-[#b6d333] border border-[#b6d333]/30 font-black px-1.5 py-0.2 rounded-sm uppercase">
                  POS
                </span>
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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isBtConnected
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400'
                : 'bg-stone-800/80 hover:bg-stone-700 border-stone-700/80 text-stone-300'
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
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-800/80 hover:bg-stone-700 border border-stone-700/80 rounded-xl text-xs font-semibold text-stone-300 transition-colors"
            title="Kelola Shift & Kas"
          >
            <Clock size={13} className="text-[#b6d333]" />
            <span className={currentShift ? 'text-[#b6d333] font-bold' : 'text-stone-500'}>
              {currentShift ? 'Shift Buka' : 'Tutup'}
            </span>
          </button>

          {/* Offline / Syncing / Online Status Indicator */}
          <SyncStatusIndicator syncStatus={syncStatus} />

          {/* Transaction History / Reprint */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="p-1.5 sm:p-2 text-stone-300 hover:text-white rounded-xl bg-stone-800/80 hover:bg-stone-700 border border-stone-700/80 transition-colors cursor-pointer"
            title="Riwayat Transaksi & Cetak Ulang Struk"
          >
            <History size={15} />
          </button>

          {/* Admin Navigation (Only if authorized) */}
          {canAccessAdmin && onNavigateToAdmin && (
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-[#b6d333]/15 hover:bg-[#b6d333]/25 border border-[#b6d333]/40 rounded-xl text-xs font-extrabold text-[#b6d333] transition-colors cursor-pointer"
              title="Ke Admin ERP"
            >
              <span>Admin</span>
              <ArrowRight size={13} />
            </button>
          )}

          {/* User Profile Badge */}
          {onSwitchUser && (
            <button
              type="button"
              onClick={onSwitchUser}
              className="text-xs p-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 border border-stone-700/80 text-stone-300 cursor-pointer"
              title="Profil Pengguna"
            >
              {currentUser.avatar || '👑'}
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN POS WORKSPACE (Catalog Left, Persistent Cart Right on Desktop) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left catalog panel */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Search & Categories Bar */}
          <div className="p-3 sm:p-4 bg-[#232529]/80 border-b border-[#353840] space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu minuman (kopi, matcha, boba...)"
                className="w-full bg-[#1a1b1e] border border-stone-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#b6d333] transition-colors"
              />
            </div>

            {/* Category Pills (Horizontal scrollable) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#b6d333] text-stone-950 shadow-md shadow-[#b6d333]/20 font-black'
                    : 'bg-[#1a1b1e] border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                Semua Menu ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.category.toLowerCase() === cat.name.toLowerCase()
                ).length;
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#b6d333] text-stone-950 shadow-md shadow-[#b6d333]/20 font-black'
                        : 'bg-[#1a1b1e] border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                    }`}
                  >
                    <span>{cat.icon || '☕'}</span>
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
              {canAccessAdmin && (
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-stone-800/80 hover:bg-stone-700 border border-stone-700/80 text-[#b6d333] flex items-center gap-1 cursor-pointer"
                  title="Kelola Kategori Manual"
                >
                  <span>+ Kategori</span>
                </button>
              )}
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
                  className="bg-[#232529] border border-stone-800 hover:border-[#b6d333]/60 rounded-2xl p-3.5 text-left flex flex-col justify-between group active:scale-[0.98] transition-all hover:shadow-lg hover:shadow-[#b6d333]/5 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-stone-400 font-semibold uppercase">
                        {product.code}
                      </span>
                      <span className="text-[10px] bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded font-medium">
                        {product.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-stone-100 group-hover:text-[#b6d333] transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-stone-400 line-clamp-2 mt-1 leading-snug">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-stone-800/80">
                    <span className="text-xs sm:text-sm font-black text-[#b6d333]">
                      {formatIDR(product.basePrice)}
                    </span>
                    <span className="text-[11px] font-bold text-stone-400 group-hover:text-white flex items-center gap-0.5">
                      Pilih +
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Empty States */}
            {filteredProducts.length === 0 && (
              <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[#232529] border border-[#b6d333]/30 flex items-center justify-center mx-auto p-3 shadow-lg">
                  <CaozyLogo variant="icon" size="lg" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {products.length === 0 ? 'Belum Ada Menu Minuman' : 'Menu Tidak Ditemukan'}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                    {products.length === 0
                      ? 'Database telah dibersihkan untuk input data manual. Tambahkan menu minuman pertama Anda di menu admin.'
                      : 'Tidak ada minuman yang sesuai dengan pencarian atau filter yang dipilih.'}
                  </p>
                </div>
                {products.length === 0 && onNavigateToAdmin && (
                  <button
                    type="button"
                    onClick={onNavigateToAdmin}
                    className="inline-flex items-center gap-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-[#b6d333]/20 transition-all cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    <span>Buka Admin & Buat Menu Produk</span>
                  </button>
                )}
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
          discountInfo={discountInfo}
          onOpenDiscountModal={() => setIsDiscountModalOpen(true)}
          onClearDiscount={() => {
            setDiscount(0);
            setDiscountInfo(null);
          }}
          taxRatePercent={settings.taxRatePercent}
        />
      </div>

      {/* 3. MOBILE FLOATING CART TRIGGER */}
      <div className="lg:hidden p-3 bg-[#232529] border-t border-[#353840] sticky bottom-0 z-20">
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          disabled={cartItems.length === 0}
          className="w-full bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black py-3.5 px-4 rounded-2xl flex items-center justify-between shadow-xl shadow-[#b6d333]/20 active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingBag size={20} />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-stone-950 text-[#b6d333] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
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

      {isDiscountModalOpen && (
        <DiscountModal
          isOpen={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          subtotal={rawSubtotal}
          currentUser={currentUser}
          currentDiscount={discountInfo}
          onApplyDiscount={(info) => {
            setDiscountInfo(info);
            setDiscount(info ? info.amount : 0);
            setIsDiscountModalOpen(false);
          }}
        />
      )}

      {isPaymentOpen && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          grandTotal={grandTotal}
          subtotal={rawSubtotal}
          discount={discount}
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
          <div className="w-full sm:max-w-md bg-[#232529] border border-stone-800 rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <History size={16} className="text-[#b6d333]" />
                <span>Riwayat Transaksi Kasir</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800 cursor-pointer"
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
                      className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[#b6d333] font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
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

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoriesChanged={loadInitialData}
        />
      )}
    </div>
  );
};
