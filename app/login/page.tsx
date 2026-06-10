"use client";

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Role = 'admin' | 'customer' | 'agency';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams.get('role');
  const initialRole: Role =
    queryRole === 'admin' ? 'admin'
    : queryRole === 'agency' ? 'agency'
    : 'customer';
  const [role, setRole] = useState<Role>(initialRole);
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
        body: JSON.stringify({ role, id, password, next }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'ログインに失敗しました。');
        return;
      }
      const fallback = role === 'admin' ? '/admin' : role === 'agency' ? '/admin/bot-settings' : '/main';
      router.push(data.redirectTo || fallback);
      router.refresh();
    } catch {
      setError('通信エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (r: Role) => {
    setRole(r);
    setError('');
    setId('');
    setPassword('');
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h1 className="text-xl font-black text-slate-800 mb-1">Palette Login</h1>
        <p className="text-xs text-slate-500 mb-4">
          {role === 'admin' ? '管理者ログイン' : role === 'agency' ? '代理店ログイン' : 'お客様ログイン'}
        </p>

        {/* ロール切替タブ */}
        <div className="flex mb-5 bg-slate-100 rounded-lg p-1 gap-1">
          <button
            type="button"
            onClick={() => switchRole('customer')}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition ${
              role === 'customer' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            お客様
          </button>
          <button
            type="button"
            onClick={() => switchRole('agency')}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition ${
              role === 'agency' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            代理店
          </button>
          <button
            type="button"
            onClick={() => switchRole('admin')}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition ${
              role === 'admin' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            管理者
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">ID</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={role === 'admin' ? 'admin id' : role === 'agency' ? '代理店ID' : 'login ID'}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="password"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-60"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-100" />}>
      <LoginPageInner />
    </Suspense>
  );
}
