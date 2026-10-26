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
import { ShieldAlert, ArrowLeft, Coffee, Sparkles } from 'lucide-react';

import { seedSampleDailySales } from './utils/seedSales';

export default function App() {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[0]); // Default: Owner
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [currentArea, setCurrentArea] = useState<'pos' | 'admin'>('pos');
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      await initializeDatabaseIfEmpty();
      const salesCount = await db.sales.count();
      if (salesCount === 0) {
        await seedSampleDailySales();
      }
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
    // If cashier tries to stay in admin, redirect to pos
    if (user.role === 'cashier' && currentArea === 'admin') {
      setCurrentArea('pos');
    }
    setIsUserSwitcherOpen(false);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-300 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
          <Coffee size={28} />
        </div>
        <p className="text-sm font-bold tracking-wide">Memuat Caozy ERP & POS...</p>
      </div>
    );
  }

  // Authorization check for Admin area
  const canAccessAdmin = hasPermission(currentUser.role, 'access_admin');
  if (currentArea === 'admin' && !canAccessAdmin) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-900 border border-red-900/60 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-red-950/60 border border-red-800 rounded-2xl flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white">Akses Admin Ditolak (403)</h1>
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              Akun Anda sebagai <strong className="text-amber-400 uppercase">{currentUser.role}</strong> ({currentUser.name}) hanya memiliki izin akses ke modul Kasir POS.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentArea('pos')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold py-3 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Kembali ke Kasir POS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 antialiased selection:bg-amber-500 selection:text-stone-950">
      {/* User Switcher Modal for Quick Role Testing */}
      {isUserSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h2 className="text-sm font-bold text-white">Ganti Akun Pengujian</h2>
              <button
                type="button"
                onClick={() => setIsUserSwitcherOpen(false)}
                className="text-stone-400 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Pilih pengguna untuk menguji izin dan tampilan antarmuka (Role-Based Access Control):
            </p>
            <div className="space-y-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    u.id === currentUser.id
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-stone-800 bg-stone-800/40 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{u.avatar}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{u.name}</div>
                      <div className="text-[10px] text-stone-500">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold text-amber-400 bg-stone-800 px-2 py-0.5 rounded">
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
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
