'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Music2, Eye, EyeOff, Sun, Moon, Loader2, AlertCircle } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+|00)?\d{7,15}$/;

// Music mobile palette
const kMusicBlue = '#0081FF';
const kDarkBg = '#0D0D0D';
const kDarkSurface = '#18181B';
const kDarkBorder = '#27272A';
const kLightBg = '#F2F2F7';
const kLightSurface = '#FFFFFF';
const kLightBorder = '#E5E5EA';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { login, user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get('from') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [touched, setTouched] = useState<{ id?: boolean; pw?: boolean }>({});
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && user) router.replace(from);
  }, [user, loading, router, from]);

  useEffect(() => {
    if (!lockUntil) return;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [lockUntil]);

  useEffect(() => {
    idRef.current?.focus();
  }, []);

  const dark = theme === 'dark';
  const locked = lockUntil !== null && now < lockUntil;
  const lockLeft = locked ? Math.ceil(((lockUntil ?? 0) - now) / 1000) : 0;

  const idInvalid =
    touched.id &&
    !!identifier &&
    !EMAIL_RE.test(identifier) &&
    !PHONE_RE.test(identifier.replace(/[\s\-()\.]/g, ''));
  const pwInvalid = touched.pw && !!password && password.length < 8;

  const canSubmit = useMemo(
    () => !busy && !locked && identifier.trim().length > 0 && password.length >= 8 && !idInvalid,
    [busy, locked, identifier, password, idInvalid],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const err = await login(identifier.trim(), password);
      if (err) {
        setError(err);
        const next = attempts + 1;
        setAttempts(next);
        if (next >= 5) setLockUntil(Date.now() + 30_000);
        return;
      }
      setAttempts(0);
      router.replace(from);
    } catch (e: any) {
      setError(e?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const surface = dark ? kDarkSurface : kLightSurface;
  const border = dark ? kDarkBorder : kLightBorder;
  const primary = dark ? '#FFFFFF' : '#1C1C1E';
  const secondary = dark ? '#A7A7A7' : '#6C6C70';
  const fieldFill = dark ? kDarkBg : kLightBg;

  return (
    <div
      className="relative flex flex-col md:flex-row overflow-x-hidden"
      style={{
        minHeight: '100dvh',
        background: dark ? kDarkBg : kLightBg,
      }}
    >
      {/* Left / top hero panel — image at natural aspect, no stretching */}
      <div
        className="relative w-full md:w-1/2 lg:w-[55%] h-[38vh] sm:h-[45vh] md:h-auto md:min-h-[100dvh] overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dark ? '/login-bg.jpeg' : '/login-bg-light.jpeg'}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: 'center 30%' }}
        />
        {dark && (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(13,13,13,0.55) 100%),
                           radial-gradient(ellipse 50% 50% at 30% 40%, rgba(0,129,255,0.20), transparent 65%)`,
            }}
          />
        )}
        {/* WasaaChat parent-brand mark, top-left of hero */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10">
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

        {/* Bottom-right brand ribbon on the hero — reads as tagline over the photo */}
        <div className="hidden md:flex absolute bottom-8 left-8 right-8 flex-col z-10">
          <span
            className="text-[11px] font-bold uppercase tracking-widest mb-2"
            style={{
              color: dark ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.95)',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            Wasaa Music · Admin
          </span>
          <h2
            className="text-2xl lg:text-3xl font-black leading-tight max-w-sm"
            style={{
              color: '#FFFFFF',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}
          >
            Every artist, track, live event — one console.
          </h2>
        </div>
      </div>

      {/* Theme toggle */}
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

      {/* Right / bottom panel — form card sits here */}
      <div className="relative flex-1 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-8">
        <div className="w-full max-w-md">
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
          {/* Music icon — headphones + waveform brand mark */}
          <div className="flex justify-center mb-4 sm:mb-5">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center"
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
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-center mb-1" style={{ color: primary }}>
            Wasaa Music Admin
          </h1>
          <p className="text-xs sm:text-sm text-center mb-6 sm:mb-8" style={{ color: secondary }}>
            Sign in to manage the music platform
          </p>

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

          {locked && (
            <div
              className="mb-4 rounded-xl p-3 text-sm text-center"
              style={{
                background: 'rgba(255,159,10,0.12)',
                border: '1px solid rgba(255,159,10,0.35)',
                color: dark ? '#FFB84D' : '#8C5C00',
              }}
            >
              Too many failed attempts. Try again in {lockLeft}s.
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label
                className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-1.5 sm:mb-2"
                style={{ color: secondary }}
              >
                Email or phone
              </label>
              <input
                ref={idRef}
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, id: true }))}
                placeholder="you@wasaa.com"
                className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl border outline-none text-sm transition-all"
                style={{
                  background: fieldFill,
                  borderColor: idInvalid ? '#FF3B30' : border,
                  color: primary,
                }}
              />
              {idInvalid && (
                <p className="mt-1.5 text-xs" style={{ color: '#FF3B30' }}>
                  Enter a valid email or phone number
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <label
                  className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: secondary }}
                >
                  Password
                </label>
                <Link
                  href="/forgot"
                  className="text-xs font-semibold hover:underline"
                  style={{ color: kMusicBlue }}
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, pw: true }))}
                  placeholder="•••••••••"
                  className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl border outline-none text-sm transition-all pr-11"
                  style={{
                    background: fieldFill,
                    borderColor: pwInvalid ? '#FF3B30' : border,
                    color: primary,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute inset-y-0 right-3 flex items-center"
                  style={{ color: secondary }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwInvalid && (
                <p className="mt-1.5 text-xs" style={{ color: '#FF3B30' }}>
                  At least 8 characters
                </p>
              )}
            </div>

            <label
              className="flex items-center gap-2.5 cursor-pointer select-none text-sm"
              style={{ color: primary }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: kMusicBlue }}
              />
              Keep me signed in on this device
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 sm:h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${kMusicBlue}, #4FA5FF)`,
                boxShadow: canSubmit ? `0 8px 20px -8px ${kMusicBlue}` : 'none',
              }}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </>
              ) : (
                <>Sign In</>
              )}
            </button>
          </form>

          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t flex items-center justify-between gap-3" style={{ borderColor: border }}>
            <p className="text-[10px] sm:text-[11px]" style={{ color: secondary }}>
              Wasaa Music Service · Admin Console
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dark ? '/wasaachat-logo-light.png' : '/wasaachat-logo-dark.png'}
              alt="WasaaChat"
              className="h-4 sm:h-5 w-auto opacity-80"
            />
          </div>

        </div>

        <p
          className="mt-3 sm:mt-4 text-center text-[10px] sm:text-[11px]"
          style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(28,28,30,0.55)' }}
        >
          Protected by Wasaa Identity · v2
        </p>
        </div>
      </div>
    </div>
  );
}
