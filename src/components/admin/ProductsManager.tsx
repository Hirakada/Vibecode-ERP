import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { Product, ProductVariant, MenuCategory } from '../../types';
import { formatIDR } from '../../lib/currency';
import { CategoryManagerModal } from './CategoryManagerModal';
import {
  Coffee,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Search,
  Sparkles,
  Layers,
  Tag,
  FolderPlus,
} from 'lucide-react';

export const ProductsManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isCreatingCategoryInline, setIsCreatingCategoryInline] = useState<boolean>(false);
  const [inlineCategoryName, setInlineCategoryName] = useState<string>('');
  const [inlineCategoryIcon, setInlineCategoryIcon] = useState<string>('☕');
  const [description, setDescription] = useState<string>('');
  const [basePrice, setBasePrice] = useState<number>(18000);
  const [active, setActive] = useState<boolean>(true);
  const [includeLargeVariant, setIncludeLargeVariant] = useState<boolean>(true);
  const [largeVariantDelta, setLargeVariantDelta] = useState<number>(4000);

  const load = async () => {
    const prods = await db.products.toArray();
    const cats = await db.categories.toArray();
    setProducts(prods);
    setCategories(cats);
  };

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    const nextNum = products.length + 1;
    setCode(`PROD-${nextNum < 10 ? '0' : ''}${nextNum}`);
    setName('');
    setCategory(categories.length > 0 ? categories[0].name : '');
    setIsCreatingCategoryInline(categories.length === 0);
    setInlineCategoryName('');
    setInlineCategoryIcon('☕');
    setDescription('');
    setBasePrice(18000);
    setActive(true);
    setIncludeLargeVariant(true);
    setLargeVariantDelta(4000);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category);
    setIsCreatingCategoryInline(false);
    setInlineCategoryName('');
    setDescription(p.description);
    setBasePrice(p.basePrice);
    setActive(p.active);
    const hasLarge = p.variants.some((v) => v.name.toLowerCase().includes('large'));
    setIncludeLargeVariant(hasLarge);
    const largeVar = p.variants.find((v) => v.name.toLowerCase().includes('large'));
    setLargeVariantDelta(largeVar ? largeVar.priceDelta : 4000);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalCategory = category;
    if (isCreatingCategoryInline && inlineCategoryName.trim()) {
      const catName = inlineCategoryName.trim();
      const existing = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (!existing) {
        const newCat: MenuCategory = {
          id: `cat-${Date.now()}`,
          name: catName,
          icon: inlineCategoryIcon,
          displayOrder: categories.length + 1,
          createdAt: new Date().toISOString(),
        };
        await db.categories.add(newCat);
      }
      finalCategory = catName;
    }

    if (!finalCategory) {
      finalCategory = 'Umum';
    }

    const variants: ProductVariant[] = [
      { id: 'var-reg', name: 'Regular (16oz)', priceDelta: 0 },
    ];
    if (includeLargeVariant) {
      variants.push({
        id: 'var-large',
        name: 'Large (22oz)',
        priceDelta: Number(largeVariantDelta) || 0,
      });
    }

    const prodId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    const productData: Product = {
      id: prodId,
      code: code.trim() || `PROD-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      category: finalCategory,
      description: description.trim(),
      basePrice: Number(basePrice) || 0,
      active,
      variants,
      modifiers: editingProduct ? editingProduct.modifiers : [],
    };

    await db.products.put(productData);

    // Record audit
    await db.auditLogs.add({
      id: `audit-prod-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: editingProduct ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
      entity: 'product',
      entityId: prodId,
      details: `${editingProduct ? 'Memperbarui' : 'Menambahkan'} produk menu: ${productData.name} (${formatIDR(productData.basePrice)})`,
    });

    setIsModalOpen(false);
    await load();
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${prodName}"?`)) {
      await db.products.delete(id);
      await db.auditLogs.add({
        id: `audit-prod-del-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: 'usr-hirakada',
        actorName: 'Hirakada (Owner)',
        action: 'DELETE_PRODUCT',
        entity: 'product',
        entityId: id,
        details: `Menghapus produk: ${prodName}`,
      });
      await load();
    }
  };

  const toggleProductActive = async (product: Product) => {
    product.active = !product.active;
    await db.products.put(product);
    await load();
  };

  const filtered = products.filter((p) => {
    const matchesCategory =
      selectedFilterCategory === 'all' || p.category.toLowerCase() === selectedFilterCategory.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Coffee size={24} className="text-[#b6d333]" />
            <span>Katalog & Menu Minuman</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Kelola menu produk Caozy, kategori buatan sendiri, harga jual dasar, dan varian ukuran.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu..."
              className="bg-[#232529] border border-stone-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#b6d333]"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700/80 text-stone-200 font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap"
            title="Kelola Kategori Manual"
          >
            <Tag size={14} className="text-[#b6d333]" />
            <span>Kategori ({categories.length})</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Tambah Menu Minuman</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Info Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-stone-800/80">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedFilterCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedFilterCategory === 'all'
                ? 'bg-[#b6d333] text-stone-950 font-black shadow-xs'
                : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter(
              (p) => p.category.toLowerCase() === cat.name.toLowerCase()
            ).length;
            const isSelected = selectedFilterCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedFilterCategory(cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#b6d333] text-stone-950 font-black shadow-xs'
                    : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>{cat.icon || '☕'}</span>
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
        {categories.length === 0 && (
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="text-[11px] text-[#b6d333] hover:underline font-bold whitespace-nowrap flex items-center gap-1 cursor-pointer"
          >
            <FolderPlus size={13} />
            <span>+ Buat Kategori Manual</span>
          </button>
        )}
      </div>

      {/* Grid of Products */}
      {filtered.length === 0 ? (
        <div className="bg-[#232529] border border-stone-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-[#b6d333]/30 flex items-center justify-center text-[#b6d333] mx-auto">
            <Coffee size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Menu Minuman</h3>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Buat menu minuman pertama Anda untuk ditampilkan di kasir POS dan mulai mencatat penjualan.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-[#b6d333]/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Buat Menu Pertama Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="bg-[#232529] border border-stone-800 hover:border-stone-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-stone-400 font-bold uppercase">
                    {product.code}
                  </span>
                  <span className="text-[10px] bg-stone-800 text-[#b6d333] border border-[#b6d333]/20 px-2 py-0.5 rounded font-semibold uppercase">
                    {product.category}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white">{product.name}</h3>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                  {product.description || 'Tidak ada deskripsi'}
                </p>

                {/* Variants */}
                {product.variants.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-stone-800 text-[11px] text-stone-300 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">
                      Varian Ukuran:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {product.variants.map((v) => (
                        <span
                          key={v.id}
                          className="bg-stone-800/80 px-2 py-0.5 rounded text-stone-300 border border-stone-700/60"
                        >
                          {v.name} {v.priceDelta > 0 && `(+${formatIDR(v.priceDelta)})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Harga Jual Dasar</span>
                    <span className="text-base font-black text-[#b6d333]">
                      {formatIDR(product.basePrice)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProductActive(product)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      product.active
                        ? 'bg-[#b6d333]/15 text-[#b6d333] border border-[#b6d333]/30'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {product.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <span>{product.active ? 'Aktif di POS' : 'Non-aktif'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-800/60">
                  <button
                    type="button"
                    onClick={() => openEditModal(product)}
                    className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Ubah Menu"
                  >
                    <Edit2 size={13} />
                    <span>Ubah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                    className="p-1.5 text-stone-400 hover:text-red-400 rounded-lg hover:bg-stone-800 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Hapus Menu"
                  >
                    <Trash2 size={13} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#232529] border border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Coffee size={18} className="text-[#b6d333]" />
                <span>{editingProduct ? 'Ubah Menu Minuman' : 'Tambah Menu Minuman Baru'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Kode Produk</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Contoh: PROD-01"
                    className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-300 font-bold block">Kategori Menu</label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategoryInline(!isCreatingCategoryInline)}
                      className="text-[10px] text-[#b6d333] hover:underline font-bold cursor-pointer"
                    >
                      {isCreatingCategoryInline ? 'Pilih Yang Ada' : '+ Kategori Baru'}
                    </button>
                  </div>

                  {isCreatingCategoryInline ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={inlineCategoryIcon}
                        onChange={(e) => setInlineCategoryIcon(e.target.value)}
                        className="bg-[#1a1b1e] border border-stone-700 rounded-xl px-2 py-2 text-xs text-white shrink-0"
                      >
                        <option value="☕">☕ Kopi</option>
                        <option value="🍵">🍵 Teh</option>
                        <option value="🧋">🧋 Boba</option>
                        <option value="🍹">🍹 Mocktail</option>
                        <option value="🥛">🥛 Susu</option>
                        <option value="🍋">🍋 Buah</option>
                        <option value="🥐">🥐 Roti</option>
                        <option value="🥤">🥤 Cup</option>
                        <option value="✨">✨ Signature</option>
                      </select>
                      <input
                        type="text"
                        required={isCreatingCategoryInline}
                        value={inlineCategoryName}
                        onChange={(e) => setInlineCategoryName(e.target.value)}
                        placeholder="Nama kategori..."
                        className="w-full min-w-0 bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#b6d333]"
                      />
                    </div>
                  ) : (
                    <div>
                      {categories.length === 0 ? (
                        <div className="p-2 bg-stone-900 border border-stone-800 rounded-xl text-center space-y-1">
                          <p className="text-[10px] text-stone-400">Belum ada kategori manual.</p>
                          <button
                            type="button"
                            onClick={() => setIsCreatingCategoryInline(true)}
                            className="px-2.5 py-1 bg-[#b6d333] text-stone-950 font-black rounded text-[10px]"
                          >
                            + Buat Kategori Pertama
                          </button>
                        </div>
                      ) : (
                        <select
                          value={category}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              setIsCreatingCategoryInline(true);
                            } else {
                              setCategory(e.target.value);
                            }
                          }}
                          className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.icon || '☕'} {c.name}
                            </option>
                          ))}
                          <option value="__add_new__">+ Buat Kategori Baru...</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Nama Minuman</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Susu Aren Caozy Signature"
                  className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Biji kopi arabica gayo pilihan dengan susu segar dan sirup aren..."
                  className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Harga Jual Dasar (Regular) - Rp
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-[#b6d333]"
                />
              </div>

              {/* Varian Large */}
              <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-200">
                  <input
                    type="checkbox"
                    checked={includeLargeVariant}
                    onChange={(e) => setIncludeLargeVariant(e.target.checked)}
                    className="accent-[#b6d333] w-4 h-4 rounded"
                  />
                  <span>Sediakan Varian Ukuran Large (22oz)</span>
                </label>
                {includeLargeVariant && (
                  <div className="pl-6 space-y-1">
                    <span className="text-[11px] text-stone-400 block">
                      Tambahan Harga Varian Large (+Rp):
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={largeVariantDelta}
                      onChange={(e) => setLargeVariantDelta(Number(e.target.value))}
                      className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#b6d333]"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="accent-[#b6d333] w-4 h-4 rounded"
                  />
                  <span>Langsung Aktifkan di POS Kasir</span>
                </label>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer"
                >
                  {editingProduct ? 'Simpan Perubahan' : 'Buat Menu Minuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesChanged={load}
      />
    </div>
  );
};
