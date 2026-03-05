"use client";

import { useEffect, useMemo, useState } from 'react';

type Account = {
  id: string;
  paletteId: string;
  name: string;
  status: string;
  updatedAt?: string;
};

type Contract = {
  id: string;
  accountId: string;
  planId: string;
  status?: string;
  updatedAt?: string;
};

type Plan = {
  id: string;
  code: string;
  name: string;
};

type Row = {
  accountId: string;
  paletteId: string;
  customerName: string;
  accountStatus: string;
  planNames: string[];
  latestUpdatedAt: string;
};

const isPaletteAiPlan = (plan: Plan): boolean => {
  const code = String(plan.code || '').toLowerCase();
  const normalized = code.replace(/-/g, '_');
  return normalized.includes('palette_ai') || normalized === 'ai' || normalized.startsWith('ai_');
};

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [accRes, ctrRes, planRes] = await Promise.all([
        fetch('/api/admin/accounts', { cache: 'no-store' }),
        fetch('/api/admin/contracts', { cache: 'no-store' }),
        fetch('/api/admin/plans?includeInactive=1', { cache: 'no-store' }),
      ]);

      const [accData, ctrData, planData] = await Promise.all([
        accRes.json().catch(() => ({})),
        ctrRes.json().catch(() => ({})),
        planRes.json().catch(() => ({})),
      ]);

      if (!accRes.ok || accData?.success === false) throw new Error(accData?.error || '顧客取得に失敗しました。');
      if (!ctrRes.ok || ctrData?.success === false) throw new Error(ctrData?.error || '契約取得に失敗しました。');
      if (!planRes.ok || planData?.success === false) throw new Error(planData?.error || 'プラン取得に失敗しました。');

      const accounts: Account[] = Array.isArray(accData.accounts) ? accData.accounts : [];
      const contracts: Contract[] = Array.isArray(ctrData.contracts) ? ctrData.contracts : [];
      const plans: Plan[] = Array.isArray(planData.plans) ? planData.plans : [];

      const aiPlanIds = new Set(plans.filter(isPaletteAiPlan).map((p) => p.id));
      const planMap = new Map(plans.map((p) => [p.id, p]));
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      const targetContracts = contracts.filter((c) => aiPlanIds.has(c.planId));
      const grouped = new Map<string, Contract[]>();
      targetContracts.forEach((contract) => {
        const list = grouped.get(contract.accountId) || [];
        list.push(contract);
        grouped.set(contract.accountId, list);
      });

      const nextRows: Row[] = Array.from(grouped.entries()).map(([accountId, ctrs]) => {
        const account = accountMap.get(accountId);
        const planNames = Array.from(new Set(
          ctrs.map((c) => planMap.get(c.planId)?.name || '').filter((name) => name.length > 0),
        ));

        const latestUpdatedAt = ctrs
          .map((c) => c.updatedAt || '')
          .filter((v) => v)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          || account?.updatedAt
          || new Date().toISOString();

        return {
          accountId,
          paletteId: account?.paletteId || '-',
          customerName: account?.name || '名称未設定',
          accountStatus: account?.status || '-',
          planNames,
          latestUpdatedAt,
        };
      }).sort((a, b) => new Date(b.latestUpdatedAt).getTime() - new Date(a.latestUpdatedAt).getTime());

      setRows(nextRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : '読込エラー');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((row) => `${row.paletteId} ${row.customerName} ${row.planNames.join(' ')}`.toLowerCase().includes(text));
  }, [rows, searchText]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-800">palette_ai 契約顧客一覧</h1>
              <p className="text-sm text-slate-600 mt-1">pal-db の契約情報から、palette_ai プラン契約中の顧客のみ表示します。</p>
            </div>
            <button onClick={load} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">再読込</button>
          </div>
          <div className="mt-4">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="顧客ID / 顧客名 / プラン名で検索"
              className="w-full md:max-w-md p-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">読み込み中...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="text-left py-2">顧客ID</th>
                    <th className="text-left py-2">顧客名</th>
                    <th className="text-left py-2">契約プラン</th>
                    <th className="text-left py-2">ステータス</th>
                    <th className="text-left py-2">更新日時</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-slate-500" colSpan={5}>対象顧客がありません。</td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.accountId} className="border-b border-slate-100 align-top">
                        <td className="py-2 font-mono">{row.paletteId}</td>
                        <td className="py-2">{row.customerName}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            {row.planNames.map((plan) => (
                              <span key={plan} className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {plan}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2">{row.accountStatus}</td>
                        <td className="py-2">{new Date(row.latestUpdatedAt).toLocaleString('ja-JP')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
