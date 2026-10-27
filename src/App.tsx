import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  BusinessSettings,
} from './types';
import {
  db,
  DEMO_USERS,
  DEFAULT_SETTINGS,
  initializeDatabaseIfEmpty,
} from './lib/storage';
import { hasPermission } from './lib/permissions';
import { PosLayout } from './components/pos/PosLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { CaozyLogo } from './components/shared/CaozyLogo';
import { ShieldAlert, ArrowLeft, User, ShieldCheck } from 'lucide-react';

export default function App() {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[0]); // Default: Owner (Hirakada)
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [currentArea, setCurrentArea] = useState<'pos' | 'admin'>('pos');
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      await initializeDatabaseIfEmpty();
      const loadedSettings = await db.settings.get('global-settings');
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
      setIsInitialized(true);
    };
    init();
  }, []);

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'cashier' && currentArea === 'admin') {
      setCurrentArea('pos');
    }
    setIsUserSwitcherOpen(false);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#1a1b1e] flex flex-col items-center justify-center text-stone-300 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#232529] border border-[#b6d333]/30 flex items-center justify-center p-3 shadow-xl animate-pulse">
          <CaozyLogo variant="icon" size="lg" />
        </div>
        <div className="text-center space-y-1">
          <CaozyLogo variant="wordmark" size="sm" className="opacity-90" />
          <p className="text-xs font-semibold text-stone-400 tracking-wide">
            Memuat Sistem ERP & POS...
          </p>
        </div>
      </div>
    );
  }

  // Authorization check for Admin area
  const canAccessAdmin = hasPermission(currentUser.role, 'access_admin');
  if (currentArea === 'admin' && !canAccessAdmin) {
    return (
      <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#232529] border border-red-900/60 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-red-950/60 border border-red-800 rounded-2xl flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white">Akses Admin Ditolak (403)</h1>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Akun Anda sebagai <strong className="text-[#b6d333] uppercase">{currentUser.role}</strong> ({currentUser.name}) hanya memiliki izin akses ke modul Kasir POS.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentArea('pos')}
            className="w-full bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black py-3 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Kembali ke Kasir POS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1b1e] text-stone-100 antialiased selection:bg-[#b6d333] selection:text-stone-950">
      {/* User Switcher / Profile Modal */}
      {isUserSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#232529] border border-stone-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#b6d333]" />
                <h2 className="text-sm font-bold text-white">Akun Pengguna Aktif</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsUserSwitcherOpen(false)}
                className="text-stone-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Saat ini sistem dikonfigurasi khusus untuk satu pengguna dengan hak akses penuh (Owner):
            </p>
            <div className="space-y-2">
              {DEMO_USERS.map((u) => (
                <div
                  key={u.id}
                  className="w-full p-3.5 rounded-2xl border border-[#b6d333]/40 bg-[#b6d333]/10 text-white flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2b2b2b] border border-[#b6d333]/30 flex items-center justify-center text-xl shadow-xs">
                      {u.avatar || '👑'}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        <span className="text-[10px] bg-[#b6d333] text-stone-950 font-black px-1.5 py-0.2 rounded-sm uppercase">
                          Full Access
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold text-[#b6d333] bg-stone-900/80 px-2.5 py-1 rounded-lg border border-[#b6d333]/30">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsUserSwitcherOpen(false)}
              className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {currentArea === 'pos' ? (
        <PosLayout
          currentUser={currentUser}
          settings={settings}
          onNavigateToAdmin={() => setCurrentArea('admin')}
          onSwitchUser={() => setIsUserSwitcherOpen(true)}
        />
      ) : (
        <AdminLayout
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={setSettings}
          onSelectUser={handleSelectUser}
          onNavigateToPos={() => setCurrentArea('pos')}
        />
      )}
    </div>
  );
}
