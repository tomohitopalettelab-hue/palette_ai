'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, Flame, CheckCircle2, LogOut } from 'lucide-react';

type Stats = {
  total: number;
  todayCount: number;
  weekCount: number;
  closed: number;
  scoreDistribution: Record<string, number>;
};

export default function ReportsDashboard() {
  const [paletteId, setPaletteId] = useState<string>('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authInput, setAuthInput] = useState({ loginId: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [planError, setPlanError] = useState('');

  // Restore session from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('reports_palette_id');
    if (saved && /^[A-Z][0-9]{4}$/.test(saved)) {
      setPaletteId(saved);
      setAuthenticated(true);
    }
  }, []);

  const handleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/chat-auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paletteId: authInput.loginId, password: authInput.password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'ログインに失敗しました');
      }
      const pid = String(data.paletteId || '').toUpperCase();
      localStorage.setItem('reports_palette_id', pid);
      setPaletteId(pid);
      setAuthenticated(true);
    } catch (err: any) {
      setAuthError(err?.message || 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reports_palette_id');
    setPaletteId('');
    setAuthenticated(false);
  };

  useEffect(() => {
    if (!authenticated || !paletteId) return;
    const load = async () => {
      setLoading(true);
      setPlanError('');
      try {
        const res = await fetch(`/api/main/reports/stats?paletteId=${paletteId}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.status === 403 && data?.reason === 'plan_required') {
          setPlanError(data?.error || 'Palette AIX プランが必要です');
          return;
        }
        if (data?.success) setStats(data.stats);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [authenticated, paletteId]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Bot レポート</h1>
              <p className="text-xs text-slate-500">顧客IDでログイン</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">顧客ID</label>
              <input
                type="text"
                value={authInput.loginId}
                onChange={(e) => setAuthInput({ ...authInput, loginId: e.target.value.toUpperCase() })}
                placeholder="A0001"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none text-sm focus:border-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">パスワード</label>
              <input
                type="password"
                value={authInput.password}
                onChange={(e) => setAuthInput({ ...authInput, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none text-sm focus:border-indigo-300"
              />
            </div>
            {authError && <div className="text-xs text-red-500">{authError}</div>}
            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {authLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dist = stats?.scoreDistribution || {};
  const hotCount = (dist['4'] || 0) + (dist['5'] || 0);
  const warmCount = dist['3'] || 0;
  const coldCount = (dist['1'] || 0) + (dist['2'] || 0);
  const totalDist = hotCount + warmCount + coldCount || 1;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">営業Bot レポート</h1>
              <p className="text-xs text-slate-500">{paletteId}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" />ログアウト
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-slate-400">読み込み中...</div>
        ) : planError ? (
          <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-lg font-black text-slate-800 mb-2">Palette AIX プランが必要です</h2>
            <p className="text-sm text-slate-500 mb-4">{planError}</p>
            <p className="text-xs text-slate-400">
              営業Botレポートをご利用いただくには「Palette AIX」プランのご契約が必要です。<br />
              詳しくはPalette Labまでお問い合わせください。
            </p>
            <button onClick={handleLogout} className="mt-6 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto">
              <LogOut className="w-3.5 h-3.5" />別のアカウントでログイン
            </button>
          </div>
        ) : stats ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="今日" value={stats.todayCount} />
              <StatCard label="今週" value={stats.weekCount} />
              <StatCard label="累計会話" value={stats.total} />
              <StatCard label="クロージング達成" value={stats.closed} accent />
            </div>

            {/* Score distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <h2 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />買う気度スコア分布
              </h2>
              <div className="space-y-3">
                <DistBar label="🔥 熱い (4-5)" count={hotCount} total={totalDist} color="bg-red-400" />
                <DistBar label="🟡 検討中 (3)" count={warmCount} total={totalDist} color="bg-amber-400" />
                <DistBar label="⚪ 冷 (1-2)" count={coldCount} total={totalDist} color="bg-slate-300" />
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link href="/main/reports/sessions" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center gap-4">
                <MessageSquare className="w-8 h-8 text-indigo-500" />
                <div>
                  <div className="font-bold text-slate-800">全ての会話を見る</div>
                  <div className="text-xs text-slate-500">訪問者との対話ログを確認</div>
                </div>
              </Link>
              <Link href="/main/reports/sessions?min=4" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-red-300 hover:shadow-sm transition-all flex items-center gap-4">
                <Flame className="w-8 h-8 text-red-500" />
                <div>
                  <div className="font-bold text-slate-800">熱いリードだけ見る</div>
                  <div className="text-xs text-slate-500">スコア4以上の会話</div>
                </div>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-sm text-slate-400">データがまだありません</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 border-transparent text-white' : 'bg-white border-slate-200'}`}>
      <div className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-white/80' : 'text-slate-400'}`}>{label}</div>
      <div className={`text-2xl font-black mt-1 ${accent ? 'text-white' : 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="text-slate-400">{count}件 ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
