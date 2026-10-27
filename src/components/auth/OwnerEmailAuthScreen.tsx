import React, { useState } from 'react';
import { CaozyLogo } from '../shared/CaozyLogo';
import {
  OWNER_EMAIL,
  findUserByEmail,
  verifyOtpCode,
  generateRandomOtp,
  saveAuthSession,
  AuthSession,
} from '../../services/authService';
import { db } from '../../lib/storage';
import {
  Mail,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Send,
} from 'lucide-react';

interface OwnerEmailAuthScreenProps {
  onAuthSuccess: (session: AuthSession) => void;
}

export const OwnerEmailAuthScreen: React.FC<OwnerEmailAuthScreenProps> = ({
  onAuthSuccess,
}) => {
  const [email, setEmail] = useState<string>(OWNER_EMAIL);

  // OTP State
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // Status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const targetUser = await findUserByEmail(email);
    if (!targetUser) {
      setErrorMsg('Email belum terdaftar dalam sistem. Hubungi Owner atau Admin untuk mendaftarkan akun.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const code = generateRandomOtp();
      setGeneratedOtp(code);
      setIsOtpSent(true);
      setIsLoading(false);
      setOtpNotice(`Kode verifikasi dikirim ke ${email.trim()}: ${code}`);
    }, 350);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetUser = await findUserByEmail(email);
    if (!targetUser) {
      setErrorMsg('Email tidak ditemukan dalam sistem.');
      return;
    }

    if (!verifyOtpCode(enteredOtp, generatedOtp)) {
      setErrorMsg('Kode verifikasi salah atau kedaluwarsa. Masukkan 6 digit kode OTP yang sesuai.');
      return;
    }

    setIsLoading(true);
    const session = saveAuthSession(targetUser, 'email_otp');

    await db.auditLogs.add({
      id: `audit-login-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: targetUser.id,
      actorName: `${targetUser.name} (${targetUser.role})`,
      action: 'LOGIN_EMAIL_OTP',
      entity: 'auth',
      entityId: targetUser.email,
      details: `${targetUser.name} (${targetUser.role}) berhasil masuk melalui verifikasi kode OTP Email.`,
    });

    onAuthSuccess(session);
  };

  const useAutoFillCode = () => {
    if (generatedOtp) {
      setEnteredOtp(generatedOtp);
    }
  };

  return (
    <div className="min-h-screen bg-[#141518] text-stone-100 flex flex-col justify-center items-center p-4 selection:bg-[#b6d333] selection:text-stone-950 font-sans">
      <div className="w-full max-w-md bg-[#202226] border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/60 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#b6d333]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-[#17181c] border border-[#b6d333]/30 shadow-lg shadow-[#b6d333]/5 mb-1">
            <CaozyLogo variant="icon" size="lg" />
          </div>
          <div>
            <div className="flex justify-center mb-1">
              <CaozyLogo variant="wordmark" size="md" />
            </div>
            <p className="text-xs font-bold text-stone-400 mt-1">
              Sistem POS & ERP Minuman Artisan
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#b6d333]/10 border border-[#b6d333]/30 rounded-full text-xs font-bold text-[#b6d333]">
            <ShieldCheck size={14} />
            <span>Masuk Sistem</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-2xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* OTP Notice Banner */}
        {otpNotice && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs text-emerald-300 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Kode OTP Terkirim</span>
              </div>
              <button
                type="button"
                onClick={useAutoFillCode}
                className="text-[11px] bg-emerald-800/80 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                Isi Otomatis
              </button>
            </div>
            <div className="flex items-center justify-between p-2 bg-emerald-950/80 rounded-xl border border-emerald-800/50">
              <span className="text-[11px] text-emerald-300/80">Kode 6-Digit:</span>
              <span className="font-mono font-black text-sm text-[#b6d333] tracking-widest">
                {generatedOtp}
              </span>
            </div>
          </div>
        )}

        {/* OTP Email Form */}
        <div className="space-y-4">
          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full bg-[#16171a] border border-stone-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#b6d333] font-medium"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#b6d333] hover:bg-[#c7e63b] text-stone-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#b6d333]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Mengirim Kode OTP...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Kirim Kode OTP</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                    <KeyRound size={14} className="text-[#b6d333]" />
                    <span>Kode Verifikasi 6-Digit</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-[11px] text-[#b6d333] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>Kirim Ulang</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 123456"
                  className="w-full bg-[#16171a] border border-stone-700 rounded-xl px-4 py-3 text-center text-xl tracking-widest font-mono font-bold text-white placeholder-stone-600 focus:outline-none focus:border-[#b6d333]"
                  autoFocus
                />
                <p className="text-[11px] text-stone-400 mt-1.5 text-center">
                  Email tujuan: <strong className="text-stone-200">{email}</strong>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpSent(false);
                    setEnteredOtp('');
                    setOtpNotice(null);
                  }}
                  className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Ganti Email
                </button>
                <button
                  type="submit"
                  disabled={isLoading || enteredOtp.length !== 6}
                  className="flex-2 bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black py-2.5 rounded-xl text-xs shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer"
                >
                  {isLoading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Clean Ready-to-use Footer */}
        <div className="pt-2 border-t border-stone-800/80 text-center">
          <p className="text-[11px] text-stone-500 font-medium">
            Caozy Kedai Minuman • Artisan Beverage ERP & POS
          </p>
        </div>
      </div>
    </div>
  );
};
