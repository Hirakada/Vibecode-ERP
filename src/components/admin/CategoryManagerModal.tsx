import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { MenuCategory } from '../../types';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

const COMMON_EMOJIS = ['☕', '🍵', '🧋', '🍹', '🥛', '🍋', '🥤', '🥐', '🍰', '🍨', '🥑', '✨', '🍪', '🧇'];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  onCategoriesChanged,
}) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<string>('☕');
  const [description, setDescription] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const loadCategories = async () => {
    const cats = await db.categories.toArray();
    setCategories(cats);

    // Count products per category
    const prods = await db.products.toArray();
    const counts: Record<string, number> = {};
    for (const p of prods) {
      const key = p.category;
      counts[key] = (counts[key] || 0) + 1;
    }
    setProductCounts(counts);
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setIsAdding(false);
      setEditingCategory(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingCategory(null);
    setName('');
    setIcon('☕');
    setDescription('');
    setErrorMsg('');
    setIsAdding(true);
  };

  const handleStartEdit = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setIcon(cat.icon || '☕');
    setDescription(cat.description || '');
    setErrorMsg('');
    setIsAdding(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama kategori tidak boleh kosong.');
      return;
    }

    // Check duplicate name
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCategory?.id
    );
    if (duplicate) {
      setErrorMsg('Kategori dengan nama ini sudah ada.');
      return;
    }

    if (editingCategory) {
      // Update
      const oldName = editingCategory.name;
      const updatedCat: MenuCategory = {
        ...editingCategory,
        name: trimmedName,
        icon,
        description: description.trim(),
      };
      await db.categories.put(updatedCat);

      // If category name changed, optionally update products with old category name
      if (oldName !== trimmedName) {
        const affectedProds = await db.products.where('category').equals(oldName).toArray();
        for (const p of affectedProds) {
          p.category = trimmedName;
          await db.products.put(p);
        }
      }

      await db.auditLogs.add({
        id: `audit-cat-upd-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: 'usr-hirakada',
        actorName: 'Hirakada (Owner)',
        action: 'UPDATE_CATEGORY',
        entity: 'category',
        entityId: editingCategory.id,
        details: `Memperbarui kategori menu: ${trimmedName}`,
      });
    } else {
      // Create new
      const newCat: MenuCategory = {
        id: `cat-${Date.now()}`,
        name: trimmedName,
        icon,
        description: description.trim(),
        displayOrder: categories.length + 1,
        createdAt: new Date().toISOString(),
      };
      await db.categories.add(newCat);

      await db.auditLogs.add({
        id: `audit-cat-new-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: 'usr-hirakada',
        actorName: 'Hirakada (Owner)',
        action: 'CREATE_CATEGORY',
        entity: 'category',
        entityId: newCat.id,
        details: `Menambahkan kategori menu baru: ${trimmedName}`,
      });
    }

    setIsAdding(false);
    setEditingCategory(null);
    setName('');
    setErrorMsg('');
    await loadCategories();
    if (onCategoriesChanged) onCategoriesChanged();
  };

  const handleDelete = async (cat: MenuCategory) => {
    const count = productCounts[cat.name] || 0;
    const msg = count > 0
      ? `Kategori "${cat.name}" saat ini digunakan oleh ${count} menu. Apakah Anda yakin ingin menghapus kategori ini? (Menu terkait akan dipindah ke kategori "Lainnya")`
      : `Hapus kategori menu "${cat.name}"?`;

    if (confirm(msg)) {
      await db.categories.delete(cat.id);

      // If products exist in this category, reassign to 'Lainnya'
      if (count > 0) {
        const affectedProds = await db.products.where('category').equals(cat.name).toArray();
        for (const p of affectedProds) {
          p.category = 'Lainnya';
          await db.products.put(p);
        }
      }

      await db.auditLogs.add({
        id: `audit-cat-del-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: 'usr-hirakada',
        actorName: 'Hirakada (Owner)',
        action: 'DELETE_CATEGORY',
        entity: 'category',
        entityId: cat.id,
        details: `Menghapus kategori: ${cat.name}`,
      });

      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#232529] border border-stone-800 rounded-3xl p-6 space-y-5 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#b6d333]/15 border border-[#b6d333]/30 flex items-center justify-center text-[#b6d333]">
              <Tag size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Kelola Kategori Menu</h2>
              <p className="text-[11px] text-stone-400">Buat dan atur kategori menu minuman secara manual</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-stone-800/80 hover:bg-stone-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Add / Edit Form Card */}
        {isAdding ? (
          <form onSubmit={handleSave} className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <span className="text-xs font-bold text-[#b6d333] flex items-center gap-1.5">
                <FolderPlus size={14} />
                <span>{editingCategory ? 'Ubah Kategori Menu' : 'Tambah Kategori Menu Baru'}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingCategory(null);
                  setErrorMsg('');
                }}
                className="text-[11px] text-stone-400 hover:text-white"
              >
                Batal
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-stone-300 block mb-1">
                Pilih Emoji / Ikon Kategori
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#1a1b1e] rounded-xl border border-stone-800">
                {COMMON_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-transform cursor-pointer ${
                      icon === e
                        ? 'bg-[#b6d333] text-stone-950 scale-110 shadow-sm'
                        : 'hover:bg-stone-800 text-white'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-300 block mb-1">
                Nama Kategori
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xl px-2 py-1 bg-[#1a1b1e] border border-stone-800 rounded-xl">
                  {icon}
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Susu Signature, Artisan Tea, Mocktail Segar..."
                  className="flex-1 bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#b6d333]"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-300 block mb-1">
                Deskripsi Singkat (Opsional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Olahan kopi espresso susu segar khas Caozy"
                className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#b6d333]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingCategory(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>{editingCategory ? 'Simpan Kategori' : 'Tambah Kategori'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-stone-400">
              Daftar Kategori ({categories.length})
            </span>
            <button
              type="button"
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black px-3 py-1.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Tambah Kategori Manual</span>
            </button>
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {categories.length === 0 ? (
            <div className="py-8 px-4 text-center bg-stone-900/40 rounded-2xl border border-stone-800 space-y-3">
              <div className="text-2xl">📋</div>
              <div>
                <h4 className="text-xs font-bold text-white">Belum Ada Kategori Menu</h4>
                <p className="text-[11px] text-stone-400 mt-1 max-w-xs mx-auto">
                  Kategori menu belum dibuat. Klik tombol di atas untuk membuat kategori sendiri secara manual (misal: Kopi, Teh, Cokelat, Mocktail).
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#b6d333] text-stone-950 font-black text-xs rounded-xl shadow-xs"
              >
                <Plus size={13} />
                <span>Buat Kategori Pertama</span>
              </button>
            </div>
          ) : (
            categories.map((cat) => {
              const count = productCounts[cat.name] || 0;
              return (
                <div
                  key={cat.id}
                  className="p-3 bg-[#1a1b1e] border border-stone-800 hover:border-stone-700 rounded-xl flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8 h-8 rounded-lg bg-stone-800/80 flex items-center justify-center">
                      {cat.icon || '☕'}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{cat.name}</span>
                        <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.2 rounded font-mono">
                          {count} menu
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Ubah Kategori"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 text-stone-400 hover:text-red-400 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Hapus Kategori"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
