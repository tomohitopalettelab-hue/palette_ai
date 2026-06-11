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
    <main className="relative w-full min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-slate-50">
      {/* 背景: やわらかいブランドカラーのオーラ */}
      <div
        aria-hidden
        className="absolute -top-32 -left-32 w-[420px] h-[420px] md:w-[560px] md:h-[560px] rounded-full opacity-[0.13] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-28 w-[460px] h-[460px] md:w-[600px] md:h-[600px] rounded-full opacity-[0.11] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #d946ef 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm md:max-w-md">
        {/* ロゴ + ブランド */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/palette-aix-mark-x.svg"
            alt="Palette AIX"
            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl shadow-lg shadow-purple-300/40"
          />
          <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-tight text-slate-800">
            Palette <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">AIX</span>
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-500">AI チャットボット管理</p>
        </div>

        {/* カード */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/60">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div>
              <label htmlFor="login-id" className="block text-[11px] md:text-xs font-bold text-slate-600 mb-1.5 tracking-wide">
                ID
              </label>
              <input
                id="login-id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoComplete="username"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
                placeholder="ログインID"
              />
            </div>

            <div>
              <label htmlFor="login-pw" className="block text-[11px] md:text-xs font-bold text-slate-600 mb-1.5 tracking-wide">
                Password
              </label>
              <input
                id="login-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
                placeholder="パスワード"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !id || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-purple-300/40 transition hover:opacity-90 hover:shadow-purple-300/60 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <LoginPageInner />
    </Suspense>
  );
}
