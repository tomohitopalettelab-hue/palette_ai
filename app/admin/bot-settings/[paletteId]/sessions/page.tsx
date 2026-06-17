'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Flame, CheckCircle2, Trash2 } from 'lucide-react';

type Summary = {
  id: string;
  stage: string;
  buyIntentScore: number;
  closed: boolean;
  closedAction: string | null;
  leadName: string;
  firstMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  total: number;
  todayCount: number;
  weekCount: number;
  closed: number;
  scoreDistribution: Record<string, number>;
};

export default function SessionsListPage({ params }: { params: Promise<{ paletteId: string }> }) {
  const { paletteId } = usePromise(params);
  const [sessions, setSessions] = useState<Summary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/bot-settings/${paletteId}/sessions?minScore=${minScore}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.success) {
          setSessions(data.sessions || []);
          setStats(data.stats || null);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [paletteId, minScore]);

  const deleteOne = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId || deletingAll) return;
    if (!confirm('この会話ログを削除しますか？この操作は取り消せません。')) return;
    setError(null);
    setDeletingId(id);
    const prev = sessions;
    setSessions((cur) => cur.filter((s) => s.id !== id)); // 楽観更新
    try {
      const res = await fetch(`/api/admin/bot-settings/${paletteId}/sessions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '削除に失敗しました');
      setStats((st) => (st ? { ...st, total: Math.max(0, st.total - 1) } : st));
    } catch (err: any) {
      setSessions(prev); // 失敗時は戻す
      setError(err?.message || '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAll = async () => {
    if (deletingId || deletingAll || sessions.length === 0) return;
    if (!confirm(`表示中の${sessions.length}件を含む、この顧客の会話ログをすべて削除しますか？この操作は取り消せません。`)) return;
    setError(null);
    setDeletingAll(true);
    const prev = sessions;
    setSessions([]); // 楽観更新
    try {
      const res = await fetch(`/api/admin/bot-settings/${paletteId}/sessions`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '一括削除に失敗しました');
      setStats((st) => (st ? { ...st, total: 0, todayCount: 0, weekCount: 0, closed: 0 } : st));
    } catch (err: any) {
      setSessions(prev); // 失敗時は戻す
      setError(err?.message || '一括削除に失敗しました');
    } finally {
      setDeletingAll(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 4 ? 'bg-red-50 text-red-600'
    : s === 3 ? 'bg-amber-50 text-amber-600'
    : 'bg-slate-100 text-slate-500';

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/admin/bot-settings/${paletteId}`} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-black text-slate-800">{paletteId} 会話ログ</h1>
          {sessions.length > 0 && (
            <button
              onClick={deleteAll}
              disabled={deletingAll || !!deletingId}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-200 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingAll ? '削除中...' : `すべて削除（${sessions.length}件）`}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-600">{error}</div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="今日の会話" value={stats.todayCount} />
            <StatCard label="今週の会話" value={stats.weekCount} />
            <StatCard label="累計会話" value={stats.total} />
            <StatCard label="クロージング達成" value={stats.closed} accent />
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">スコアフィルタ:</span>
          {[0, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setMinScore(s)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                minScore === s ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 0 ? 'すべて' : `${s}以上`}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-10 text-sm text-slate-400">読み込み中...</div>}
        {!loading && sessions.length === 0 && <div className="text-center py-10 text-sm text-slate-400">該当する会話がありません</div>}

        <div className="space-y-2">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/admin/bot-settings/${paletteId}/sessions/${s.id}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${scoreColor(s.buyIntentScore)}`}>
                {s.buyIntentScore >= 4 ? <Flame className="w-4 h-4" /> : <span className="text-sm font-black">{s.buyIntentScore}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-700">{s.leadName || '未記名'}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">{s.stage}</span>
                  {s.closed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  {s.closedAction && <span className="text-[9px] font-bold text-emerald-600">{s.closedAction}</span>}
                </div>
                <p className="text-xs text-slate-500 truncate">{s.firstMessage || '(メッセージなし)'}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-slate-400">{new Date(s.updatedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-[9px] text-slate-400">{s.messageCount}件</div>
              </div>
              <button
                onClick={(e) => deleteOne(e, s.id)}
                disabled={deletingId === s.id || deletingAll}
                title="この会話ログを削除"
                className="shrink-0 p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Link>
          ))}
        </div>
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
