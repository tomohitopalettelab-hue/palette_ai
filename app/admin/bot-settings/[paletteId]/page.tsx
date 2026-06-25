'use client';

import React, { useEffect, useState, useCallback, use as usePromise } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Save, Copy, Check, Plus, Trash2, MessageSquare, Code,
  Sparkles, Settings2, HelpCircle, Palette, Package, PlayCircle, X, AlertTriangle,
  Workflow, ArrowUp, ArrowDown, Phone,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { WIDGET_TEMPLATES, ICON_SVG_PATHS, getBubbleRadius, getBubbleGradient, type WidgetTemplate } from '../_lib/widget-templates';

// @xyflow/react は重いので dynamic import でクライアント専用にロード
const HearingFlowChart = dynamic(
  () => import('../_lib/hearing-flow-chart').then((m) => m.HearingFlowChart),
  { ssr: false, loading: () => <div className="h-[600px] flex items-center justify-center text-xs text-slate-400">フローチャートを読み込み中...</div> },
);

type Config = any;
type Service = {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
  targetTags: string[];
  problemTags: string[];
  features: string;
  testimonial: string;
  sortOrder: number;
  active: boolean;
};
type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  priority: number;
};

type TabKey = 'basic' | 'services' | 'faqs' | 'conversation' | 'flow' | 'rules' | 'appearance' | 'reception';

/**
 * セッション切れ(401)を検知したらログイン画面へ誘導する。
 * 編集画面を開いたまま 12h セッションが期限切れになると、保存や追加が
 * 「unauthorized」表示や無反応になるため、再ログインへ自然に流す。
 * 戻り値: true=認証OK(処理続行) / false=401でリダイレクト中(呼び出し側は return)
 */
const isAuthed = (res: Response): boolean => {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
    return false;
  }
  return true;
};

