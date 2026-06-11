'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Settings } from 'lucide-react';

type Account = {
  paletteId: string;
  name: string;
  industry: string;
  botConfigured: boolean;
  hasAixPlan: boolean;
  suspended?: boolean;
};

type SortKey = 'all' | 'configured' | 'not_configured' | 'suspended';
type ViewerRole = 'admin' | 'customer' | 'agency' | null;

export default function BotSettingsListPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [viewerRole, setViewerRole] = useState<ViewerRole>(null);
  const [agencyName, setAgencyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterKey, setFilterKey] = useState<SortKey>('all');
  const [busyId, setBusyId] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const isAdmin = viewerRole === 'admin';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/bot-settings', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '顧客一覧の取得に失敗しました');
      }
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setViewerRole((data.viewerRole as ViewerRole) || null);
      setAgencyName(String(data.agencyName || ''));
    } catch (err: any) {
      setError(err?.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((prev) => (prev === msg ? '' : prev)), 3000);
  };

  const handleToggleSuspend = async (a: Account) => {
    const next = !a.suspended;
    setBusyId(a.paletteId);
    try {
      const res = await fetch(`/api/admin/bot-settings/${a.paletteId}/account`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || '状態更新に失敗しました');
      setAccounts((prev) => prev.map((x) => (x.paletteId === a.paletteId ? { ...x, suspended: next } : x)));
      flashNotice(`${a.paletteId} を${next ? '停止しました（URLアクセス不可）' : '再開しました'}`);
    } catch (err: any) {
      flashNotice(err?.message || 'エラー');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (a: Account) => {
    setBusyId(a.paletteId);
    try {
      const res = await fetch(`/api/admin/bot-settings/${a.paletteId}/account`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || '削除に失敗しました');
      await load();
      flashNotice(`${a.paletteId} のBotデータを削除しました`);
    } catch (err: any) {
      flashNotice(err?.message || 'エラー');
    } finally {
      setBusyId('');
      setDeleteTarget(null);
    }
  };

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = accounts;

    // フィルタ (一覧は AIX 契約顧客のみが API から返る)
    if (filterKey === 'configured') list = list.filter((a) => a.botConfigured);
    else if (filterKey === 'not_configured') list = list.filter((a) => !a.botConfigured);
    else if (filterKey === 'suspended') list = list.filter((a) => a.suspended);

    // 検索
    if (q) {
      list = list.filter((a) =>
        a.paletteId.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.industry.toLowerCase().includes(q),
      );
    }

    // ソート: 設定済み > paletteId
    return [...list].sort((a, b) => {
      if (a.botConfigured !== b.botConfigured) return a.botConfigured ? -1 : 1;
      return a.paletteId.localeCompare(b.paletteId);
    });
  }, [accounts, searchText, filterKey]);

  const counts = useMemo(() => ({
    all: accounts.length,
    configured: accounts.filter((a) => a.botConfigured).length,
    not_configured: accounts.filter((a) => !a.botConfigured).length,
    suspended: accounts.filter((a) => a.suspended).length,
  }), [accounts]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      {notice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold shadow-lg">
          {notice}
        </div>
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-black text-slate-800 mb-2">Botデータを削除しますか？</h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-1">
              <b>{deleteTarget.paletteId}</b>（{deleteTarget.name || '名前未設定'}）の
              Bot設定・サービス・Q&A・会話ログ・停止フラグをすべて削除します。
            </p>
            <p className="text-[11px] text-red-600 mb-4">
              ⚠ この操作は取り消せません。pal-db の契約自体には影響しません。
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget)}
                disabled={busyId === deleteTarget.paletteId}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {busyId === deleteTarget.paletteId ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/palette-aix-mark-x.svg" alt="Palette AIX" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-2xl font-black text-slate-800">営業Bot設定</h1>
            <p className="text-sm text-slate-500">
              {viewerRole === 'agency'
                ? `代理店: ${agencyName || '—'} / 担当顧客のBot設定を編集できます`
                : '顧客ごとにチャットbotの設定を編集できます'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="顧客ID・名前・業種で検索"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none text-sm"
            />
          </div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {([
              { key: 'all', label: 'すべて', color: 'slate' },
              { key: 'configured', label: '設定済', color: 'emerald' },
              { key: 'not_configured', label: '未設定', color: 'amber' },
              { key: 'suspended', label: '停止中', color: 'amber' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterKey(f.key as SortKey)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  filterKey === f.key
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label} ({counts[f.key as SortKey]})
              </button>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-3 flex-wrap">
            <span>Palette AIX 契約中の顧客のみ表示 / 並び順: 設定済み → 顧客ID順</span>
          </div>
        </div>

        {loading && <div className="text-center py-10 text-sm text-slate-400">読み込み中...</div>}
        {error && <div className="text-center py-10 text-sm text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <div
                key={a.paletteId}
                className={`bg-white rounded-2xl border p-5 transition-all ${
                  a.suspended
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <Link href={`/admin/bot-settings/${a.paletteId}`} className="block group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{a.paletteId}</div>
                      <h3 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{a.name || '名前未設定'}</h3>
                      {a.industry && <p className="text-xs text-slate-500 mt-1">{a.industry}</p>}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 items-end">
                      {a.botConfigured ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600">設定済</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">未設定</span>
                      )}
                      {a.suspended && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">停止中</span>
                      )}
                    </div>
                  </div>
                  {a.suspended && (
                    <div className="text-[10px] text-amber-700 bg-amber-100 rounded-lg px-2 py-1 mb-2">
                      ⏸ 停止中（サイトに設置してもBotは表示されません）
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500">編集する →</span>
                  </div>
                </Link>
                {isAdmin && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSuspend(a)}
                      disabled={busyId === a.paletteId}
                      className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-50 ${
                        a.suspended
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {busyId === a.paletteId ? '...' : a.suspended ? '▶ 再開' : '⏸ 停止'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(a)}
                      disabled={busyId === a.paletteId}
                      className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-sm text-slate-400">
                該当する顧客がありません
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
