import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { UserProfile, Role, Permission } from '../../types';
import {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  ALL_PERMISSIONS,
  hasPermission,
} from '../../lib/permissions';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Check,
  X,
  Edit2,
  Trash2,
  Crown,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Mail,
  User,
  Coffee,
} from 'lucide-react';

const COMMON_AVATARS = ['👑', '🛡️', '☕', '🧑‍🍳', '📦', '💻', '💼', '🥤', '✨', '🍋'];

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<Role>('cashier');
  const [avatar, setAvatar] = useState<string>('☕');
  const [isCustomAccess, setIsCustomAccess] = useState<boolean>(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadUsers = async () => {
    const list = await db.users.toArray();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('cashier');
    setAvatar('☕');
    setIsCustomAccess(false);
    setSelectedPermissions(ROLE_PERMISSIONS.cashier || []);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setAvatar(u.avatar || '☕');
    setIsCustomAccess(Boolean(u.isCustomAccess));
    setSelectedPermissions(
      u.customPermissions && u.customPermissions.length > 0
        ? u.customPermissions
        : ROLE_PERMISSIONS[u.role] || []
    );
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    // If not in custom mode, update selected permissions to role template
    if (!isCustomAccess) {
      setSelectedPermissions(ROLE_PERMISSIONS[newRole] || []);
    }
  };

  const togglePermission = (permId: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSelectAllPerms = () => {
    setSelectedPermissions(ALL_PERMISSIONS.map((p) => p.id));
  };

  const handleClearAllPerms = () => {
    setSelectedPermissions([]);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName || !cleanEmail) {
      setErrorMsg('Nama dan email wajib diisi.');
      return;
    }

    // Check duplicate email
    const duplicate = users.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.id !== editingUser?.id
    );
    if (duplicate) {
      setErrorMsg('Email ini sudah terdaftar untuk pengguna lain.');
      return;
    }

    const userId = editingUser ? editingUser.id : `usr-${Date.now()}`;
    const userData: UserProfile = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      role,
      avatar,
      isCustomAccess,
      customPermissions: isCustomAccess ? selectedPermissions : undefined,
    };

    await db.users.put(userData);

    await db.auditLogs.add({
      id: `audit-usr-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: editingUser ? 'UPDATE_USER' : 'CREATE_USER',
      entity: 'user',
      entityId: userId,
      details: `${editingUser ? 'Memperbarui' : 'Menambahkan'} akun pengguna: ${cleanName} (${cleanEmail}) - Role: ${role}${
        isCustomAccess ? ' [Custom Access]' : ' [Template Role]'
      }`,
    });

    setIsModalOpen(false);
    await loadUsers();
    setSuccessMsg(
      `Pengguna "${cleanName}" berhasil disimpan! Pengguna kini dapat masuk dengan email ${cleanEmail} via kode OTP.`
    );
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.role === 'owner' && user.id === 'usr-hirakada') {
      alert('Akun Pemilik Utama (Hirakada) tidak dapat dihapus untuk keamanan sistem.');
      return;
    }

    const ok = confirm(`Hapus akun pengguna "${user.name}" (${user.email})?`);
    if (!ok) return;

    await db.users.delete(user.id);
    await db.auditLogs.add({
      id: `audit-usr-del-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: 'usr-hirakada',
      actorName: 'Hirakada (Owner)',
      action: 'DELETE_USER',
      entity: 'user',
      entityId: user.id,
      details: `Menghapus akun pengguna: ${user.name} (${user.email})`,
    });

    await loadUsers();
    setSuccessMsg(`Pengguna "${user.name}" telah dihapus.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Group permissions by category for clear UI presentation
  const groupedPermissions = ALL_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, typeof ALL_PERMISSIONS>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users size={22} className="text-[#b6d333]" />
            <span>Manajemen Pengguna & Hak Akses (RBAC)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Daftarkan akun kasir, barista, atau manajer dengan template role atau hak akses kustom (custom permissions).
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer"
        >
          <UserPlus size={16} />
          <span>+ Tambah Pengguna Baru</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const isOwner = u.role === 'owner';
          const activePermsCount = u.isCustomAccess
            ? u.customPermissions?.length || 0
            : (ROLE_PERMISSIONS[u.role] || []).length;

          return (
            <div
              key={u.id}
              className="p-4 bg-[#232529] border border-stone-800 hover:border-stone-700 rounded-2xl space-y-3 transition-colors text-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-1.5 bg-[#1a1b1e] rounded-xl border border-stone-800">
                    {u.avatar || '🧑‍🍳'}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm">{u.name}</span>
                      {isOwner && (
                        <span title="Pemilik Toko">
                          <Crown size={13} className="text-amber-400" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400 block">{u.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(u)}
                    className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                    title="Ubah Pengguna & Hak Akses"
                  >
                    <Edit2 size={13} />
                  </button>
                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u)}
                      className="p-1.5 text-stone-500 hover:text-red-400 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Hapus Pengguna"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Role & Access Info */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-400">Role:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded uppercase text-[10px] ${
                      isOwner
                        ? 'bg-[#b6d333]/15 text-[#b6d333] border border-[#b6d333]/30'
                        : u.role === 'manager'
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        : 'bg-stone-800 text-stone-300 border border-stone-700'
                    }`}
                  >
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>

                <div>
                  {u.isCustomAccess ? (
                    <span className="text-[#b6d333] font-bold text-[10px] bg-[#b6d333]/10 px-1.5 py-0.5 rounded border border-[#b6d333]/30">
                      Custom ({activePermsCount} Akses)
                    </span>
                  ) : (
                    <span className="text-stone-400 text-[10px]">
                      Template ({activePermsCount} Akses)
                    </span>
                  )}
                </div>
              </div>

              {/* Quick capabilities preview */}
              <div className="flex flex-wrap gap-1 pt-1">
                {u.isCustomAccess && u.customPermissions ? (
                  u.customPermissions.slice(0, 3).map((p) => (
                    <span
                      key={p}
                      className="text-[9px] bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded"
                    >
                      ✓ {p.replace(/_/g, ' ')}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-stone-500 italic">
                    {isOwner
                      ? 'Akses penuh tanpa batasan'
                      : `Akses standar ${ROLE_LABELS[u.role]}`}
                  </span>
                )}
                {u.isCustomAccess &&
                  u.customPermissions &&
                  u.customPermissions.length > 3 && (
                    <span className="text-[9px] text-[#b6d333] font-bold">
                      +{u.customPermissions.length - 3} lainnya
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT USER & PERMISSIONS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#232529] border border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#b6d333]" />
                <span>
                  {editingUser ? 'Ubah Pengguna & Hak Akses' : 'Tambah Pengguna Baru'}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Rian Barista"
                    className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
                  />
                </div>

                <div>
                  <label className="text-stone-300 font-bold block mb-1">
                    Email (Digunakan Login via OTP) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@caozy.id"
                    className="w-full bg-[#1a1b1e] border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#b6d333]"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="text-stone-300 font-bold block mb-1.5">Pilih Avatar</label>
                <div className="flex flex-wrap gap-2 p-2 bg-[#1a1b1e] border border-stone-800 rounded-xl">
                  {COMMON_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-all ${
                        avatar === av
                          ? 'bg-[#b6d333] text-stone-950 scale-110 shadow-sm'
                          : 'hover:bg-stone-800 text-white'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Template Selector */}
              <div>
                <label className="text-stone-300 font-bold block mb-1.5">
                  Template Peran (Role Template)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(ROLE_LABELS) as Role[]).map((rKey) => {
                    const isSelected = role === rKey;
                    return (
                      <button
                        key={rKey}
                        type="button"
                        onClick={() => handleRoleChange(rKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#b6d333]/15 border-[#b6d333] text-white shadow-xs'
                            : 'bg-[#1a1b1e] border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <span className="font-bold block text-xs capitalize">
                          {ROLE_LABELS[rKey]}
                        </span>
                        <span className="text-[10px] text-stone-500 mt-0.5 block">
                          {rKey === 'owner'
                            ? 'Akses penuh sistem'
                            : rKey === 'cashier'
                            ? 'Kasir POS & pesanan'
                            : rKey === 'manager'
                            ? 'Admin & laporan'
                            : rKey === 'inventory'
                            ? 'Gudang & stok FIFO'
                            : 'Keuangan & biaya'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode Hak Akses Toggle */}
              <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-2">
                <span className="text-stone-300 font-bold block text-xs">
                  Mode Hak Akses Pengguna
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#1a1b1e] border border-stone-800 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="accessMode"
                      checked={!isCustomAccess}
                      onChange={() => {
                        setIsCustomAccess(false);
                        setSelectedPermissions(ROLE_PERMISSIONS[role] || []);
                      }}
                      className="accent-[#b6d333]"
                    />
                    <span>Gunakan Template Role ({ROLE_LABELS[role]})</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#1a1b1e] border border-stone-800 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="accessMode"
                      checked={isCustomAccess}
                      onChange={() => setIsCustomAccess(true)}
                      className="accent-[#b6d333]"
                    />
                    <span>Kustomisasi Akses Spesifik (Custom)</span>
                  </label>
                </div>
              </div>

              {/* Custom Permissions Checklist */}
              {isCustomAccess && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders size={14} className="text-[#b6d333]" />
                      <span>Daftar Izin & Hak Akses ({selectedPermissions.length} Dipilih)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllPerms}
                        className="text-[11px] text-[#b6d333] hover:underline font-bold cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-stone-600">•</span>
                      <button
                        type="button"
                        onClick={handleClearAllPerms}
                        className="text-[11px] text-stone-400 hover:text-white cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                      <div
                        key={groupName}
                        className="p-3 bg-[#1a1b1e] border border-stone-800 rounded-xl space-y-2"
                      >
                        <span className="text-[11px] font-bold text-stone-300 block uppercase tracking-wider">
                          {groupName}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {perms.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-[#b6d333]/10 border-[#b6d333]/40 text-white'
                                    : 'bg-stone-900 border-stone-800/80 text-stone-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.id)}
                                  className="accent-[#b6d333] mt-0.5 rounded"
                                />
                                <div className="space-y-0.5">
                                  <span className="font-bold text-[11px] block text-stone-200">
                                    {perm.label}
                                  </span>
                                  <span className="text-[10px] text-stone-500 block leading-tight">
                                    {perm.desc}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-stone-800 flex justify-end gap-2">
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
                  {editingUser ? 'Simpan Perubahan' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