export function BotSettingsEditor({
  paletteId,
  backHref,
  sessionsHref,
  reportsHref,
}: {
  paletteId: string;
  backHref?: string;
  sessionsHref?: string;
  reportsHref?: string;
}) {
  const [tab, setTab] = useState<TabKey>('basic');
  const [config, setConfig] = useState<Config | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [demoCopied, setDemoCopied] = useState(false);
  const [demoModeCopied, setDemoModeCopied] = useState(false);
  const [receptionDid, setReceptionDid] = useState('');
  const [didSaving, setDidSaving] = useState(false);
  const [didSaved, setDidSaved] = useState(false);
  const [autoUrl, setAutoUrl] = useState('');
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoResult, setAutoResult] = useState<string>('');
  const [showLiveChat, setShowLiveChat] = useState(false);

  // Load everything
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cRes, sRes, fRes] = await Promise.all([
        fetch(`/api/admin/bot-settings/${paletteId}/config`, { cache: 'no-store' }),
        fetch(`/api/admin/bot-settings/${paletteId}/services`, { cache: 'no-store' }),
        fetch(`/api/admin/bot-settings/${paletteId}/faqs`, { cache: 'no-store' }),
      ]);
      if (!isAuthed(cRes)) return; // セッション切れ → ログインへ
      const cData = await cRes.json();
      const sData = await sRes.json();
      const fData = await fRes.json();
      setConfig(cData?.config || null);
      setServices(Array.isArray(sData?.services) ? sData.services : []);
      setFaqs(Array.isArray(fData?.faqs) ? fData.faqs : []);
    } catch (err: any) {
      setError(err?.message || 'error');
    } finally {
      setLoading(false);
    }
  }, [paletteId]);

  useEffect(() => { void load(); }, [load]);

  // AI電話受付の着信DIDを読み込む
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/bot-settings/${paletteId}/reception-number`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (d?.success) setReceptionDid(d.did || '');
      } catch { /* noop */ }
    })();
  }, [paletteId]);

  const saveReceptionDid = async () => {
    setDidSaving(true);
    setDidSaved(false);
    try {
      const res = await fetch(`/api/admin/bot-settings/${paletteId}/reception-number`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: receptionDid.trim() }),
      });
      if (!isAuthed(res)) return;
      const d = await res.json();
      if (!res.ok || !d?.success) throw new Error(d?.error || '保存に失敗しました');
      setDidSaved(true);
      setTimeout(() => setDidSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'error');
    } finally {
      setDidSaving(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bot-settings/${paletteId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!isAuthed(res)) return; // セッション切れ → ログインへ
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'save failed');
      setSavedAt(new Date().toLocaleTimeString('ja-JP'));
    } catch (err: any) {
      setError(err?.message || 'error');
    } finally {
      setSaving(false);
    }
  };

  // Service CRUD
  const addService = async () => {
    // 新規は一覧の一番上に出す: 既存の最小 sortOrder より小さい値を割り当てる
    // （一覧は sort_order ASC なので最小値が先頭になる）
    const minSort = services.reduce((m, s) => Math.min(m, s.sortOrder ?? 0), 0);
    const res = await fetch(`/api/admin/bot-settings/${paletteId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '新しいサービス', sortOrder: minSort - 1 }),
    });
    if (!isAuthed(res)) return; // セッション切れ → ログインへ
    const data = await res.json();
    if (data?.success && data.service) setServices((prev) => [data.service, ...prev]);
  };
  const updateService = async (id: string, patch: Partial<Service>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const saveService = async (s: Service) => {
    const res = await fetch(`/api/admin/bot-settings/${paletteId}/services/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (!isAuthed(res)) return; // セッション切れ → ログインへ
  };
  const deleteServ = async (id: string) => {
    if (!confirm('このサービスを削除しますか？')) return;
    const res = await fetch(`/api/admin/bot-settings/${paletteId}/services/${id}`, { method: 'DELETE' });
    if (!isAuthed(res)) return; // セッション切れ → ログインへ
    setServices((prev) => prev.filter((s) => s.id !== id));
  };
  const deleteAllServices = async () => {
    if (services.length === 0) return;
    if (!confirm(`サービスを${services.length}件すべて削除しますか？この操作は取り消せません。`)) return;
    const targets = [...services];
    setServices([]); // 楽観的に即時クリア
    const results = await Promise.allSettled(
      targets.map((s) =>
        fetch(`/api/admin/bot-settings/${paletteId}/services/${s.id}`, { method: 'DELETE' }),
      ),
    );
    // 失敗したものは戻す
    const failed = targets.filter((_, i) => results[i].status === 'rejected');
    if (failed.length > 0) {
      setServices(failed);
      setError(`${failed.length}件の削除に失敗しました。再度お試しください。`);
    }
  };

  // FAQ CRUD
  const addFaq = async () => {
    const res = await fetch(`/api/admin/bot-settings/${paletteId}/faqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '新しい質問', answer: '回答', priority: 3 }),
    });
    if (!isAuthed(res)) return; // セッション切れ → ログインへ
    const data = await res.json();
    if (data?.success && data.faq) setFaqs((prev) => [data.faq, ...prev]);
  };
  const updateFaq = (id: string, patch: Partial<Faq>) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const saveFaq = async (f: Faq) => {
    const res = await fetch(`/api/admin/bot-settings/${paletteId}/faqs/${f.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    if (!isAuthed(res)) return; // セッション切れ → ログインへ
  };
  const deleteFaq = async (id: string) => {
    if (!confirm('このFAQを削除しますか？')) return;
    const res = await fetch(`/api/admin/bot-settings/${paletteId}/faqs/${id}`, { method: 'DELETE' });
    if (!isAuthed(res)) return; // セッション切れ → ログインへ
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };
  const deleteAllFaqs = async () => {
    if (faqs.length === 0) return;
    if (!confirm(`Q&Aを${faqs.length}件すべて削除しますか？この操作は取り消せません。`)) return;
    const targets = [...faqs];
    setFaqs([]); // 楽観的に即時クリア
    const results = await Promise.allSettled(
      targets.map((f) =>
        fetch(`/api/admin/bot-settings/${paletteId}/faqs/${f.id}`, { method: 'DELETE' }),
      ),
    );
    // 失敗したものは戻す
    const failed = targets.filter((_, i) => results[i].status === 'rejected');
    if (failed.length > 0) {
      setFaqs(failed);
      setError(`${failed.length}件の削除に失敗しました。再度お試しください。`);
    }
  };

  const runAutoSetup = async () => {
    if (!autoUrl.trim() || autoRunning) return;
    setAutoRunning(true);
    setAutoResult('');
    setError('');
    try {
      const res = await fetch(`/api/admin/bot-settings/${paletteId}/auto-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: autoUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'AI生成に失敗しました');
      const { servicesCreated = 0, faqsCreated = 0, basic = {} } = data.summary || {};
      setAutoResult(`✓ 生成完了: 基本情報「${basic.shopName || '-'}」／サービス${servicesCreated}件／FAQ${faqsCreated}件を追加しました。`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'error');
    } finally {
      setAutoRunning(false);
    }
  };

  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js?id=${paletteId}" async></script>`;
  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const demoUrl = typeof window !== 'undefined' ? `${window.location.origin}/demo/${paletteId}` : '';
  const copyDemoUrl = () => {
    if (!demoUrl) return;
    navigator.clipboard.writeText(demoUrl);
    setDemoCopied(true);
    setTimeout(() => setDemoCopied(false), 2000);
  };

  // デモURL（契約不要・会話ログ非保存）。商談で見込み客に Bot を体験してもらう用。
  const demoModeUrl = typeof window !== 'undefined' ? `${window.location.origin}/demo/${paletteId}?demo=1` : '';
  const copyDemoModeUrl = () => {
    if (!demoModeUrl) return;
    navigator.clipboard.writeText(demoModeUrl);
    setDemoModeCopied(true);
    setTimeout(() => setDemoModeCopied(false), 2000);
  };

  const updateConfigField = (path: string[], value: any) => {
    setConfig((prev: any) => {
      const next = { ...prev };
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = { ...(cur[path[i]] || {}) };
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  if (loading || !config) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">読み込み中...</div>;
  }

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'basic', label: '基本情報', icon: Settings2 },
    { key: 'services', label: 'サービス', icon: Package },
    { key: 'faqs', label: 'Q&A', icon: HelpCircle },
    { key: 'conversation', label: '会話設計', icon: MessageSquare },
    { key: 'flow', label: 'ヒアリングフロー', icon: Workflow },
    { key: 'rules', label: 'NG・ルール', icon: AlertTriangle },
    { key: 'appearance', label: '見た目・埋込', icon: Palette },
    { key: 'reception', label: 'AI電話受付', icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {backHref && (
              <Link href={backHref} className="text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/palette-aix-mark-x.svg" alt="Palette AIX" className="w-8 h-8 rounded-lg" />
              <div>
                <h1 className="text-lg font-black text-slate-800">{paletteId} Bot設定</h1>
                {savedAt && <p className="text-[10px] text-emerald-600">保存済: {savedAt}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLiveChat(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              チャットを試す
            </button>
            <button
              onClick={copyDemoUrl}
              title={demoUrl}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5"
            >
              {demoCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {demoCopied ? 'コピー済み！' : '公開URLをコピー'}
            </button>
            <button
              onClick={copyDemoModeUrl}
              title={`${demoModeUrl}（契約不要・会話ログは保存されません）`}
              className="px-3 py-1.5 rounded-lg bg-fuchsia-50 border border-fuchsia-200 text-xs font-bold text-fuchsia-700 hover:bg-fuchsia-100 flex items-center gap-1.5"
            >
              {demoModeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {demoModeCopied ? 'コピー済み！' : 'デモURLをコピー'}
            </button>
            {reportsHref && (
              <Link
                href={reportsHref}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                成果レポート
              </Link>
            )}
            {sessionsHref && (
              <Link
                href={sessionsHref}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                会話ログ
              </Link>
            )}
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600">{error}</div>
        </div>
      )}

      {/* HP自動セットアップ */}
      <div className="max-w-7xl mx-auto px-6 mt-4">
        <div className="bg-gradient-to-r from-indigo-50 via-fuchsia-50 to-pink-50 border border-indigo-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-black text-slate-700">HPから初期設定を自動生成</span>
          </div>
          <input
            type="text"
            value={autoUrl}
            onChange={(e) => setAutoUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={autoRunning}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-indigo-300 outline-none text-sm disabled:opacity-60"
          />
          <button
            type="button"
            onClick={runAutoSetup}
            disabled={autoRunning || !autoUrl.trim()}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {autoRunning ? 'AIが生成中...' : 'AIで生成'}
          </button>
        </div>
        {autoResult && (
          <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{autoResult}</div>
        )}
        <p className="mt-2 text-[10px] text-slate-400">
          ※ HPのURLを入れて「AIで生成」を押すと、基本情報・サービス・Q&A・トーンをまとめて自動入力します（既存の内容は残し、新規分のみ追加）。
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'basic' && <BasicTab config={config} update={updateConfigField} />}
        {tab === 'services' && (
          <ServicesTab
            services={services}
            onAdd={addService}
            onChange={updateService}
            onSave={saveService}
            onDelete={deleteServ}
            onDeleteAll={deleteAllServices}
          />
        )}
        {tab === 'faqs' && (
          <FaqsTab
            faqs={faqs}
            onAdd={addFaq}
            onChange={updateFaq}
            onSave={saveFaq}
            onDelete={deleteFaq}
            onDeleteAll={deleteAllFaqs}
          />
        )}
        {tab === 'conversation' && <ConversationTab config={config} update={updateConfigField} paletteId={paletteId} />}
        {tab === 'flow' && <FlowTab config={config} update={updateConfigField} paletteId={paletteId} />}
        {tab === 'rules' && <RulesTab config={config} update={updateConfigField} />}
        {tab === 'appearance' && (
          <AppearanceTab
            config={config}
            update={updateConfigField}
            embedCode={embedCode}
            onCopy={copyEmbed}
            copied={copied}
            paletteId={paletteId}
          />
        )}
        {tab === 'reception' && (
          <ReceptionTab
            config={config}
            update={updateConfigField}
            did={receptionDid}
            onDidChange={setReceptionDid}
            onSaveDid={saveReceptionDid}
            didSaving={didSaving}
            didSaved={didSaved}
          />
        )}
      </div>

      {/* Live Chat Modal */}
      {showLiveChat && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowLiveChat(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-black text-slate-800">チャットBot プレビュー</h2>
                <span className="text-[10px] text-slate-400">右下のバブルをクリックして会話を開始</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-amber-600">※ 保存後の設定が反映されます</p>
                <button onClick={() => setShowLiveChat(false)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <iframe
              src={`/bot-preview?id=${paletteId}&t=${Date.now()}`}
              className="flex-1 w-full bg-slate-50 border-0"
              title="Bot Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-600 mb-1.5">{children}</label>;
}
function TextInput({ value, onChange, placeholder }: any) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-indigo-300 outline-none text-sm"
    />
  );
}
function TextArea({ value, onChange, placeholder, rows = 3 }: any) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-indigo-300 outline-none text-sm resize-y"
    />
  );
}
function Select({ value, onChange, options }: any) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-indigo-300 outline-none text-sm"
    >
      {options.map((o: any) => (
        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
          {typeof o === 'string' ? o : o.label}
        </option>
      ))}
    </select>
  );
}
function Card({ title, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
      <h3 className="text-sm font-black text-slate-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

/** 数値セグメント選択（1〜Nの大きなボタン） */
function SegmentedNumber({ value, onChange, min = 1, max = 3, labels }: { value: number; onChange: (v: number) => void; min?: number; max?: number; labels?: Record<number, string> }) {
  const items = [];
  for (let i = min; i <= max; i++) items.push(i);
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
      {items.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${
            value === n
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {labels?.[n] || n}
        </button>
      ))}
    </div>
  );
}

/** 絵文字＋ラベル付きチップ選択（単一） */
function ChipSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; emoji?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 rounded-full text-xs font-bold border transition-all ${
            value === o.value
              ? 'bg-indigo-500 text-white border-indigo-500 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
          }`}
        >
          {o.emoji && <span className="mr-1">{o.emoji}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 複数トグルチップ */
function ChipToggle({ values, onToggle, options }: { values: Record<string, boolean>; onToggle: (key: string, next: boolean) => void; options: { value: string; label: string; emoji?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = Boolean(values[o.value]);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value, !on)}
            className={`px-3 py-2 rounded-full text-xs font-bold border transition-all ${
              on
                ? 'bg-indigo-500 text-white border-indigo-500 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {o.emoji && <span className="mr-1">{o.emoji}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** 見た目の良いトグルスイッチ */
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-300'}`}
        style={{ width: 40, height: 22 }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow-md transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>
      {label && <span className="text-xs font-bold text-slate-700">{label}</span>}
    </label>
  );
}

/** スライダー（数値範囲） */
function SliderNumber({ value, onChange, min, max, label, hint }: { value: number; onChange: (v: number) => void; min: number; max: number; label?: string; hint?: string }) {
  return (
    <div>
      {label && (
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-bold text-slate-600">{label}</span>
          <span className="text-lg font-black text-indigo-600">{value}<span className="text-[10px] text-slate-400 ml-1">回</span></span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{min}回</span>
        <span>{max}回</span>
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
  '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#1e3a8a', '#334155', '#64748b', '#1a1a1a', '#ffffff',
  '#c59500', '#7c2d12', '#881337', '#166534', '#1e40af',
];

function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm hover:scale-105 transition-transform shrink-0"
          style={{ background: value || '#6366f1' }}
          aria-label="色を選択"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-indigo-300 outline-none text-sm font-mono"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 p-3 bg-white rounded-xl shadow-xl border border-slate-200 w-[280px]">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">パレット</div>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false); }}
                className={`w-full aspect-square rounded-lg border transition-all hover:scale-110 ${value === c ? 'ring-2 ring-indigo-500 ring-offset-1' : 'border-slate-200'}`}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">カスタム</div>
          <input
            type="color"
            value={value || '#6366f1'}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commitTag = (raw: string) => {
    const val = String(raw || '').trim();
    if (!val) return;
    if (tags.includes(val)) {
      setInput('');
      return;
    }
    onChange([...tags, val]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 確定中のIME変換はEnterでも無視
    if ((e.nativeEvent as any).isComposing) return;

    if (e.key === 'Enter' || e.key === 'Tab') {
      if (input.trim()) {
        e.preventDefault();
        commitTag(input);
      }
      return;
    }
    if (e.key === ',' || e.key === '、') {
      e.preventDefault();
      commitTag(input);
      return;
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
      return;
    }
  };

  const handleBlur = () => {
    if (input.trim()) commitTag(input);
  };

  const removeTag = (i: number) => {
    const next = [...tags];
    next.splice(i, 1);
    onChange(next);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-slate-200 bg-white focus-within:border-indigo-300 transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            className="text-indigo-400 hover:text-indigo-700"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? (placeholder || 'タグを入力（Enterで確定）') : ''}
        className="flex-1 min-w-[120px] px-1 py-0.5 bg-transparent outline-none text-sm"
      />
    </div>
  );
}

// ─── Basic Tab ────────────────────────────────────

function BasicTab({ config, update }: any) {
  const b = config.basic || {};
  const t = config.tone || {};
  return (
    <>
      <Card title="店舗・事業情報">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>屋号・会社名</Label><TextInput value={b.shopName} onChange={(v: string) => update(['basic', 'shopName'], v)} /></div>
          <div><Label>業種</Label><TextInput value={b.industry} onChange={(v: string) => update(['basic', 'industry'], v)} placeholder="美容室・整体院 等" /></div>
          <div className="md:col-span-2"><Label>キャッチコピー（30文字以内）</Label><TextInput value={b.catchphrase} onChange={(v: string) => update(['basic', 'catchphrase'], v)} placeholder="〇〇を大切にする〇〇店" /></div>
          <div className="md:col-span-2"><Label>一言紹介</Label><TextArea value={b.intro} onChange={(v: string) => update(['basic', 'intro'], v)} placeholder="どんなお店ですか？" /></div>
          <div><Label>対応エリア</Label><TextInput value={b.area} onChange={(v: string) => update(['basic', 'area'], v)} /></div>
          <div><Label>営業時間</Label><TextInput value={b.businessHours} onChange={(v: string) => update(['basic', 'businessHours'], v)} placeholder="10:00-20:00" /></div>
          <div><Label>定休日</Label><TextInput value={b.closedDays} onChange={(v: string) => update(['basic', 'closedDays'], v)} placeholder="月曜" /></div>
        </div>
      </Card>

      <Card title="会話トーン">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>性格</Label><Select value={t.personality} onChange={(v: string) => update(['tone', 'personality'], v)} options={['親しみやすい', '丁寧', 'プロっぽい', '癒し系', '元気']} /></div>
          <div><Label>呼称</Label><TextInput value={t.honorific} onChange={(v: string) => update(['tone', 'honorific'], v)} placeholder="お客様 / 〇〇さん" /></div>
          <div><Label>絵文字</Label><Select value={t.emoji} onChange={(v: string) => update(['tone', 'emoji'], v)} options={['多め', '少なめ', 'なし']} /></div>
          <div><Label>一人称</Label><TextInput value={t.firstPerson} onChange={(v: string) => update(['tone', 'firstPerson'], v)} placeholder="私・当店" /></div>
          <div><Label>敬語レベル</Label><Select value={t.keigoLevel} onChange={(v: string) => update(['tone', 'keigoLevel'], v)} options={['丁寧語', '尊敬語', 'タメ口寄り']} /></div>
          <div><Label>返答の長さ</Label><Select value={t.replyLength} onChange={(v: string) => update(['tone', 'replyLength'], v)} options={['短め', '普通', '長め']} /></div>
        </div>
      </Card>
    </>
  );
}

// ─── Services Tab ────────────────────────────────────

function ServicesTab({ services, onAdd, onChange, onSave, onDelete, onDeleteAll }: any) {
  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-2">
        <p className="text-sm text-slate-600">botが訪問者に提案するサービス・商品を登録してください。</p>
        <div className="flex items-center gap-2 shrink-0">
          {services.length > 0 && (
            <button onClick={onDeleteAll} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-bold flex items-center gap-1.5 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />一括削除（{services.length}件）
            </button>
          )}
          <button onClick={onAdd} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-600">
            <Plus className="w-3.5 h-3.5" />サービス追加
          </button>
        </div>
      </div>
      {services.length === 0 && <div className="text-center py-10 text-sm text-slate-400">サービスがまだありません</div>}
      {services.map((s: Service) => (
        <Card key={s.id} title={s.name || 'サービス'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>サービス名</Label><TextInput value={s.name} onChange={(v: string) => onChange(s.id, { name: v })} /></div>
            <div><Label>価格</Label><TextInput value={s.price} onChange={(v: string) => onChange(s.id, { price: v })} placeholder="¥8,800 or 要見積もり" /></div>
            <div><Label>所要時間</Label><TextInput value={s.duration} onChange={(v: string) => onChange(s.id, { duration: v })} placeholder="90分" /></div>
            <div><Label>表示順</Label><TextInput value={String(s.sortOrder ?? 0)} onChange={(v: string) => onChange(s.id, { sortOrder: Number(v) || 0 })} /></div>
            <div className="md:col-span-2"><Label>サービス概要</Label><TextArea value={s.description} onChange={(v: string) => onChange(s.id, { description: v })} /></div>
            <div className="md:col-span-2">
              <Label>こんな方におすすめ（タグ）</Label>
              <TagInput
                tags={s.targetTags || []}
                onChange={(next) => onChange(s.id, { targetTags: next })}
                placeholder="例: クセ毛／40代以降／広がり（Enterで追加）"
              />
            </div>
            <div className="md:col-span-2">
              <Label>解決できる悩み（タグ）</Label>
              <TagInput
                tags={s.problemTags || []}
                onChange={(next) => onChange(s.id, { problemTags: next })}
                placeholder="例: まとまらない／毎朝のセット（Enterで追加）"
              />
            </div>
            <div className="md:col-span-2"><Label>アピールポイント</Label><TextArea value={s.features} onChange={(v: string) => onChange(s.id, { features: v })} /></div>
            <div className="md:col-span-2"><Label>お客様の声（任意）</Label><TextArea value={s.testimonial} onChange={(v: string) => onChange(s.id, { testimonial: v })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => onDelete(s.id)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 flex items-center gap-1">
              <Trash2 className="w-3 h-3" />削除
            </button>
            <button onClick={() => onSave(s)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700">このサービスを保存</button>
          </div>
        </Card>
      ))}
    </>
  );
}

// ─── FAQs Tab ────────────────────────────────────

function FaqsTab({ faqs, onAdd, onChange, onSave, onDelete, onDeleteAll }: any) {
  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-2">
        <p className="text-sm text-slate-600">よくある質問と回答を登録してください。botが会話中に参照します。</p>
        <div className="flex items-center gap-2 shrink-0">
          {faqs.length > 0 && (
            <button onClick={onDeleteAll} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-bold flex items-center gap-1.5 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />一括削除（{faqs.length}件）
            </button>
          )}
          <button onClick={onAdd} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-600">
            <Plus className="w-3.5 h-3.5" />Q&A追加
          </button>
        </div>
      </div>
      {faqs.length === 0 && <div className="text-center py-10 text-sm text-slate-400">Q&Aがまだありません</div>}
      {faqs.map((f: Faq) => (
        <Card key={f.id} title={f.question || 'Q&A'}>
          <div className="space-y-3">
            <div><Label>質問</Label><TextInput value={f.question} onChange={(v: string) => onChange(f.id, { question: v })} /></div>
            <div><Label>回答</Label><TextArea value={f.answer} onChange={(v: string) => onChange(f.id, { answer: v })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>カテゴリ</Label><TextInput value={f.category} onChange={(v: string) => onChange(f.id, { category: v })} placeholder="料金 / 予約 / 施術内容" /></div>
              <div><Label>優先度（1=高, 5=低）</Label><Select value={String(f.priority)} onChange={(v: string) => onChange(f.id, { priority: Number(v) })} options={['1', '2', '3', '4', '5']} /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => onDelete(f.id)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 flex items-center gap-1">
              <Trash2 className="w-3 h-3" />削除
            </button>
            <button onClick={() => onSave(f)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700">このQ&Aを保存</button>
          </div>
        </Card>
      ))}
    </>
  );
}

// ─── Conversation Tab ────────────────────────────────────

function ConversationTab({ config, update, paletteId }: any) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  // 旧 meeting.action='calendar' + calendarUrl を reservation に自動移行（表示時に一度だけ）
  useEffect(() => {
    const m = config?.goals?.meeting;
    if (!m) return;
    if (m.action === 'calendar') {
      // calendar URL が設定されていて reservation.url が空なら移す
      const existingResUrl = config?.goals?.reservation?.url;
      if (m.calendarUrl && !existingResUrl) {
        update(['goals', 'reservation', 'url'], m.calendarUrl);
        if (!config?.goals?.reservation?.enabled) {
          update(['goals', 'reservation', 'enabled'], true);
        }
      }
      // action を reservation に寄せる
      update(['goals', 'meeting', 'action'], 'reservation');
      // calendarUrl はクリア (互換処理は bot-engine 側に残っている)
      if (m.calendarUrl) update(['goals', 'meeting', 'calendarUrl'], '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.goals?.meeting?.action]);

  const runNotifyTest = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const res = await fetch(`/api/admin/bot-settings/${paletteId}/notify-test`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setTestResult('❌ ' + (data?.error || 'テスト送信に失敗しました'));
        return;
      }
      const lines: string[] = [];
      const r = data.result || {};
      if (r.email) lines.push(`📧 メール: ${r.email.ok ? '✓ ' + (r.email.error || '送信成功') : '✗ ' + (r.email.error || 'error')}`);
      if (r.line) lines.push(`💚 LINE: ${r.line.ok ? '✓ ' + (r.line.error || '送信成功') : '✗ ' + (r.line.error || 'error')}`);
      if (r.webhook) lines.push(`🔗 Webhook: ${r.webhook.ok ? '✓ ' + (r.webhook.error || '送信成功') : '✗ ' + (r.webhook.error || 'error')}`);
      if (!lines.length) lines.push('どの通知先も設定されていません（メール/LINE/Webhookいずれかを入力してください）');
      setTestResult(lines.join('\n'));
    } catch (err: any) {
      setTestResult('❌ ' + (err?.message || 'error'));
    } finally {
      setTesting(false);
    }
  };

  // Below uses paletteId - keep existing variable names
  const c = config.conversation || {};
  const g = config.goals || {};
  const show = c.cardShow || {};
  const matrix = c.closingMatrix || {};

  const goalKeys: { key: string; label: string }[] = [
    { key: 'reservation', label: '予約' },
    { key: 'inquiry', label: '問い合わせ' },
    { key: 'phone', label: '電話' },
    { key: 'line', label: 'LINE' },
    { key: 'document', label: '資料請求' },
  ];

  return (
    <>
      <Card title="① ウェルカム・ヒアリング">
        <div className="space-y-5">
          <div>
            <Label>ウェルカムメッセージ（訪問者が最初に見る）</Label>
            <TextArea
              value={c.welcomeMessage}
              onChange={(v: string) => update(['conversation', 'welcomeMessage'], v)}
              placeholder="こんにちは！何かお困りですか？"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SliderNumber
              label="最小ヒアリング回数"
              value={Number(c.hearingMinTurns ?? 2)}
              onChange={(v) => update(['conversation', 'hearingMinTurns'], v)}
              min={1}
              max={5}
              hint="最低でもこの回数は深掘り質問をします"
            />
            <SliderNumber
              label="最大ヒアリング回数"
              value={Number(c.hearingMaxTurns ?? 5)}
              onChange={(v) => update(['conversation', 'hearingMaxTurns'], v)}
              min={2}
              max={10}
              hint="これを超えたらサービス提案へ強制遷移"
            />
          </div>
        </div>
      </Card>

      <Card title="② サービス提案（カード形式）">
        <div className="space-y-5">
          <div>
            <Label>提示カード数</Label>
            <SegmentedNumber
              value={Number(c.cardCount ?? 3)}
              onChange={(v) => update(['conversation', 'cardCount'], v)}
              min={1}
              max={3}
            />
            <p className="text-[10px] text-slate-400 mt-1">1枚だけなら「これ！」と推す、3枚なら比較検討</p>
          </div>

          <div>
            <Label>提示順の基準</Label>
            <ChipSelect
              value={String(c.cardSortBy || 'match')}
              onChange={(v) => update(['conversation', 'cardSortBy'], v)}
              options={[
                { value: 'match', label: 'マッチ度', emoji: '🎯' },
                { value: 'price_asc', label: '安い順', emoji: '💴' },
                { value: 'price_desc', label: '高い順', emoji: '💎' },
                { value: 'new', label: '新着順', emoji: '✨' },
              ]}
            />
          </div>

          <div>
            <Label>カードに表示する項目</Label>
            <ChipToggle
              values={show}
              onToggle={(key, next) => update(['conversation', 'cardShow', key], next)}
              options={[
                { value: 'price', label: '価格', emoji: '💴' },
                { value: 'duration', label: '所要時間', emoji: '⏱' },
                { value: 'features', label: '特徴', emoji: '⭐' },
                { value: 'testimonial', label: 'お客様の声', emoji: '💬' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card title="③ クロージング先（ゴール）の準備">
        <p className="text-xs text-slate-500 mb-4">
          訪問者が最後にたどり着く「アクション」を設定。使うものだけONにして、URLや番号を入れてください。
        </p>
        <div className="space-y-3">
          {([
            { key: 'reservation', label: '予約', emoji: '📅', fieldLabel: '予約ページのURL（Googleカレンダー予約URLもOK）', desc: '予約サイト・予約フォーム・Googleカレンダー予約ページに誘導' },
            { key: 'inquiry', label: '問い合わせ', emoji: '💬', fieldLabel: '問い合わせフォームのURL', desc: '一般的な問い合わせフォーム' },
            { key: 'phone', label: '電話', emoji: '📞', fieldLabel: '電話番号', desc: 'スマホならタップで発信' },
            { key: 'line', label: 'LINE登録', emoji: '💚', fieldLabel: 'LINE友だち追加URL', desc: '関係維持・後日追客用' },
            { key: 'document', label: '資料請求', emoji: '📄', fieldLabel: 'ダウンロードURL', desc: '資料PDFへの直接リンク' },
          ] as const).map((gk) => {
            const goal = g[gk.key] || {};
            const enabled = Boolean(goal.enabled);
            return (
              <div
                key={gk.key}
                className={`rounded-xl border p-4 transition-all ${
                  enabled ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{gk.emoji}</span>
                    <div>
                      <div className="text-sm font-black text-slate-800">{gk.label}</div>
                      <div className="text-[10px] text-slate-500">{gk.desc}</div>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={enabled}
                    onChange={(v) => update(['goals', gk.key, 'enabled'], v)}
                  />
                </div>
                {enabled && (
                  <>
                    {/* inquiry / reservation は受付モードを選択可能 */}
                    {(gk.key === 'inquiry' || gk.key === 'reservation') && (() => {
                      const resolvedMode: 'url' | 'bot_form' = goal.mode
                        ? goal.mode
                        : (goal.url ? 'url' : 'bot_form');
                      return (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => update(['goals', gk.key, 'mode'], 'url')}
                            className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                              resolvedMode === 'url'
                                ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            🔗 外部URLに遷移
                          </button>
                          <button
                            type="button"
                            onClick={() => update(['goals', gk.key, 'mode'], 'bot_form')}
                            className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                              resolvedMode === 'bot_form'
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            🤖 Bot内でヒアリング → AI要約通知
                          </button>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 mb-1">ボタンに表示する文言</div>
                        <TextInput
                          value={goal.label}
                          onChange={(v: string) => update(['goals', gk.key, 'label'], v)}
                          placeholder={gk.label + 'する'}
                        />
                      </div>
                      {/* URLモード or それ以外の goal は URL/番号欄を表示 */}
                      {(() => {
                        const isInqOrRes = gk.key === 'inquiry' || gk.key === 'reservation';
                        const resolvedMode: 'url' | 'bot_form' = isInqOrRes
                          ? (goal.mode ? goal.mode : (goal.url ? 'url' : 'bot_form'))
                          : 'url';
                        if (isInqOrRes && resolvedMode === 'bot_form') return null;
                        return (
                          <div>
                            <div className="text-[10px] font-bold text-slate-500 mb-1">{gk.fieldLabel}</div>
                            <TextInput
                              value={gk.key === 'phone' ? goal.number : goal.url}
                              onChange={(v: string) => update(['goals', gk.key, gk.key === 'phone' ? 'number' : 'url'], v)}
                              placeholder={gk.key === 'phone' ? '03-xxxx-xxxx' : 'https://'}
                            />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bot内完結モードのときのみリード項目エディタを表示 */}
                    {(gk.key === 'inquiry' || gk.key === 'reservation') && (() => {
                      const resolvedMode: 'url' | 'bot_form' = goal.mode
                        ? goal.mode
                        : (goal.url ? 'url' : 'bot_form');
                      if (resolvedMode !== 'bot_form') return null;
                      return (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-3">
                          <div className="text-[11px] text-emerald-800">
                            <b>🤖 Bot 内でヒアリング</b>: 訪問者に直接 lead_form を出して情報を収集します。
                            送信後は AI要約通知（④）が自動で飛び、担当者に会話要約+リード情報が届きます。
                          </div>
                          <GoalLeadFieldsEditor
                            fields={
                              Array.isArray(goal.leadFields) && goal.leadFields.length > 0
                                ? goal.leadFields
                                : []
                            }
                            onChange={(v: LeadField[]) => update(['goals', gk.key, 'leadFields'], v)}
                          />
                          <div className="text-[10px] text-slate-500">
                            未設定の場合は「会話設計」タブのリード項目を使用します。
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="③-2 🎯 商談ゴール（AI がクロージングで誘導する目的）">
        <p className="text-xs text-slate-500 mb-4">
          ヒアリング後、AI が「ぴったりです。一度ご相談しませんか？」のように誘導し、
          承諾されたら名前・メール・電話を収集して、Google カレンダーの予約ページへ案内します。
        </p>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-100 flex items-center justify-center">🎯</div>
            <div>
              <div className="text-sm font-black text-slate-800">商談ゴールを有効にする</div>
              <div className="text-[10px] text-slate-500">WEBミーティング / 見積もり / 相談など最終ゴールに誘導</div>
            </div>
          </div>
          <ToggleSwitch
            checked={Boolean(g.meeting?.enabled)}
            onChange={(v: boolean) => update(['goals', 'meeting', 'enabled'], v)}
          />
        </div>
        {g.meeting?.enabled && (
          <div className="space-y-4 p-4 rounded-lg bg-fuchsia-50 border border-fuchsia-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>ゴールの種類</Label>
                <Select
                  value={g.meeting?.kind || 'web_mtg'}
                  onChange={(v: string) => update(['goals', 'meeting', 'kind'], v)}
                  options={[
                    { value: 'web_mtg', label: 'WEBミーティング' },
                    { value: 'in_person', label: '対面ミーティング' },
                    { value: 'estimate', label: '見積もり提出' },
                    { value: 'consultation', label: '無料相談' },
                    { value: 'demo', label: 'デモ・体験' },
                    { value: 'trial', label: '無料トライアル' },
                    { value: 'custom', label: 'カスタム' },
                  ]}
                />
              </div>
              <div>
                <Label>ゴール名（会話で使う呼び方）</Label>
                <TextInput
                  value={g.meeting?.label || ''}
                  onChange={(v: string) => update(['goals', 'meeting', 'label'], v)}
                  placeholder="WEBミーティング"
                />
              </div>
            </div>
            <div>
              <Label>誘導文言（AI がヒアリング後に提示）</Label>
              <TextArea
                value={g.meeting?.invitationPrompt || ''}
                onChange={(v: string) => update(['goals', 'meeting', 'invitationPrompt'], v)}
                placeholder="ヒアリング内容的に、御社のお悩みにぴったりの解決策がありそうです。一度、担当と30分のWEBミーティングで詳しくお聞かせいただけませんか？"
              />
              <p className="text-[10px] text-slate-400 mt-1">AI はこの文章をベースに、自然な日本語で誘導します。</p>
            </div>
            <div>
              <Label>承諾後のアクション（リード送信後に何をさせるか）</Label>
              <Select
                value={(g.meeting?.action === 'calendar' ? 'reservation' : g.meeting?.action) || 'reservation'}
                onChange={(v: string) => update(['goals', 'meeting', 'action'], v)}
                options={[
                  { value: 'reservation', label: '📅 ③の「予約」ゴールへ誘導（Googleカレンダー予約URLもここで OK）' },
                  { value: 'inquiry', label: '💬 ③の「問い合わせ」ゴールへ誘導' },
                  { value: 'phone', label: '📞 ③の「電話」ゴールへ誘導' },
                  { value: 'line', label: '💚 ③の「LINE登録」ゴールへ誘導' },
                  { value: 'document', label: '📄 ③の「資料請求」ゴールへ誘導' },
                  { value: 'lead_only', label: '✉️ リード送信のみ（AI要約通知で担当者に連絡）' },
                ]}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                ③クロージング先で設定した URL/番号をそのまま使います。Googleカレンダー予約ページ(calendar.app.google/...)は「予約」ゴールのURL欄に貼ってください。
              </p>
            </div>
            {g.meeting?.action && g.meeting.action !== 'lead_only' && (() => {
              // 旧 'calendar' は reservation として扱う
              const effectiveAction = g.meeting.action === 'calendar' ? 'reservation' : g.meeting.action;
              const target = (g as any)[effectiveAction];
              if (!target?.enabled) {
                return (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                    ⚠️ ③クロージング先で「{effectiveAction}」ゴールが無効化されています。先に有効化してURL/番号を設定してください。
                  </div>
                );
              }
              const urlOrNumber = effectiveAction === 'phone' ? target.number : target.url;
              if (!urlOrNumber) {
                return (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                    ⚠️ ③クロージング先の「{effectiveAction}」に {effectiveAction === 'phone' ? '電話番号' : 'URL'} が未設定です。
                  </div>
                );
              }
              return (
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                  ✓ ③の「{effectiveAction}」へ誘導します: <span className="font-mono">{String(urlOrNumber).slice(0, 60)}</span>
                </div>
              );
            })()}
            {g.meeting?.action === 'lead_only' && (
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                💡 lead 送信のみで完結し、外部遷移はしません。AI要約通知（④）で担当者に自動連絡が飛びます。
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>日時選択ボタンのラベル</Label>
                <TextInput
                  value={g.meeting?.buttonLabel || ''}
                  onChange={(v: string) => update(['goals', 'meeting', 'buttonLabel'], v)}
                  placeholder="日時を選ぶ"
                />
              </div>
              <div>
                <Label>「もう少し考える」を押された時の分岐</Label>
                <Select
                  value={(g.meeting?.declineFallback === 'nurture' ? 'document' : g.meeting?.declineFallback) || 'document'}
                  onChange={(v: string) => update(['goals', 'meeting', 'declineFallback'], v)}
                  options={[
                    { value: 'document', label: '資料請求に切り替え' },
                    { value: 'line', label: 'LINE登録に切り替え' },
                  ]}
                />
              </div>
            </div>
            <div className="p-3 rounded bg-white border border-fuchsia-200 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs font-black text-slate-800">💡 承諾後に情報を収集する</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {g.meeting?.collectLead !== false
                      ? '訪問者が「はい、お願いします」と承諾したら、下の項目で情報収集します。'
                      : 'OFFにすると、承諾後すぐに最終アクションへ進みます（リード情報は収集されません）。'}
                  </div>
                </div>
                <ToggleSwitch
                  checked={g.meeting?.collectLead !== false}
                  onChange={(v: boolean) => update(['goals', 'meeting', 'collectLead'], v)}
                />
              </div>
              {g.meeting?.collectLead !== false ? (
                <>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => update(['goals', 'meeting', 'leadFields'], [...DEFAULT_MEETING_LEAD_FIELDS])}
                      className="text-[10px] text-fuchsia-600 hover:text-fuchsia-700 font-bold"
                    >
                      デフォルトに戻す
                    </button>
                  </div>
                  <GoalLeadFieldsEditor
                    fields={
                      Array.isArray(g.meeting?.leadFields) && g.meeting.leadFields.length > 0
                        ? g.meeting.leadFields
                        : DEFAULT_MEETING_LEAD_FIELDS
                    }
                    onChange={(v: LeadField[]) => update(['goals', 'meeting', 'leadFields'], v)}
                    accent="fuchsia"
                  />
                </>
              ) : (
                <div className="text-[11px] text-slate-600 p-2 rounded bg-slate-50 border border-slate-200">
                  承諾後すぐに最終アクション（{g.meeting?.action === 'lead_only' ? '完了メッセージ' : '③ のゴールへ遷移'}）に進みます。
                  訪問者情報は収集されませんが、AI要約通知（④）の会話ログで担当者に状況は届きます。
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card title="④ AI要約通知（自動・バックグラウンド）">
        <p className="text-xs text-slate-500 mb-4">
          Bot が訪問者への対応を完了すると（問い合わせフォーム送信・CTA クリック・商談確定など）、
          <b>AI が会話を要約して担当者に自動で通知</b>します。訪問者側のUIには何も表示されません。
        </p>

        <div className={`rounded-xl border p-4 transition-all ${g.notify?.enabled ? 'bg-gradient-to-br from-indigo-50 to-fuchsia-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📬</span>
              <div>
                <div className="text-sm font-black text-slate-800">AI要約通知を有効にする</div>
                <div className="text-[10px] text-slate-500">会話完了時に担当者へバックグラウンド送信</div>
              </div>
            </div>
            <ToggleSwitch
              checked={Boolean(g.notify?.enabled)}
              onChange={(v) => update(['goals', 'notify', 'enabled'], v)}
            />
          </div>

          {g.notify?.enabled && (
            <div className="space-y-4 mt-4 pt-4 border-t border-indigo-200">
              <div className="bg-white/70 rounded-lg p-3 border border-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📧</span>
                  <span className="text-xs font-black text-slate-700">メール通知</span>
                </div>
                <TextInput
                  value={g.notify?.emailAddress || ''}
                  onChange={(v: string) => update(['goals', 'notify', 'emailAddress'], v)}
                  placeholder="owner@example.com"
                />
                <p className="text-[10px] text-slate-400 mt-1">AI要約＋訪問者情報がこのアドレスに届きます</p>
              </div>

              <div className="bg-white/70 rounded-lg p-3 border border-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💚</span>
                  <span className="text-xs font-black text-slate-700">LINE通知</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <TextInput
                    value={g.notify?.lineChannelToken || ''}
                    onChange={(v: string) => update(['goals', 'notify', 'lineChannelToken'], v)}
                    placeholder="Channel Access Token（LINE Developers で発行）"
                  />
                  <TextInput
                    value={g.notify?.lineUserId || ''}
                    onChange={(v: string) => update(['goals', 'notify', 'lineUserId'], v)}
                    placeholder="受信するUser ID（U1234...）"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">LINE公式アカウントからオーナーのLINEに通知が届きます</p>
              </div>

              <div className="bg-white/70 rounded-lg p-3 border border-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔗</span>
                  <span className="text-xs font-black text-slate-700">その他（Slack / Discord / カスタム）</span>
                </div>
                <TextInput
                  value={g.notify?.webhookUrl || ''}
                  onChange={(v: string) => update(['goals', 'notify', 'webhookUrl'], v)}
                  placeholder="https://hooks.slack.com/..."
                />
                <p className="text-[10px] text-slate-400 mt-1">Webhook URLを貼るとJSON POSTで通知</p>
              </div>

              {/* テスト送信 */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-amber-800">🧪 テスト送信</div>
                    <div className="text-[10px] text-amber-600 mt-0.5">
                      先に「保存」を押した上で、ダミーのリード情報でテスト通知を送信します。
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runNotifyTest}
                    disabled={testing}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-black hover:bg-amber-600 disabled:opacity-50 shrink-0"
                  >
                    {testing ? '送信中...' : 'テスト送信'}
                  </button>
                </div>
                {testResult && (
                  <pre className="mt-3 p-2 bg-white rounded text-[11px] text-slate-700 whitespace-pre-wrap border border-amber-200">{testResult}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="⑤ 買う気度 × クロージング先の優先順位">
        <p className="text-xs text-slate-500 mb-4">
          訪問者の <b>買う気度</b>（会話から自動判定）に応じて、どのクロージング方法を優先するかを設定します。<br />
          ゴールをクリックして選択順に並べてください（番号が優先順位）。
        </p>

        {/* 凡例 */}
        <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
          <div className="flex items-center gap-1"><span className="text-base">🔥</span>熱い＝積極的にクロージング</div>
          <div className="flex items-center gap-1"><span className="text-base">🟡</span>検討中＝不安解消してから</div>
          <div className="flex items-center gap-1"><span className="text-base">⚪</span>冷＝関係維持を優先</div>
        </div>

        <div className="space-y-3">
          {([
            { score: '5', emoji: '🔥', label: '即決', desc: '「予約したい」「今すぐ」等', tone: 'bg-red-50 border-red-200' },
            { score: '4', emoji: '🔥', label: '前向き', desc: '「いいね」「やってみたい」等', tone: 'bg-orange-50 border-orange-200' },
            { score: '3', emoji: '🟡', label: '検討中', desc: '質問が多い／比較検討', tone: 'bg-amber-50 border-amber-200' },
            { score: '2', emoji: '😐', label: '迷い', desc: '「考えます」「また今度」等', tone: 'bg-slate-50 border-slate-200' },
            { score: '1', emoji: '❄️', label: '冷やかし', desc: '軽い情報収集のみ', tone: 'bg-blue-50 border-blue-200' },
          ] as const).map((row) => {
            const list: string[] = Array.isArray(matrix[row.score]) ? matrix[row.score] : [];
            // AI要約通知(notify)はバックグラウンド自動通知になったため選択肢から除外
            const GOAL_OPTIONS: { key: string; label: string; emoji: string }[] = [
              { key: 'reservation', label: '予約', emoji: '📅' },
              { key: 'inquiry', label: '問い合わせ', emoji: '💬' },
              { key: 'phone', label: '電話', emoji: '📞' },
              { key: 'line', label: 'LINE登録', emoji: '💚' },
              { key: 'document', label: '資料請求', emoji: '📄' },
            ];
            const toggleGoal = (key: string) => {
              const pos = list.indexOf(key);
              let next: string[];
              if (pos >= 0) {
                next = list.filter((k) => k !== key);
              } else {
                next = [...list, key];
              }
              update(['conversation', 'closingMatrix', row.score], next);
            };
            return (
              <div key={row.score} className={`rounded-xl border p-3 ${row.tone}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{row.emoji}</span>
                  <div>
                    <div className="text-sm font-black text-slate-800">スコア{row.score}・{row.label}</div>
                    <div className="text-[10px] text-slate-500">{row.desc}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_OPTIONS.map((opt) => {
                    const pos = list.indexOf(opt.key);
                    const selected = pos >= 0;
                    const enabled = Boolean((g as any)[opt.key]?.enabled);
                    // 選択済みなら無効化ゴールでもクリック可能（削除できるように）
                    const clickable = enabled || selected;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGoal(opt.key); }}
                        disabled={!clickable}
                        title={!enabled && selected ? 'ゴール無効化済。クリックで削除' : !enabled ? 'このゴールは無効です。上のクロージング設定で有効にしてください' : (selected ? 'クリックで解除' : 'クリックで追加')}
                        className={`relative px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                          selected
                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-md hover:bg-indigo-600'
                            : enabled
                              ? 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
                              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {selected && (
                          <span
                            className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-white text-indigo-600 text-[9px] font-black flex items-center justify-center border-2 border-indigo-500 pointer-events-none"
                          >
                            {pos + 1}
                          </span>
                        )}
                        <span className="mr-1 pointer-events-none">{opt.emoji}</span>
                        <span className="pointer-events-none">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                {list.length === 0 && (
                  <div className="text-[10px] text-slate-400 mt-2">⚠ 未設定（AIが判断します）</div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400 mt-3">
          ※ クリック順が優先順位（1が最優先）。もう一度クリックで解除。<br />
          ※ グレーアウトしているゴールは上の「クロージング（ゴール）設定」で有効化してください。
        </p>
      </Card>

      <Card title="⑥ リード取得項目">
        <div className="space-y-2">
          {(c.leadFields || []).map((field: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <TextInput
                value={field.key}
                onChange={(v: string) => {
                  const next = [...(c.leadFields || [])];
                  next[i] = { ...next[i], key: v };
                  update(['conversation', 'leadFields'], next);
                }}
                placeholder="key"
              />
              <TextInput
                value={field.label}
                onChange={(v: string) => {
                  const next = [...(c.leadFields || [])];
                  next[i] = { ...next[i], label: v };
                  update(['conversation', 'leadFields'], next);
                }}
                placeholder="ラベル"
              />
              <label className="flex items-center gap-1 text-xs shrink-0">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => {
                    const next = [...(c.leadFields || [])];
                    next[i] = { ...next[i], required: e.target.checked };
                    update(['conversation', 'leadFields'], next);
                  }}
                />
                必須
              </label>
              <button
                onClick={() => {
                  const next = [...(c.leadFields || [])];
                  next.splice(i, 1);
                  update(['conversation', 'leadFields'], next);
                }}
                className="text-red-400 hover:text-red-600"
              ><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button
            onClick={() => update(['conversation', 'leadFields'], [...(c.leadFields || []), { key: 'field', label: '項目', required: false }])}
            className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
          ><Plus className="w-3 h-3" />項目追加</button>
        </div>
      </Card>
    </>
  );
}

// ─── Nurture Tab ────────────────────────────────────

// ─── ゴール別リード項目エディタ（共通） ───────────────────

type LeadField = { key: string; label: string; required: boolean };

function GoalLeadFieldsEditor({
  fields,
  onChange,
  accent = 'indigo',
}: {
  fields: LeadField[];
  onChange: (v: LeadField[]) => void;
  accent?: 'indigo' | 'fuchsia';
}) {
  const accentCls = accent === 'fuchsia' ? 'text-fuchsia-600 hover:text-fuchsia-700' : 'text-indigo-600 hover:text-indigo-700';
  const updateRow = (idx: number, patch: Partial<LeadField>) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const removeRow = (idx: number) => onChange(fields.filter((_, i) => i !== idx));
  const addRow = () => onChange([...fields, { key: '', label: '', required: false }]);
  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={i} className="flex gap-2 items-center bg-white/70 rounded p-2 border border-slate-200">
          <input
            value={f.key}
            onChange={(e) => updateRow(i, { key: e.target.value })}
            placeholder="key (例: name, email, phone, budget)"
            className="w-40 p-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            value={f.label}
            onChange={(e) => updateRow(i, { label: e.target.value })}
            placeholder="表示ラベル"
            className="flex-1 p-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 select-none shrink-0">
            <input
              type="checkbox"
              checked={f.required}
              onChange={(e) => updateRow(i, { required: e.target.checked })}
            />
            必須
          </label>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-slate-400 hover:text-red-500 shrink-0"
            aria-label="削除"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className={`text-xs font-bold ${accentCls}`}
      >
        + 項目を追加
      </button>
    </div>
  );
}

const DEFAULT_MEETING_LEAD_FIELDS: LeadField[] = [
  { key: 'name', label: 'お名前', required: true },
  { key: 'email', label: 'メールアドレス', required: true },
  { key: 'phone', label: '電話番号', required: true },
];

// ─── AI電話受付 Tab ────────────────────────────

function ReceptionTab({ config, update, did, onDidChange, onSaveDid, didSaving, didSaved }: any) {
  const r = config.reception || {};
  const set = (key: string, value: any) => update(['reception', key], value);

  return (
    <>
      <div className="mb-4 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 leading-relaxed">
        <b>AI電話受付（ベータ）</b><br />
        電話をAIが受け、よくある質問・営業時間・予約受付・伝言を自動応対します。伝言は下の「通知先」（会話設計の通知設定）に届きます。<br />
        導入は <b>クライアントの既存電話番号の「着信転送」先に、割り当てた着信番号(DID)を設定</b>する運用です。
      </div>

      <Card title="基本設定">
        <div className="mb-4">
          <ToggleSwitch checked={!!r.enabled} onChange={(v: boolean) => set('enabled', v)} label="AI電話受付を有効にする" />
        </div>
        <div className="mb-4">
          <Label>第一声（受け答えの冒頭）</Label>
          <TextArea
            value={r.greeting}
            onChange={(v: string) => set('greeting', v)}
            placeholder="お電話ありがとうございます。{shopName}でございます。ご用件をお伺いします。"
            rows={2}
          />
          <p className="text-[11px] text-slate-400 mt-1">{'{shopName}'} は基本情報の店舗名に自動置換されます。</p>
        </div>
        <div>
          <Label>対応範囲・AIへの指示</Label>
          <TextArea
            value={r.scope}
            onChange={(v: string) => set('scope', v)}
            placeholder="予約の受付、営業時間・場所・サービス内容のご案内、担当者への取り次ぎ、不在時の伝言。"
            rows={3}
          />
          <p className="text-[11px] text-slate-400 mt-1">サービス・Q&A・基本情報の内容も受付AIが参照します。</p>
        </div>
      </Card>

      <Card title="取り次ぎ（有人転送）">
        <div className="mb-4">
          <ToggleSwitch checked={!!r.transferEnabled} onChange={(v: boolean) => set('transferEnabled', v)} label="必要時にスタッフへ電話を転送する" />
        </div>
        <div>
          <Label>取り次ぎ先の電話番号</Label>
          <TextInput value={r.transferNumber} onChange={(v: string) => set('transferNumber', v)} placeholder="例: 09012345678" />
        </div>
      </Card>

      <Card title="営業時間外の対応">
        <div className="mb-4">
          <Label>動作</Label>
          <Select
            value={r.afterHoursMode || 'message'}
            onChange={(v: string) => set('afterHoursMode', v)}
            options={[
              { value: 'message', label: '伝言を受ける' },
              { value: 'transfer', label: '転送先へ回す' },
              { value: 'announce', label: '案内のみ（伝言なし）' },
            ]}
          />
          <p className="text-[11px] text-slate-400 mt-1">営業時間は「基本情報 / NG・ルール」の設定を参照します。</p>
        </div>
        <div>
          <Label>営業時間外の冒頭メッセージ</Label>
          <TextArea
            value={r.afterHoursMessage}
            onChange={(v: string) => set('afterHoursMessage', v)}
            placeholder="本日の営業は終了いたしました。ご用件を承りますので、発信音のあとにお話しください。"
            rows={2}
          />
        </div>
      </Card>

      <Card title="着信番号（DID）の割り当て">
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          ① Twilio で取得した着信番号（DID）を入力して保存<br />
          ② クライアントの既存電話番号の「着信転送」先に、この番号を設定してもらう<br />
          <span className="text-amber-600">※ 転送元→この番号への転送通話料はクライアント側の回線に発生します。</span>
        </p>
        <Label>着信番号 / DID（E.164推奨）</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TextInput value={did} onChange={onDidChange} placeholder="例: +815012345678" />
          </div>
          <button
            onClick={onSaveDid}
            disabled={didSaving}
            className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {didSaved ? <Check className="w-3.5 h-3.5" /> : null}
            {didSaving ? '保存中...' : didSaved ? '保存済み' : '番号を保存'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">設定変更は上部の「保存」も押してください（DIDの割り当てはこのボタンで即時保存されます）。</p>
      </Card>
    </>
  );
}

// ─── Rules Tab (NG・運用ルール) ────────────────────────────

function RulesTab({ config, update }: any) {
  const ng = config.ngRules || {};
  const toArray = (v: any): string[] => Array.isArray(v) ? v : [];
  const arrayUpdate = (key: string, list: string[]) => {
    update(['ngRules', key], list.filter((x) => x != null));
  };

  const TagListEditor = ({ list, onChange, placeholder }: { list: string[]; onChange: (v: string[]) => void; placeholder: string }) => {
    const [draft, setDraft] = useState('');
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {list.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onChange(list.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-red-500"
                aria-label="削除"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                e.preventDefault();
                onChange([...list, draft.trim()]);
                setDraft('');
              }
            }}
            placeholder={placeholder}
            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => {
              if (draft.trim()) {
                onChange([...list, draft.trim()]);
                setDraft('');
              }
            }}
            className="px-3 py-2 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600"
          >
            追加
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card title="🚫 言ってはいけないこと">
        <p className="text-xs text-slate-500 mb-4">
          AI が絶対に話題にしない／出力しない内容を設定します。
        </p>
        <div className="space-y-5">
          <div>
            <Label>禁止トピック（話題レベルで避ける）</Label>
            <p className="text-[10px] text-slate-400 mb-2">例: 政治、宗教、芸能ゴシップ、他社の悪口など</p>
            <TagListEditor
              list={toArray(ng.forbiddenTopics)}
              onChange={(v) => arrayUpdate('forbiddenTopics', v)}
              placeholder="禁止トピックを入力して Enter"
            />
          </div>
          <div>
            <Label>禁止ワード（reply に絶対含めない単語）</Label>
            <p className="text-[10px] text-slate-400 mb-2">例: 絶対、確実、必ず、保証、競合他社名など</p>
            <TagListEditor
              list={toArray(ng.forbiddenWords)}
              onChange={(v) => arrayUpdate('forbiddenWords', v)}
              placeholder="禁止ワードを入力して Enter"
            />
          </div>
          <div>
            <Label>使用を避ける表現</Label>
            <p className="text-[10px] text-slate-400 mb-2">禁止ほど強くないが、極力使わせたくない言い回し</p>
            <TagListEditor
              list={toArray(ng.avoidPhrases)}
              onChange={(v) => arrayUpdate('avoidPhrases', v)}
              placeholder="避けたい表現を入力して Enter"
            />
          </div>
        </div>
      </Card>

      <Card title="✅ 必ず伝えたいこと">
        <p className="text-xs text-slate-500 mb-4">
          会話の中で AI が自然に盛り込む内容を設定します（例: キャンペーン告知、初回相談無料、返金保証など）。
        </p>
        <Label>必ず伝えるフレーズ</Label>
        <TagListEditor
          list={toArray(ng.mustSayPhrases)}
          onChange={(v) => arrayUpdate('mustSayPhrases', v)}
          placeholder="例: 初回相談は無料です"
        />
      </Card>

      <Card title="💬 対応ポリシー">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>競合サービスへの対応</Label>
            <Select
              value={ng.competitorPolicy || 'no_comment'}
              onChange={(v: string) => update(['ngRules', 'competitorPolicy'], v)}
              options={[
                { value: 'no_comment', label: 'コメントしない（聞かれても返答拒否）' },
                { value: 'neutral', label: '中立的に対応（批判せず話題は広げない）' },
                { value: 'redirect', label: '自社サービスのメリットに話題を戻す' },
              ]}
            />
          </div>
          <div>
            <Label>料金提示ルール</Label>
            <Select
              value={ng.priceDisclosure || 'as_listed'}
              onChange={(v: string) => update(['ngRules', 'priceDisclosure'], v)}
              options={[
                { value: 'as_listed', label: 'カタログ通り正確に伝える' },
                { value: 'estimate_only', label: '具体額は出さず見積もり案内' },
                { value: 'ask_first', label: 'ヒアリング後に回答' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card title="🕐 営業時間外対応">
        <p className="text-xs text-slate-500 mb-4">
          設定した時間外に会話が始まったら、AI の返答冒頭に指定メッセージを添えます。
          すべて空欄なら時間外対応はOFF。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>営業開始 (HH:MM)</Label>
            <TextInput
              value={ng.businessHoursStart || ''}
              onChange={(v: string) => update(['ngRules', 'businessHoursStart'], v)}
              placeholder="09:00"
            />
          </div>
          <div>
            <Label>営業終了 (HH:MM)</Label>
            <TextInput
              value={ng.businessHoursEnd || ''}
              onChange={(v: string) => update(['ngRules', 'businessHoursEnd'], v)}
              placeholder="18:00"
            />
          </div>
        </div>
        <Label>営業時間外メッセージ</Label>
        <TextArea
          value={ng.outOfHoursMessage || ''}
          onChange={(v: string) => update(['ngRules', 'outOfHoursMessage'], v)}
          placeholder="ただいま営業時間外のため、お返事は翌営業日以降になります。"
        />
      </Card>

      <Card title="⚙️ その他のルール">
        <div className="space-y-5">
          <div>
            <Label>1ターンの最大文字数（0 = 制限なし）</Label>
            <TextInput
              value={String(ng.maxReplyLength ?? 0)}
              onChange={(v: string) => update(['ngRules', 'maxReplyLength'], Number(v) || 0)}
              placeholder="0"
            />
            <p className="text-[10px] text-slate-400 mt-1">長文を避けたい場合は 150〜250 文字程度が目安</p>
          </div>
          <div>
            <Label>困った時のフォールバック先</Label>
            <Select
              value={ng.fallbackAction || 'inquiry'}
              onChange={(v: string) => update(['ngRules', 'fallbackAction'], v)}
              options={[
                { value: 'inquiry', label: '問い合わせフォームへ誘導' },
                { value: 'phone', label: '電話へ誘導' },
                { value: 'email', label: 'メールへ誘導' },
              ]}
            />
          </div>
          <div>
            <Label>自由記述の追加ルール（AIへ直接指示）</Label>
            <TextArea
              value={ng.customRules || ''}
              onChange={(v: string) => update(['ngRules', 'customRules'], v)}
              placeholder="例: 医療行為に関する断定的な発言は禁止。詳しい診断は医師にご相談と必ず添える。"
            />
            <p className="text-[10px] text-slate-400 mt-1">AIプロンプトに直接追加されます。業種固有のコンプラ要件などをここに書いてください。</p>
          </div>
        </div>
      </Card>
    </>
  );
}

// ─── Appearance Tab ────────────────────────────────────

function AppearanceTab({ config, update, embedCode, onCopy, copied, paletteId }: any) {
  const a = config.appearance || {};

  const applyTemplate = (t: WidgetTemplate) => {
    update(['appearance', 'templateId'], t.id);
    update(['appearance', 'primaryColor'], t.primaryColor);
    update(['appearance', 'gradientTo'], t.gradientTo || '');
    update(['appearance', 'bubbleShape'], t.bubbleShape);
    update(['appearance', 'iconStyle'], t.iconStyle);
    update(['appearance', 'gradient'], t.gradient);
  };

  return (
    <>
      <Card title="テンプレートを選ぶ">
        <p className="text-xs text-slate-500 mb-4">テンプレートを選ぶと、色・形・アイコンが一括で反映されます。あとから個別調整も可能です。</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {WIDGET_TEMPLATES.map((t) => {
            const isActive = (a.templateId || 'indigo') === t.id;
            const bg = getBubbleGradient(t);
            const radius = getBubbleRadius(t.bubbleShape);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className={`relative rounded-2xl border-2 p-4 transition-all text-left ${
                  isActive ? 'border-indigo-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-12 h-12 flex items-center justify-center text-white shadow-lg"
                    style={{ background: bg, borderRadius: radius }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d={ICON_SVG_PATHS[t.iconStyle]} />
                    </svg>
                  </div>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-600">選択中</span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-800">{t.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{t.description}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="個別カスタマイズ">
        <BubblePreview appearance={a} />
        </Card>
        <Card title="設定項目">
        {/* 旧ライブプレビューは上部の BubblePreview に統合済み */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Bot名（チャット画面ヘッダー）</Label><TextInput value={a.botName} onChange={(v: string) => update(['appearance', 'botName'], v)} placeholder="AIアシスタント" /></div>
          <div />
          <div><Label>プライマリカラー</Label><ColorPicker value={a.primaryColor} onChange={(v: string) => update(['appearance', 'primaryColor'], v)} /></div>
          <div><Label>グラデーション終点色（任意）</Label><ColorPicker value={a.gradientTo} onChange={(v: string) => update(['appearance', 'gradientTo'], v)} /></div>
          <div>
            <Label>グラデーションON/OFF</Label>
            <Select value={a.gradient ? 'true' : 'false'} onChange={(v: string) => update(['appearance', 'gradient'], v === 'true')} options={[
              { value: 'true', label: 'グラデーション使用' },
              { value: 'false', label: '単色' },
            ]} />
          </div>
          <div>
            <Label>バブル形状</Label>
            <Select value={a.bubbleShape} onChange={(v: string) => update(['appearance', 'bubbleShape'], v)} options={[
              { value: 'circle', label: '丸（円形）' },
              { value: 'rounded', label: '角丸' },
              { value: 'square', label: '正方形' },
            ]} />
          </div>
          <div>
            <Label>アイコンスタイル</Label>
            <Select value={a.iconStyle} onChange={(v: string) => update(['appearance', 'iconStyle'], v)} options={[
              { value: 'chat', label: '💬 吹き出し' },
              { value: 'ai', label: '🤖 AI' },
              { value: 'sparkle', label: '✨ キラキラ' },
              { value: 'heart', label: '❤️ ハート' },
              { value: 'robot', label: '👾 ロボット' },
            ]} />
          </div>
          <div>
            <Label>表示位置（左右）</Label>
            <Select value={a.bubblePosition} onChange={(v: string) => update(['appearance', 'bubblePosition'], v)} options={[
              { value: 'right', label: '右下' },
              { value: 'left', label: '左下' },
            ]} />
          </div>
          <div className="md:col-span-2">
            <Label>バブルの位置を微調整（px）</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[10px] font-bold text-slate-500">{a.bubblePosition === 'left' ? '左' : '右'}からの距離</span>
                  <span className="text-sm font-black text-indigo-600">{Number(a.bubbleOffsetX ?? 24)}<span className="text-[10px] text-slate-400 ml-0.5">px</span></span>
                </div>
                <input
                  type="range" min={0} max={120} step={4}
                  value={Number(a.bubbleOffsetX ?? 24)}
                  onChange={(e) => update(['appearance', 'bubbleOffsetX'], Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[10px] font-bold text-slate-500">下からの距離</span>
                  <span className="text-sm font-black text-indigo-600">{Number(a.bubbleOffsetY ?? 24)}<span className="text-[10px] text-slate-400 ml-0.5">px</span></span>
                </div>
                <input
                  type="range" min={0} max={240} step={4}
                  value={Number(a.bubbleOffsetY ?? 24)}
                  onChange={(e) => update(['appearance', 'bubbleOffsetY'], Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">既定は左右・下とも 24px。サイト固有のボタンと重なる場合に調整してください（スマホは全画面表示のため影響しません）。</p>
          </div>
          <div>
            <Label>表示タイミング</Label>
            <Select value={String(a.welcomeDelay || 0)} onChange={(v: string) => update(['appearance', 'welcomeDelay'], Number(v))} options={[
              { value: '0', label: '即座' },
              { value: '10', label: '10秒後' },
              { value: '30', label: '30秒後' },
            ]} />
          </div>
          <div>
            <Label>初回アクセス時の挙動</Label>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(a.autoOpen)}
                  onChange={(e) => update(['appearance', 'autoOpen'], e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-700">
                    💬 ページを開いたら自動でチャットを開く
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    OFF (既定): バブルだけ表示、訪問者がクリックで開く<br />
                    ON: 「表示タイミング」経過後に自動でパネルを開く
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div>
            <Label>バブルサイズ</Label>
            <Select value={a.bubbleSize || 'medium'} onChange={(v: string) => update(['appearance', 'bubbleSize'], v)} options={[
              { value: 'small', label: '小（48px）' },
              { value: 'medium', label: '中（60px）' },
              { value: 'large', label: '大（72px）' },
            ]} />
          </div>
          <div>
            <Label>バブルのアニメーション</Label>
            <Select value={a.bubbleAnimation || 'none'} onChange={(v: string) => update(['appearance', 'bubbleAnimation'], v)} options={[
              { value: 'none', label: 'なし' },
              { value: 'pulse', label: 'パルス（拡大縮小）' },
              { value: 'wobble', label: 'ゆらゆら' },
              { value: 'bounce', label: 'バウンド' },
              { value: 'shimmer', label: 'きらめき（光る）' },
            ]} />
          </div>
          <div>
            <Label>表示するページ</Label>
            <Select value={a.showPages || 'all'} onChange={(v: string) => update(['appearance', 'showPages'], v)} options={[
              { value: 'all', label: '全ページ' },
              { value: 'top', label: 'TOPページのみ' },
            ]} />
          </div>
          <div>
            <Label>吹き出しの文言（空で非表示）</Label>
            <TextInput value={a.bubbleTooltipText || ''} onChange={(v: string) => update(['appearance', 'bubbleTooltipText'], v)} placeholder="AIに相談する" />
          </div>
          <div>
            <Label>吹き出しのスタイル</Label>
            <Select value={a.bubbleTooltipStyle || 'speech'} onChange={(v: string) => update(['appearance', 'bubbleTooltipStyle'], v)} options={[
              { value: 'speech', label: '💬 スピーチ（尻尾付き）' },
              { value: 'pill', label: '💊 ピル（角丸）' },
              { value: 'card', label: '📄 カード（影付き）' },
              { value: 'neon', label: '💡 ネオン（光る縁）' },
              { value: 'minimal', label: '━ ミニマル（線のみ）' },
            ]} />
          </div>
        </div>
      </Card>

      <Card title="埋め込みコード">
        <p className="text-xs text-slate-500 mb-3">顧客のHPの &lt;/body&gt; 直前に貼り付けてください。</p>
        <div className="relative">
          <pre className="bg-slate-900 text-emerald-300 p-4 rounded-lg text-xs overflow-x-auto"><code>{embedCode}</code></pre>
          <button
            onClick={onCopy}
            className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-white/20"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'コピー済' : 'コピー'}
          </button>
        </div>
      </Card>
    </>
  );
}

// ────────────────────────────────────────────────
// BubblePreview — 外観タブ上部のライブプレビュー
// widget.js 側のCSSと一致する見た目でバブル・吹き出し・アニメーションを再現
// ────────────────────────────────────────────────
function BubblePreview({ appearance: a }: { appearance: any }) {
  const color = a.primaryColor || '#6366f1';
  const gradientTo = a.gradientTo || '';
  const bg = a.gradient && gradientTo
    ? `linear-gradient(135deg, ${color} 0%, ${gradientTo} 100%)`
    : color;
  const sizePx = a.bubbleSize === 'small' ? 48 : a.bubbleSize === 'large' ? 72 : 60;
  const radius = a.bubbleShape === 'square' ? '12px' : a.bubbleShape === 'rounded' ? '20px' : '50%';
  const iconPath = ICON_SVG_PATHS[(a.iconStyle || 'chat') as keyof typeof ICON_SVG_PATHS];
  const animation = a.bubbleAnimation || 'none';
  const position = a.bubblePosition === 'left' ? 'left' : 'right';
  const tooltipText = typeof a.bubbleTooltipText === 'string' ? a.bubbleTooltipText : 'AIに相談する';
  const tooltipStyle = a.bubbleTooltipStyle || 'speech';
  const showPagesLabel = a.showPages === 'top' ? 'TOPページのみ' : '全ページ';

  const tooltipBase: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    color: '#1e293b',
    background: '#fff',
    whiteSpace: 'nowrap',
    position: 'relative',
  };
  const tooltipStyles: Record<string, React.CSSProperties> = {
    speech: { borderRadius: 18, boxShadow: '0 10px 26px rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.06)' },
    pill: { borderRadius: 999, boxShadow: '0 6px 18px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)' },
    card: { borderRadius: 12, padding: '12px 18px', boxShadow: '0 18px 40px rgba(0,0,0,0.18), 0 6px 14px rgba(0,0,0,0.08)' },
    neon: {
      borderRadius: 999,
      background: '#fff',
      color,
      boxShadow: `0 0 0 2px ${color}, 0 0 18px 2px ${color}, 0 0 32px ${color}55`,
    },
    minimal: {
      background: 'transparent',
      borderBottom: `2px solid ${color}`,
      borderRadius: 0,
      padding: '6px 4px',
      color,
      fontWeight: 800,
      boxShadow: 'none',
    },
  };

  return (
    <div className="mb-5 p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 overflow-hidden">
      <style>{`
        @keyframes pvPulse {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.07) translateY(-1px); box-shadow: 0 16px 40px rgba(99,102,241,0.55), 0 4px 10px rgba(0,0,0,0.1); }
        }
        @keyframes pvWobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          75% { transform: rotate(6deg); }
        }
        @keyframes pvBounce {
          0%, 30%, 60%, 100% { transform: translateY(0); }
          45% { transform: translateY(-12px); }
          70% { transform: translateY(-5px); }
        }
        @keyframes pvShimmer {
          0%, 100% { box-shadow: 0 10px 30px rgba(99,102,241,0.35), 0 0 0 rgba(99,102,241,0); }
          50% { box-shadow: 0 14px 36px rgba(99,102,241,0.5), 0 0 26px rgba(99,102,241,0.65); }
        }
        .pv-anim-pulse { animation: pvPulse 2.2s ease-in-out infinite; }
        .pv-anim-wobble { animation: pvWobble 3s ease-in-out infinite; }
        .pv-anim-bounce { animation: pvBounce 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite; }
        .pv-anim-shimmer { animation: pvShimmer 2.8s ease-in-out infinite; }
        .pv-tooltip-arrow-right::after {
          content: ''; position: absolute; top: 50%; right: -8px;
          width: 0; height: 0; border-style: solid;
          border-width: 7px 0 7px 10px; border-color: transparent transparent transparent #fff;
          transform: translateY(-50%);
        }
        .pv-tooltip-arrow-left::after {
          content: ''; position: absolute; top: 50%; left: -8px;
          width: 0; height: 0; border-style: solid;
          border-width: 7px 10px 7px 0; border-color: transparent #fff transparent transparent;
          transform: translateY(-50%);
        }
      `}</style>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold text-slate-700">ライブプレビュー</div>
          <div className="text-[10px] text-slate-500 mt-0.5">設定変更が即時反映されます</div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
          <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">位置: {position === 'right' ? '右下' : '左下'}</span>
          <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">サイズ: {sizePx}px</span>
          <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">表示: {showPagesLabel}</span>
        </div>
      </div>

      {/* バブル＋吹き出しの配置エリア */}
      <div
        className="relative rounded-lg bg-white border border-slate-200 flex items-center"
        style={{
          minHeight: 140,
          padding: '24px',
          flexDirection: position === 'right' ? 'row' : 'row-reverse',
          justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
          gap: 14,
        }}
      >
        {/* tooltip */}
        {tooltipText && (
          <div
            className={
              tooltipStyle === 'speech'
                ? (position === 'right' ? 'pv-tooltip-arrow-right' : 'pv-tooltip-arrow-left')
                : ''
            }
            style={{ ...tooltipBase, ...tooltipStyles[tooltipStyle] }}
          >
            {tooltipText}
          </div>
        )}
        {/* bubble */}
        <div
          className={animation && animation !== 'none' ? `pv-anim-${animation}` : ''}
          style={{
            width: sizePx,
            height: sizePx,
            borderRadius: radius,
            background: bg,
            color: '#fff',
            boxShadow: '0 10px 30px rgba(99,102,241,0.35), 0 2px 6px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: sizePx * 0.43, height: sizePx * 0.43 }}>
            <path d={iconPath} />
          </svg>
        </div>
      </div>

      {/* 補足情報 */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <span>Bot名: <b className="text-slate-700">{a.botName || 'AIアシスタント'}</b></span>
        <span>アニメ: <b className="text-slate-700">{animation === 'none' ? 'なし' : animation}</b> / 吹き出し: <b className="text-slate-700">{tooltipStyle}</b></span>
      </div>
    </div>
  );
}

// ─── Flow Tab (ヒアリングフロー) ────────────────────────────

type FlowStepType = 'ask' | 'show_cards' | 'proposal_meeting' | 'show_closing';

type FlowStep = {
  id: string;
  type: FlowStepType;
  prompt?: string;
  branches?: Array<{
    condition: {
      type: 'keyword' | 'sentiment' | 'default';
      value?: string[];
      sentiment?: 'positive' | 'negative' | 'neutral';
    };
    goToStepId: string;
  }>;
  skipIf?: {
    type: 'already_answered';
    matchKeys?: string[];
  };
  position?: { x: number; y: number };
};

const FLOW_STEP_META: Record<FlowStepType, { emoji: string; label: string; tone: string; hint: string }> = {
  ask: { emoji: '💬', label: '質問する', tone: 'bg-indigo-50 border-indigo-200', hint: 'AIが訪問者に質問します（プロンプトの趣旨を汲んで自然に言い換え）' },
  show_cards: { emoji: '🎴', label: 'サービスカードを提示', tone: 'bg-purple-50 border-purple-200', hint: '登録済みサービスから候補を提示（introduction 遷移）' },
  proposal_meeting: { emoji: '🎯', label: '商談誘導', tone: 'bg-fuchsia-50 border-fuchsia-200', hint: '会話設計 ③-2 の商談ゴール誘導を発動' },
  show_closing: { emoji: '✅', label: 'クロージング', tone: 'bg-emerald-50 border-emerald-200', hint: 'closing ステージに遷移し、買う気度に応じた CTA を出す' },
};

function SkipIfEditor({ step, onChange }: { step: FlowStep; onChange: (patch: Partial<FlowStep>) => void }) {
  const enabled = Boolean(step.skipIf);
  const keys = Array.isArray(step.skipIf?.matchKeys) ? step.skipIf!.matchKeys! : [];

  const toggle = (on: boolean) => {
    if (on) {
      onChange({ skipIf: { type: 'already_answered', matchKeys: [] } });
    } else {
      onChange({ skipIf: undefined });
    }
  };

  return (
    <div className="pt-2 border-t border-slate-200/60">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
          className="w-3.5 h-3.5"
        />
        <span className="text-[11px] font-bold text-slate-600">
          🔎 すでに回答済みならスキップ
        </span>
      </label>
      {enabled && (
        <div className="mt-2 pl-6">
          <div className="text-[10px] text-slate-500 mb-1">
            訪問者が過去の発言で以下のキーワードに触れていれば、このステップを飛ばします。
            <br />
            <span className="text-indigo-600">✨ 言い換え（例:「いらない」⇄「必要ない」「結構です」）も AI が意味判定します。</span>
          </div>
          <TagInput
            tags={keys}
            onChange={(next) => onChange({ skipIf: { type: 'already_answered', matchKeys: next } })}
            placeholder="例: いらない／考えてない（Enterで追加）"
          />
        </div>
      )}
    </div>
  );
}

function BranchesEditor({
  step,
  allSteps,
  onChange,
}: {
  step: FlowStep;
  allSteps: FlowStep[];
  onChange: (patch: Partial<FlowStep>) => void;
}) {
  const branches = Array.isArray(step.branches) ? step.branches : [];
  const otherSteps = allSteps.filter((s) => s.id !== step.id);

  const setBranches = (next: NonNullable<FlowStep['branches']>) => {
    onChange({ branches: next.length ? next : undefined });
  };
  const addBranch = () => {
    const firstTargetId = otherSteps[0]?.id || '';
    setBranches([
      ...branches,
      { condition: { type: 'keyword', value: [] }, goToStepId: firstTargetId },
    ]);
  };
  const removeBranch = (i: number) => {
    setBranches(branches.filter((_, j) => j !== i));
  };
  const updateBranch = (i: number, patch: Partial<NonNullable<FlowStep['branches']>[number]>) => {
    setBranches(branches.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  };

  const stepLabel = (id: string) => {
    const found = allSteps.findIndex((s) => s.id === id);
    if (found < 0) return '（削除されたステップ）';
    const s = allSteps[found];
    const meta = FLOW_STEP_META[s.type];
    return `${found + 1}. ${meta.emoji} ${meta.label}`;
  };

  return (
    <div className="pt-2 border-t border-slate-200/60">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-600">🔀 分岐条件（回答で次のステップを変える）</span>
        <button
          type="button"
          onClick={addBranch}
          disabled={otherSteps.length === 0}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-30 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />分岐を追加
        </button>
      </div>
      {branches.length === 0 && (
        <p className="text-[10px] text-slate-400 pl-1">未設定のときは順次次のステップへ進みます</p>
      )}
      <div className="space-y-2">
        {branches.map((br, i) => {
          const cType = br.condition.type;
          return (
            <div key={i} className="p-2 rounded-lg bg-white/60 border border-slate-200 space-y-2">
              <div className="flex gap-2 items-center flex-wrap">
                <select
                  value={cType}
                  onChange={(e) => {
                    const t = e.target.value as 'keyword' | 'default';
                    updateBranch(i, {
                      condition: t === 'default' ? { type: 'default' } : { type: 'keyword', value: br.condition.value || [] },
                    });
                  }}
                  className="px-2 py-1 rounded border border-slate-200 bg-white text-xs outline-none focus:border-indigo-300"
                >
                  <option value="keyword">キーワード一致</option>
                  <option value="default">その他すべて（デフォルト）</option>
                </select>
                <span className="text-[10px] text-slate-500">→</span>
                <select
                  value={br.goToStepId}
                  onChange={(e) => updateBranch(i, { goToStepId: e.target.value })}
                  className="flex-1 min-w-0 px-2 py-1 rounded border border-slate-200 bg-white text-xs outline-none focus:border-indigo-300"
                >
                  {!otherSteps.some((s) => s.id === br.goToStepId) && (
                    <option value={br.goToStepId}>{stepLabel(br.goToStepId)}</option>
                  )}
                  {otherSteps.map((s) => {
                    const found = allSteps.findIndex((x) => x.id === s.id);
                    const meta = FLOW_STEP_META[s.type];
                    return (
                      <option key={s.id} value={s.id}>
                        {found + 1}. {meta.emoji} {meta.label}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={() => removeBranch(i)}
                  className="text-slate-400 hover:text-red-500 shrink-0"
                  aria-label="分岐を削除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {cType === 'keyword' && (
                <TagInput
                  tags={br.condition.value || []}
                  onChange={(next) => updateBranch(i, { condition: { type: 'keyword', value: next } })}
                  placeholder="例: はい／うん／Yes（Enterで追加）"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const newFlowStep = (type: FlowStepType): FlowStep => {
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const base: FlowStep = { id, type };
  if (type === 'ask') base.prompt = '';
  return base;
};

function FlowTab({ config, update }: { config: any; update: (path: string[], value: any) => void; paletteId: string }) {
  const flow = config.conversation?.hearingFlow || { mode: 'auto', steps: [] };
  const mode: 'auto' | 'manual' = flow.mode === 'manual' ? 'manual' : 'auto';
  const steps: FlowStep[] = Array.isArray(flow.steps) ? flow.steps : [];
  const welcomeMessage: string = config.conversation?.welcomeMessage || '';
  const welcomeAsks: boolean = flow.welcomeAsksFirstQuestion === true;
  const welcomeBranches: NonNullable<FlowStep['branches']> = Array.isArray(flow.welcomeBranches) ? flow.welcomeBranches : [];
  const [view, setView] = useState<'list' | 'flowchart'>('list');

  // setMode / setSteps / setWelcome* で hearingFlow オブジェクト全体を上書きする際、
  // 他のキーが消えないよう必ず flow を spread する
  const setMode = (m: 'auto' | 'manual') => {
    update(['conversation', 'hearingFlow'], { ...flow, mode: m, steps });
  };
  const setSteps = (next: FlowStep[]) => {
    update(['conversation', 'hearingFlow'], { ...flow, mode, steps: next });
  };
  const setWelcomeAsks = (v: boolean) => {
    update(['conversation', 'hearingFlow'], { ...flow, mode, steps, welcomeAsksFirstQuestion: v });
  };
  const setWelcomeBranches = (next: FlowStep['branches']) => {
    update(['conversation', 'hearingFlow'], { ...flow, mode, steps, welcomeBranches: next });
  };

  const updateStep = (idx: number, patch: Partial<FlowStep>) => {
    const next = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    setSteps(next);
  };
  const removeStep = (idx: number) => {
    if (!confirm('このステップを削除しますか？')) return;
    setSteps(steps.filter((_, i) => i !== idx));
  };
  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSteps(next);
  };
  const addStep = (type: FlowStepType) => {
    setSteps([...steps, newFlowStep(type)]);
  };

  return (
    <>
      <Card title="🧭 ヒアリングフロー">
        <p className="text-xs text-slate-500 mb-4">
          ヒアリングの流れを「AIお任せ」にするか、「自分で決める」（ステップを順に指定）を選べます。
          自分で決める場合、AIはプロンプトの趣旨を汲んで訪問者の文脈に合わせて自然に言い換えます。
        </p>
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
              mode === 'auto'
                ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            🤖 AIお任せ
            <div className={`text-[10px] font-normal mt-0.5 ${mode === 'auto' ? 'text-indigo-100' : 'text-slate-400'}`}>
              最小/最大ヒアリング回数に従う（会話設計タブの設定）
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
              mode === 'manual'
                ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            🗺️ 自分で決める
            <div className={`text-[10px] font-normal mt-0.5 ${mode === 'manual' ? 'text-indigo-100' : 'text-slate-400'}`}>
              ステップを並べて会話の流れを設計
            </div>
          </button>
        </div>
      </Card>

      {mode === 'manual' && (
        <Card title="👀 全体プレビュー">
          <p className="text-xs text-slate-500 mb-3">
            訪問者が見る順序です。<b>ウェルカム</b> は会話設計タブで編集できます。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 max-w-xs">
              <div className="text-[10px] font-bold text-amber-700 mb-0.5">👋 ウェルカム</div>
              <div className="text-[11px] text-slate-700 line-clamp-2">
                {welcomeMessage || <span className="text-slate-400 italic">未設定</span>}
              </div>
            </div>
            {steps.length === 0 ? (
              <div className="px-3 py-2 rounded-xl border-2 border-dashed border-slate-200 text-[11px] text-slate-400">
                ↓ ヒアリングステップを下で追加してください
              </div>
            ) : (
              steps.map((s, i) => {
                const meta = FLOW_STEP_META[s.type];
                return (
                  <React.Fragment key={s.id}>
                    <span className="text-slate-300 text-lg">→</span>
                    <div className={`px-3 py-2 rounded-xl border ${meta.tone}`}>
                      <div className="text-[10px] font-bold text-slate-600">
                        {i + 1}. {meta.emoji} {meta.label}
                      </div>
                      {s.type === 'ask' && s.prompt && (
                        <div className="text-[10px] text-slate-600 mt-0.5 max-w-[180px] line-clamp-1">
                          {s.prompt}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </Card>
      )}

      {mode === 'manual' && (
        <Card title="👋 ステップ 0: ウェルカム">
          <p className="text-xs text-slate-500 mb-3">
            訪問者が最初に見るメッセージ。「会話設計」タブの内容と同期しています。
            ウェルカム自体に質問を含める場合は下のトグルを ON にしてください。
          </p>
          <div className="space-y-3">
            <div>
              <Label>ウェルカムメッセージ</Label>
              <TextArea
                value={welcomeMessage}
                onChange={(v: string) => update(['conversation', 'welcomeMessage'], v)}
                placeholder="こんにちは！何かお困りですか？"
                rows={2}
              />
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={welcomeAsks}
                  onChange={(e) => setWelcomeAsks(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-700">
                    ✨ ウェルカムに最初の質問を含めている
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    ON: 訪問者の最初の発言は <b>ウェルカムへの回答</b> として消費し、AI はステップ 1 から開始します。
                  </div>
                </div>
              </label>
            </div>
            {(welcomeAsks || welcomeBranches.length > 0) && (
              steps.length === 0 ? (
                <p className="text-[11px] text-slate-400 pl-1">
                  💡 分岐を設定するには、下にステップを追加してください
                </p>
              ) : (
                <BranchesEditor
                  step={{ id: '__welcome__', type: 'ask' as FlowStepType, branches: welcomeBranches }}
                  allSteps={steps}
                  onChange={(patch) => setWelcomeBranches(patch.branches)}
                />
              )
            )}
          </div>
        </Card>
      )}

      {mode === 'manual' && (
        <Card title="表示モード">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                view === 'list'
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              📋 リスト
            </button>
            <button
              type="button"
              onClick={() => setView('flowchart')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                view === 'flowchart'
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              🗺️ フローチャート
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            フローチャート: ノードをドラッグで位置変更、分岐は色付き矢印で可視化
          </p>
        </Card>
      )}

      {mode === 'manual' && view === 'flowchart' && (
        <Card title="🗺️ フローチャート">
          {steps.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              ステップがまだありません。リストモードに戻って追加してください。
            </div>
          ) : (
            <HearingFlowChart
              steps={steps}
              onStepsChange={(next) => setSteps(next)}
            />
          )}
          <p className="text-[10px] text-slate-400 mt-3">
            💡 ノードをドラッグして配置を保存できます。内容の編集はリストモードで行ってください。
          </p>
        </Card>
      )}

      {mode === 'manual' && view === 'list' && (
        <Card title="ステップ一覧">
          {steps.length === 0 && (
            <div className="text-center py-10 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              ステップがまだありません。下のボタンから追加してください。
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const meta = FLOW_STEP_META[step.type];
              return (
                <div key={step.id} className={`rounded-xl border p-4 ${meta.tone}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-black text-slate-600 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">{meta.emoji}</span>
                        <select
                          value={step.type}
                          onChange={(e) => {
                            const nextType = e.target.value as FlowStepType;
                            const patch: Partial<FlowStep> = { type: nextType };
                            if (nextType !== 'ask') patch.prompt = undefined;
                            if (nextType === 'ask' && !step.prompt) patch.prompt = '';
                            updateStep(idx, patch);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold outline-none focus:border-indigo-300"
                        >
                          {(Object.keys(FLOW_STEP_META) as FlowStepType[]).map((t) => (
                            <option key={t} value={t}>{FLOW_STEP_META[t].emoji} {FLOW_STEP_META[t].label}</option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-500 flex-1 min-w-0">{meta.hint}</span>
                      </div>

                      {step.type === 'ask' && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 mb-1">質問のプロンプト（趣旨）</div>
                          <TextArea
                            value={step.prompt || ''}
                            onChange={(v: string) => updateStep(idx, { prompt: v })}
                            placeholder="例: 現在どんな集客でお困りか聞きたい"
                            rows={2}
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            💡 AIはこの趣旨を汲んで、訪問者の文脈に合わせて自然に言い換えます
                          </p>
                        </div>
                      )}

                      {/* Phase 2-A: 条件スキップ */}
                      <SkipIfEditor
                        step={step}
                        onChange={(patch) => updateStep(idx, patch)}
                      />

                      {/* Phase 2-B: 分岐条件 (ask のみ) */}
                      {step.type === 'ask' && (
                        <BranchesEditor
                          step={step}
                          allSteps={steps}
                          onChange={(patch) => updateStep(idx, patch)}
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveStep(idx, -1)}
                        disabled={idx === 0}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center"
                        aria-label="上に移動"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(idx, 1)}
                        disabled={idx === steps.length - 1}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center"
                        aria-label="下に移動"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="w-7 h-7 rounded-lg border border-red-200 bg-white hover:bg-red-50 flex items-center justify-center"
                        aria-label="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(FLOW_STEP_META) as FlowStepType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addStep(t)}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3" />
                {FLOW_STEP_META[t].emoji} {FLOW_STEP_META[t].label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {mode === 'manual' && (
        <Card title="💡 ガイド">
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex gap-2">
              <span className="shrink-0">✨</span>
              <span>AIは各ステップのプロンプトの<b>趣旨を汲んで</b>、訪問者の文脈に合わせて自然に言い換えて話します（機械的なコピペにはなりません）。</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">🚀</span>
              <span>途中で訪問者が「予約したい」「買います」等の<b>明確な購入意思</b> を示したら、残りのステップを飛ばして即クロージングに遷移します（買う気度 4 以上が条件）。</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">🔄</span>
              <span>ステップ末尾まで到達したら、自動で「AIお任せ」モードの挙動に戻ります。</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">📋</span>
              <span>「会話設計」タブの <b>最小/最大ヒアリング回数</b> は、自分で決めるモードでは無視されます。</span>
            </li>
          </ul>
        </Card>
      )}
    </>
  );
}

// ────────────────────────────────────────────────
// Default export: admin ルーティング用のラッパー
// /main/bot-settings 側は BotSettingsEditor を直接使う
// ────────────────────────────────────────────────
export default function BotSettingsEditPage({ params }: { params: Promise<{ paletteId: string }> }) {
  const { paletteId } = usePromise(params);
  return (
    <BotSettingsEditor
      paletteId={paletteId}
      backHref="/admin/bot-settings"
      sessionsHref={`/admin/bot-settings/${paletteId}/sessions`}
    />
  );
}
