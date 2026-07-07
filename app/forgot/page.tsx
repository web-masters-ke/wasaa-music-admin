'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import { identityApi } from '@/lib/api';
import {
  Music2, ArrowLeft, Mail, Sun, Moon, Loader2, AlertCircle,
  CheckCircle2, Eye, EyeOff, ShieldCheck,
} from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+|00)?\d{7,15}$/;

const kMusicBlue = '#0081FF';
const kDarkBg = '#0D0D0D';
const kDarkSurface = '#18181B';
const kDarkBorder = '#27272A';
const kLightBg = '#F2F2F7';
const kLightSurface = '#FFFFFF';
const kLightBorder = '#E5E5EA';

type Step = 'identify' | 'verify' | 'reset' | 'done';

export default function ForgotPage() {
  const { theme, toggle } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const dark = theme === 'dark';
  const surface = dark ? kDarkSurface : kLightSurface;
  const border = dark ? kDarkBorder : kLightBorder;
  const primary = dark ? '#FFFFFF' : '#1C1C1E';
  const secondary = dark ? '#A7A7A7' : '#6C6C70';
  const fieldFill = dark ? kDarkBg : kLightBg;

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const iv = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(iv);
  }, [cooldown]);

  // Identifier validation
  const idInvalid =
    !!identifier &&
    !EMAIL_RE.test(identifier) &&
    !PHONE_RE.test(identifier.replace(/[\s\-()\.]/g, ''));

  // Password strength
  const pwLen = pw1.length >= 8;
  const pwUpper = /[A-Z]/.test(pw1);
  const pwLower = /[a-z]/.test(pw1);
  const pwDigit = /\d/.test(pw1);
  const pwStrength = [pwLen, pwUpper, pwLower, pwDigit].filter(Boolean).length;
  const pwMatch = pw1.length > 0 && pw1 === pw2;
  const pwOk = pwLen && pwUpper && pwLower && pwDigit && pwMatch;

  const otpFull = otp.every((d) => d.length === 1);

  // Step 1 — request reset
  const requestReset = async () => {
    setError(null);
    if (idInvalid || !identifier.trim()) {
      setError('Enter a valid email or phone number');
      return;
    }
    setBusy(true);
    try {
      const { verificationId: vid } = await identityApi.passwordResetRequest(identifier.trim());
      setVerificationId(vid);
      setStep('verify');
      setCooldown(30);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 60);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Failed to send reset code');
    } finally {
      setBusy(false);
    }
  };

  // Step 2 — verify OTP → advance to reset
  const goToReset = () => {
    setError(null);
    if (!otpFull) {
      setError('Enter the full 6-digit code');
      return;
    }
    setStep('reset');
  };

  // Step 3 — submit new password
  const submitNewPassword = async () => {
    setError(null);
    if (!pwOk) {
      setError('Password must be at least 8 characters with uppercase, lowercase, digit, and match');
      return;
    }
    if (!verificationId) {
      setError('Missing verification — go back and try again');
      return;
    }
    setBusy(true);
    try {
      await identityApi.passwordResetConfirm(verificationId, otp.join(''), pw1);
      setStep('done');
    } catch (e: any) {
      const msg =
        e?.response?.data?.error?.message ??
        e?.response?.data?.message ??
        e?.message ??
        'Password reset failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0) return;
    setBusy(true);
    setError(null);
    try {
      const { verificationId: vid } = await identityApi.passwordResetRequest(identifier.trim());
      setVerificationId(vid);
      setCooldown(30);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 60);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to resend code');
    } finally {
      setBusy(false);
    }
  };

  const setOtpDigit = (i: number, v: string) => {
    // Handle paste of the full 6-digit code
    if (v.length > 1) {
      const digits = v.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otp];
      for (let k = 0; k < 6; k++) next[k] = digits[k] ?? '';
      setOtp(next);
      const focusIdx = Math.min(5, digits.length);
      otpRefs.current[focusIdx]?.focus();
      return;
    }
    const digit = v.replace(/\D/g, '');
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const otpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp];
      next[i - 1] = '';
      setOtp(next);
      otpRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      otpRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      otpRefs.current[i + 1]?.focus();
    }
  };

  return (
    <div
      className="relative flex items-start sm:items-center justify-center overflow-x-hidden"
      style={{
        minHeight: '100dvh',
        background: dark ? kDarkBg : kLightBg,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dark ? '/login-bg.jpeg' : '/login-bg-light.jpeg'}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: dark
            ? `linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(13,13,13,0.82) 100%),
               radial-gradient(ellipse 40% 40% at 30% 40%, rgba(0,129,255,0.25), transparent 65%)`
            : 'transparent',
        }}
      />

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="absolute top-3 sm:top-5 right-3 sm:right-5 z-20 rounded-full p-2 transition-colors"
        style={{
          background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
          color: dark ? '#FFFFFF' : '#1C1C1E',
          border: dark ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${kLightBorder}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* WasaaChat parent-brand mark, top-left of viewport */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dark ? '/wasaachat-logo-light.png' : '/wasaachat-logo-dark.png'}
          alt="WasaaChat"
          className="h-6 sm:h-7 md:h-8 w-auto"
          style={{
            filter: dark ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 4px rgba(255,255,255,0.6))',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-3 sm:px-4 py-4 sm:py-8">
        <div
          className="rounded-2xl border p-5 sm:p-8 md:p-9"
          style={{
            background: surface,
            borderColor: border,
            boxShadow: dark
              ? '0 32px 60px -20px rgba(0,0,0,0.7)'
              : '0 24px 60px -20px rgba(0,0,0,0.15)',
          }}
        >
          <div className="flex justify-center mb-4 sm:mb-5">
            <div
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{
                background: '#000000',
                boxShadow: `0 12px 32px -8px ${kMusicBlue}, 0 0 0 1px rgba(0,129,255,0.35)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/music-icon.jpeg"
                alt="Wasaa Music"
                className="w-full h-full object-cover"
              />
              {/* Step-specific badge in corner */}
              <div
                className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2"
                style={{
                  background: `linear-gradient(135deg, ${kMusicBlue}, #4FA5FF)`,
                  borderColor: surface,
                }}
              >
                {step === 'identify' && <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.5} />}
                {step === 'verify' && <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.5} />}
                {step === 'reset' && <Music2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.5} />}
                {step === 'done' && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.5} />}
              </div>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-center mb-1" style={{ color: primary }}>
            {step === 'identify' && 'Reset your password'}
            {step === 'verify' && 'Enter the code'}
            {step === 'reset' && 'Set a new password'}
            {step === 'done' && 'Password updated'}
          </h1>
          <p className="text-xs sm:text-sm text-center mb-6 sm:mb-8" style={{ color: secondary }}>
            {step === 'identify' && 'Enter your email or phone and we\'ll send you a 6-digit code.'}
            {step === 'verify' && `Sent to ${identifier}. Check your email or SMS.`}
            {step === 'reset' && 'Pick a strong password. You\'ll be signed out of all sessions.'}
            {step === 'done' && 'You can now sign in with your new password.'}
          </p>

          {/* Progress dots */}
          {step !== 'done' && (
            <div className="flex justify-center gap-2 mb-6">
              {['identify', 'verify', 'reset'].map((s) => (
                <div
                  key={s}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: s === step ? 24 : 6,
                    background:
                      s === step
                        ? kMusicBlue
                        : (['identify', 'verify', 'reset'] as Step[]).indexOf(step) >
                          (['identify', 'verify', 'reset'] as Step[]).indexOf(s as Step)
                        ? kMusicBlue
                        : dark
                        ? '#3F3F46'
                        : '#D1D1D6',
                  }}
                />
              ))}
            </div>
          )}

          {error && (
            <div
              className="mb-4 rounded-xl p-3 text-sm flex items-start gap-2 border"
              style={{
                background: 'rgba(255,59,48,0.10)',
                borderColor: 'rgba(255,59,48,0.35)',
                color: dark ? '#FF6B60' : '#B3261E',
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* STEP 1 — identifier */}
          {step === 'identify' && (
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: secondary }}>
                  Email or phone
                </label>
                <input
                  type="text"
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !busy && requestReset()}
                  placeholder="you@wasaa.com"
                  className="w-full px-4 py-3.5 rounded-xl border outline-none text-sm"
                  style={{ background: fieldFill, borderColor: border, color: primary }}
                />
              </div>
              <button
                onClick={requestReset}
                disabled={busy || !identifier.trim() || idInvalid}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${kMusicBlue}, #4FA5FF)`,
                  boxShadow: `0 8px 20px -8px ${kMusicBlue}`,
                }}
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send code'}
              </button>
            </div>
          )}

          {/* STEP 2 — OTP */}
          {step === 'verify' && (
            <div className="space-y-5">
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={d}
                    onChange={(e) => setOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => otpKeyDown(i, e)}
                    className="w-full min-w-0 h-12 sm:h-14 rounded-xl border outline-none text-center text-base sm:text-lg font-bold"
                    style={{
                      background: fieldFill,
                      borderColor: d ? kMusicBlue : border,
                      color: primary,
                    }}
                  />
                ))}
              </div>

              <button
                onClick={goToReset}
                disabled={!otpFull || busy}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${kMusicBlue}, #4FA5FF)`,
                  boxShadow: `0 8px 20px -8px ${kMusicBlue}`,
                }}
              >
                Verify code
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={cooldown > 0 || busy}
                  className="text-xs font-semibold disabled:opacity-50"
                  style={{ color: kMusicBlue }}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
              </div>

              <button
                onClick={() => { setStep('identify'); setError(null); }}
                className="w-full text-xs font-semibold flex items-center justify-center gap-1"
                style={{ color: secondary }}
              >
                <ArrowLeft className="w-3 h-3" /> Change identifier
              </button>
            </div>
          )}

          {/* STEP 3 — new password */}
          {step === 'reset' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: secondary }}>
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border outline-none text-sm pr-11"
                    style={{ background: fieldFill, borderColor: border, color: primary }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute inset-y-0 right-3 flex items-center"
                    style={{ color: secondary }}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength meter */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          background:
                            pwStrength > i
                              ? pwStrength === 4
                                ? '#22C55E'
                                : pwStrength >= 3
                                ? kMusicBlue
                                : '#F59E0B'
                              : dark
                              ? '#3F3F46'
                              : '#D1D1D6',
                        }}
                      />
                    ))}
                  </div>
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]" style={{ color: secondary }}>
                    <Rule ok={pwLen}>8+ characters</Rule>
                    <Rule ok={pwUpper}>1 uppercase</Rule>
                    <Rule ok={pwLower}>1 lowercase</Rule>
                    <Rule ok={pwDigit}>1 digit</Rule>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: secondary }}>
                  Confirm new password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border outline-none text-sm"
                  style={{
                    background: fieldFill,
                    borderColor: pw2 && pw1 !== pw2 ? '#FF3B30' : border,
                    color: primary,
                  }}
                />
                {pw2 && pw1 !== pw2 && (
                  <p className="mt-1.5 text-xs" style={{ color: '#FF3B30' }}>
                    Passwords don&apos;t match
                  </p>
                )}
              </div>

              <button
                onClick={submitNewPassword}
                disabled={!pwOk || busy}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${kMusicBlue}, #4FA5FF)`,
                  boxShadow: `0 8px 20px -8px ${kMusicBlue}`,
                }}
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update password'}
              </button>
            </div>
          )}

          {/* STEP 4 — done */}
          {step === 'done' && (
            <div className="space-y-5">
              <div
                className="rounded-xl p-4 border text-sm text-center"
                style={{
                  background: 'rgba(34,197,94,0.10)',
                  borderColor: 'rgba(34,197,94,0.35)',
                  color: dark ? '#4ADE80' : '#166534',
                }}
              >
                Your password has been reset. All other sessions have been signed out for security.
              </div>
              <button
                onClick={() => router.replace('/login')}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${kMusicBlue}, #4FA5FF)`,
                  boxShadow: `0 8px 20px -8px ${kMusicBlue}`,
                }}
              >
                Sign in
              </button>
            </div>
          )}

          {/* Bottom-right WasaaChat mark inside the card */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t flex items-center justify-between gap-3" style={{ borderColor: border }}>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: secondary }}
            >
              <ArrowLeft className="w-3 h-3" /> Back to sign in
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dark ? '/wasaachat-logo-light.png' : '/wasaachat-logo-dark.png'}
              alt="WasaaChat"
              className="h-4 sm:h-5 w-auto opacity-80"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: ok ? '#22C55E' : '#71717A' }}
      />
      {children}
    </li>
  );
}
