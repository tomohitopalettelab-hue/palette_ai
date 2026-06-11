"use client";

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const next = useMemo(() => searchParams.get('next') || undefined, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password, next }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'ログインに失敗しました。');
        return;
      }
      router.push(data.redirectTo || '/main/bot-settings');
      router.refresh();
    } catch {
      setError('通信エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* 背景: ブランドグラデーションのオーラ */}
      <div
        aria-hidden
        className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-48 -right-32 w-[520px] h-[520px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #d946ef 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute top-1/3 left-2/3 w-[300px] h-[300px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm">
        {/* ロゴ + ブランド */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/palette-aix-mark-x.svg"
            alt="Palette AIX"
            className="w-16 h-16 rounded-2xl shadow-[0_8px_32px_rgba(168,85,247,0.45)]"
          />
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
            Palette <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">AIX</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">AI チャットボット管理</p>
        </div>

        {/* カード */}
        <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-id" className="block text-[11px] font-bold text-slate-300 mb-1.5 tracking-wide">
                ID
              </label>
              <input
                id="login-id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoComplete="username"
                className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-indigo-500/20"
                placeholder="ログインID"
              />
            </div>

            <div>
              <label htmlFor="login-pw" className="block text-[11px] font-bold text-slate-300 mb-1.5 tracking-wide">
                Password
              </label>
              <input
                id="login-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-indigo-500/20"
                placeholder="パスワード"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !id || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-purple-500/25 transition hover:opacity-90 hover:shadow-purple-500/40 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-500">
          アカウント種別は自動判定されます（お客様 / 代理店 / 管理者）
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <LoginPageInner />
    </Suspense>
  );
}
