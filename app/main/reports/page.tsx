'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, Flame, LogOut, ArrowLeft } from 'lucide-react';

type Stats = {
  total: number;
  todayCount: number;
  weekCount: number;
  closed: number;
  scoreDistribution: Record<string, number>;
};

export default function ReportsDashboard() {
  const [paletteId, setPaletteId] = useState<string>('');

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [planError, setPlanError] = useState('');

  // セッション (palette_session cookie) から paletteId を取得。
  // middleware が /main/reports を保護しているため、未ログインはここに来ない想定だが
  // 念のため 401 なら /login へ。
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/main/me', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          window.location.href = '/login?role=customer&next=/main/reports';
          return;
        }
        const pid = String(data.paletteId || '').toUpperCase();
        setPaletteId(pid);
        // sessions ページ (localStorage 参照) との互換のため保存
        try { localStorage.setItem('reports_palette_id', pid); } catch { /* noop */ }
      } catch {
        window.location.href = '/login?role=customer&next=/main/reports';
      }
    };
    void init();
  }, []);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch { /* noop */ }
    try { localStorage.removeItem('reports_palette_id'); } catch { /* noop */ }
    window.location.href = '/login?role=customer';
  };

  useEffect(() => {
    if (!paletteId) return;
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
  }, [paletteId]);

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
            <Link href="/main/bot-settings" className="text-slate-400 hover:text-slate-600" aria-label="Bot設定に戻る">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/palette-aix-mark-x.svg" alt="Palette AIX" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-2xl font-black text-slate-800">営業Bot レポート</h1>
              <p className="text-xs text-slate-500">{paletteId || '...'}</p>
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
