'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Search, Settings, MessageSquare } from 'lucide-react';

type Account = {
  paletteId: string;
  name: string;
  industry: string;
  botConfigured: boolean;
  hasAixPlan: boolean;
};

export default function BotSettingsListPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
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
      } catch (err: any) {
        setError(err?.message || 'error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) =>
      a.paletteId.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.industry.toLowerCase().includes(q),
    );
  }, [accounts, searchText]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">営業Bot設定</h1>
            <p className="text-sm text-slate-500">顧客ごとにチャットbotの設定を編集できます</p>
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
          <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-bold">AIX</span> Palette AIX 契約あり</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold">設定済</span> Bot設定済み</span>
          </div>
        </div>

        {loading && <div className="text-center py-10 text-sm text-slate-400">読み込み中...</div>}
        {error && <div className="text-center py-10 text-sm text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <Link
                key={a.paletteId}
                href={`/admin/bot-settings/${a.paletteId}`}
                className={`bg-white rounded-2xl border p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group ${
                  a.hasAixPlan ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{a.paletteId}</div>
                    <h3 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{a.name || '名前未設定'}</h3>
                    {a.industry && <p className="text-xs text-slate-500 mt-1">{a.industry}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    {a.hasAixPlan && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white">AIX</span>
                    )}
                    {a.botConfigured ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600">設定済</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">未設定</span>
                    )}
                  </div>
                </div>
                {!a.hasAixPlan && (
                  <div className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mb-2">
                    ⚠ Palette AIX 未契約（Botは動作しません）
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">編集する →</span>
                </div>
              </Link>
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
