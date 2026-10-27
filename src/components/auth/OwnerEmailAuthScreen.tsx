import React, { useState, useEffect } from 'react';
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
import { UserProfile } from '../../types';
import {
  Mail,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Send,
  UserCheck,
  Lock,
} from 'lucide-react';

interface OwnerEmailAuthScreenProps {
  onAuthSuccess: (session: AuthSession) => void;
}

export const OwnerEmailAuthScreen: React.FC<OwnerEmailAuthScreenProps> = ({
  onAuthSuccess,
}) => {
  const [email, setEmail] = useState<string>(OWNER_EMAIL);

  // Email Validation & User State
  const [validatedUser, setValidatedUser] = useState<UserProfile | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isValidatingEmail, setIsValidatingEmail] = useState<boolean>(false);

  // OTP State
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // Submission Status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset OTP state if email is edited
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailError(null);
    setErrorMsg(null);
    setValidatedUser(null);
    setIsOtpSent(false);
    setOtpNotice(null);
    setEnteredOtp('');
  };

  // Validasi Email terlebih dahulu
  const handleCheckEmailAndSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEmailError(null);
    setErrorMsg(null);
    setOtpNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError('Silakan masukkan alamat email.');
      return;
    }

    setIsValidatingEmail(true);
    try {
      const user = await findUserByEmail(cleanEmail);
      if (!user) {
        setEmailError('Email belum terdaftar dalam sistem. Hubungi Owner atau Admin untuk mendaftarkan akun.');
        setValidatedUser(null);
        setIsOtpSent(false);
        setIsValidatingEmail(false);
        return;
      }

      // Email terdaftar! Set user dan kirim OTP
      setValidatedUser(user);
      const code = generateRandomOtp();
      setGeneratedOtp(code);
      setIsOtpSent(true);
      setOtpNotice(`Kode verifikasi 6-digit telah dikirim ke ${cleanEmail}. Silakan periksa inbox email Anda.`);
      console.info(`[Caozy Auth] Kode OTP untuk ${cleanEmail}: ${code}`);
    } catch (err) {
      setEmailError('Gagal memeriksa email. Silakan coba lagi.');
    } finally {
      setIsValidatingEmail(false);
    }
  };

  // Verifikasi OTP dan Masuk
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validatedUser) {
      setErrorMsg('Silakan cek dan validasi email terlebih dahulu.');
      return;
    }

    if (!isOtpSent) {
      setErrorMsg('Silakan kirim kode OTP terlebih dahulu.');
      return;
    }

    if (!verifyOtpCode(enteredOtp, generatedOtp)) {
      setErrorMsg('Kode verifikasi salah atau kedaluwarsa. Masukkan 6 digit kode OTP yang sesuai.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = saveAuthSession(validatedUser, 'email_otp');

      await db.auditLogs.add({
        id: `audit-login-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: validatedUser.id,
        actorName: `${validatedUser.name} (${validatedUser.role})`,
        action: 'LOGIN_EMAIL_OTP',
        entity: 'auth',
        entityId: validatedUser.email,
        details: `${validatedUser.name} (${validatedUser.role}) berhasil masuk melalui verifikasi kode OTP Email.`,
      });

      onAuthSuccess(session);
    } catch (err) {
      setErrorMsg('Gagal menyelesaikan proses login.');
    } finally {
      setIsSubmitting(false);
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

        {/* OTP Notice Banner (DOES NOT display the OTP code on screen) */}
        {otpNotice && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{otpNotice}</span>
          </div>
        )}

        {/* SINGLE SCREEN FORM (No steps, validates email then OTP together) */}
        <div className="space-y-4">
          {/* 1. Email Input & Validation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-300">
                Email
              </label>
              {validatedUser && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck size={11} />
                  <span>Terdaftar ({validatedUser.name} • {validatedUser.role})</span>
                </span>
              )}
            </div>

            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="nama@gmail.com"
                className={`w-full bg-[#16171a] border rounded-xl pl-10 pr-24 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none font-medium transition-colors ${
                  emailError
                    ? 'border-red-600 focus:border-red-500'
                    : validatedUser
                    ? 'border-emerald-600/80 focus:border-emerald-500'
                    : 'border-stone-700 focus:border-[#b6d333]'
                }`}
                autoFocus
              />

              {/* Tombol Kirim / Kirim Ulang OTP di dalam baris email */}
              <button
                type="button"
                onClick={() => handleCheckEmailAndSendOtp()}
                disabled={isValidatingEmail || !email.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 text-[11px] font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                {isValidatingEmail ? (
                  <span>Mengecek...</span>
                ) : isOtpSent ? (
                  <>
                    <RefreshCw size={11} />
                    <span>Kirim Ulang</span>
                  </>
                ) : (
                  <>
                    <Send size={11} />
                    <span>Kirim OTP</span>
                  </>
                )}
              </button>
            </div>

            {/* Email Validation Error message */}
            {emailError && (
              <p className="text-[11px] text-red-400 flex items-center gap-1 pt-0.5">
                <AlertCircle size={12} className="shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          {/* 2. Kode Verifikasi OTP 6-Digit (Always on same screen) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  isOtpSent ? 'text-stone-300' : 'text-stone-500'
                }`}
              >
                <KeyRound size={14} className={isOtpSent ? 'text-[#b6d333]' : 'text-stone-500'} />
                <span>Kode Verifikasi OTP 6-Digit</span>
              </label>
              {!isOtpSent && (
                <span className="text-[10px] text-stone-500">
                  Kirim OTP dulu untuk mengisi
                </span>
              )}
            </div>

            <input
              type="text"
              maxLength={6}
              disabled={!isOtpSent}
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
              placeholder={isOtpSent ? 'Masukkan 6 digit kode' : 'Menunggu pengiriman OTP...'}
              className={`w-full bg-[#16171a] border rounded-xl px-4 py-3 text-center text-xl tracking-widest font-mono font-bold text-white placeholder-stone-600 focus:outline-none transition-all ${
                !isOtpSent
                  ? 'border-stone-800/80 bg-stone-900/40 text-stone-600 cursor-not-allowed opacity-60'
                  : 'border-stone-700 focus:border-[#b6d333]'
              }`}
            />
          </div>

          {/* 3. Action Buttons */}
          <div className="pt-2">
            {!isOtpSent ? (
              <button
                type="button"
                onClick={() => handleCheckEmailAndSendOtp()}
                disabled={isValidatingEmail || !email.trim()}
                className="w-full bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#b6d333]/20 transition-all cursor-pointer"
              >
                {isValidatingEmail ? (
                  <span>Memvalidasi Email...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Validasi Email & Kirim OTP</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isSubmitting || enteredOtp.length !== 6}
                className="w-full bg-[#b6d333] hover:bg-[#c7e63b] disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black py-3 rounded-xl text-xs shadow-md shadow-[#b6d333]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Verifikasi OTP & Masuk</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Clean Footer */}
        <div className="pt-2 border-t border-stone-800/80 text-center">
          <p className="text-[11px] text-stone-500 font-medium">
            Caozy Kedai Minuman • Artisan Beverage ERP & POS
          </p>
        </div>
      </div>
    </div>
  );
};
