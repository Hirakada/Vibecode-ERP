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
import { OwnerEmailAuthScreen } from './components/auth/OwnerEmailAuthScreen';
import {
  getSavedAuthSession,
  clearAuthSession,
  AuthSession,
  OWNER_EMAIL,
} from './services/authService';
import { ShieldAlert, ShieldCheck, Mail, LogOut, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [currentArea, setCurrentArea] = useState<'pos' | 'admin'>('pos');
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState<boolean>(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isUserSwitcherOpen) {
      db.users.toArray().then((users) => {
        setAvailableUsers(users);
      });
    }
  }, [isUserSwitcherOpen]);

  const handleSelectUser = (u: UserProfile) => {
    if (session) {
      const updatedSession: AuthSession = {
        ...session,
        user: u,
      };
      setSession(updatedSession);
      localStorage.setItem('caozy_owner_auth_session', JSON.stringify(updatedSession));
    }
    setIsUserSwitcherOpen(false);
  };

  useEffect(() => {
    const init = async () => {
      await initializeDatabaseIfEmpty();
      const loadedSettings = await db.settings.get('global-settings');
      if (loadedSettings) {
        setSettings(loadedSettings);
      }

      // Check saved authentication session
      const saved = getSavedAuthSession();
      if (saved) {
        setSession(saved);
      }

      setIsInitialized(true);
    };
    init();
  }, []);

  const handleLogout = async () => {
    const userToLog = session?.user;
    clearAuthSession();
    setSession(null);
    setIsUserSwitcherOpen(false);

    if (userToLog) {
      await db.auditLogs.add({
        id: `audit-logout-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: userToLog.id,
        actorName: `${userToLog.name} (${userToLog.role})`,
        action: 'LOGOUT_SESSION',
        entity: 'auth',
        entityId: userToLog.email,
        details: `Sesi ${userToLog.name} ditutup / layar dikunci.`,
      });
    }
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

  // If not authenticated with owner email, display the Owner Email Authentication Screen
  if (!session) {
    return (
      <OwnerEmailAuthScreen
        onAuthSuccess={(newSession) => {
          setSession(newSession);
        }}
      />
    );
  }

  const currentUser: UserProfile = session.user;

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
      {/* User Profile & Team Switcher Modal */}
      {isUserSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#232529] border border-stone-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#b6d333]" />
                <h2 className="text-sm font-bold text-white">Profil & Ganti Pengguna</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsUserSwitcherOpen(false)}
                className="text-stone-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-[#b6d333]/40 bg-[#b6d333]/10 text-white space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#2b2b2b] border border-[#b6d333]/40 flex items-center justify-center text-2xl shadow-xs">
                  {currentUser.avatar || '👑'}
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-[10px] bg-[#b6d333] text-stone-950 font-black px-1.5 py-0.2 rounded-sm uppercase">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-xs text-stone-300 font-medium flex items-center gap-1 mt-0.5">
                    <Mail size={12} className="text-[#b6d333]" />
                    <span>{currentUser.email}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#b6d333]/20 text-[11px] text-stone-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Metode Auth:</span>
                  <span className="font-bold text-white">Kode Verifikasi Email (OTP)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Akses:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>{currentUser.role === 'owner' ? 'Hak Akses Penuh' : `Role ${currentUser.role}`}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Other team members for instant switching */}
            {availableUsers.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-stone-400 block px-0.5">
                  Ganti Akun Tim:
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {availableUsers
                    .filter((u) => u.id !== currentUser.id)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{u.avatar || '👤'}</span>
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">{u.name}</span>
                            <span className="text-[10px] text-stone-400">{u.email}</span>
                          </div>
                        </div>
                        <span className="text-[9px] bg-stone-900 text-[#b6d333] font-bold px-1.5 py-0.5 rounded border border-stone-700 uppercase">
                          {u.role}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Logout / Lock terminal action */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 hover:text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>Kunci Layar / Logout</span>
            </button>

            <button
              type="button"
              onClick={() => setIsUserSwitcherOpen(false)}
              className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
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
          onLogout={handleLogout}
        />
      ) : (
        <AdminLayout
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={setSettings}
          onSelectUser={handleSelectUser}
          onNavigateToPos={() => setCurrentArea('pos')}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
