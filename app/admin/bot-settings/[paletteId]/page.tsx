'use client';

import React, { useEffect, useState, useCallback, use as usePromise } from 'react';
import Link from 'next/link';
import {
  Bot, ArrowLeft, Save, Copy, Check, Plus, Trash2, MessageSquare, Code,
  Sparkles, Settings2, HelpCircle, Palette, Heart, Package, PlayCircle, X,
} from 'lucide-react';
import { WIDGET_TEMPLATES, ICON_SVG_PATHS, getBubbleRadius, getBubbleGradient, type WidgetTemplate } from '../_lib/widget-templates';

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

type TabKey = 'basic' | 'services' | 'faqs' | 'conversation' | 'nurture' | 'appearance';

export default function BotSettingsEditPage({ params }: { params: Promise<{ paletteId: string }> }) {
  const { paletteId } = usePromise(params);

  const [tab, setTab] = useState<TabKey>('basic');
  const [config, setConfig] = useState<Config | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
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

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bot-settings/${paletteId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
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
    const res = await fetch(`/api/admin/bot-settings/${paletteId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '新しいサービス', sortOrder: services.length }),
    });
    const data = await res.json();
    if (data?.success && data.service) setServices((prev) => [...prev, data.service]);
  };
  const updateService = async (id: string, patch: Partial<Service>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const saveService = async (s: Service) => {
    await fetch(`/api/admin/bot-settings/${paletteId}/services/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
  };
  const deleteServ = async (id: string) => {
    if (!confirm('このサービスを削除しますか？')) return;
    await fetch(`/api/admin/bot-settings/${paletteId}/services/${id}`, { method: 'DELETE' });
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  // FAQ CRUD
  const addFaq = async () => {
    const res = await fetch(`/api/admin/bot-settings/${paletteId}/faqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '新しい質問', answer: '回答', priority: 3 }),
    });
    const data = await res.json();
    if (data?.success && data.faq) setFaqs((prev) => [...prev, data.faq]);
  };
  const updateFaq = (id: string, patch: Partial<Faq>) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const saveFaq = async (f: Faq) => {
    await fetch(`/api/admin/bot-settings/${paletteId}/faqs/${f.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
  };
  const deleteFaq = async (id: string) => {
    if (!confirm('このFAQを削除しますか？')) return;
    await fetch(`/api/admin/bot-settings/${paletteId}/faqs/${id}`, { method: 'DELETE' });
    setFaqs((prev) => prev.filter((f) => f.id !== id));
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
    { key: 'nurture', label: '追客', icon: Heart },
    { key: 'appearance', label: '見た目・埋込', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/bot-settings" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
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
            <Link
              href={`/admin/bot-settings/${paletteId}/sessions`}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              会話ログ
            </Link>
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
          />
        )}
        {tab === 'faqs' && (
          <FaqsTab
            faqs={faqs}
            onAdd={addFaq}
            onChange={updateFaq}
            onSave={saveFaq}
            onDelete={deleteFaq}
          />
        )}
        {tab === 'conversation' && <ConversationTab config={config} update={updateConfigField} paletteId={paletteId} />}
        {tab === 'nurture' && <NurtureTab config={config} update={updateConfigField} />}
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

function ServicesTab({ services, onAdd, onChange, onSave, onDelete }: any) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-600">botが訪問者に提案するサービス・商品を登録してください。</p>
        <button onClick={onAdd} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-600">
          <Plus className="w-3.5 h-3.5" />サービス追加
        </button>
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

function FaqsTab({ faqs, onAdd, onChange, onSave, onDelete }: any) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-600">よくある質問と回答を登録してください。botが会話中に参照します。</p>
        <button onClick={onAdd} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-600">
          <Plus className="w-3.5 h-3.5" />Q&A追加
        </button>
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
            { key: 'reservation', label: '予約', emoji: '📅', fieldLabel: '予約ページのURL', desc: '予約サイト・予約フォームに誘導' },
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 mb-1">ボタンに表示する文言</div>
                      <TextInput
                        value={goal.label}
                        onChange={(v: string) => update(['goals', gk.key, 'label'], v)}
                        placeholder={gk.label + 'する'}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 mb-1">{gk.fieldLabel}</div>
                      <TextInput
                        value={gk.key === 'phone' ? goal.number : goal.url}
                        onChange={(v: string) => update(['goals', gk.key, gk.key === 'phone' ? 'number' : 'url'], v)}
                        placeholder={gk.key === 'phone' ? '03-xxxx-xxxx' : 'https://'}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="④ AIヒアリング通知（おすすめ）">
        <p className="text-xs text-slate-500 mb-4">
          訪問者が入力フォームを送信すると、AIが会話の要約と見込み客情報を担当者に直接通知します。
          外部URLに飛ばす必要がなく、成約率が最も高いクロージング方法です。
        </p>

        <div className={`rounded-xl border p-4 transition-all ${g.notify?.enabled ? 'bg-gradient-to-br from-indigo-50 to-fuchsia-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📬</span>
              <div>
                <div className="text-sm font-black text-slate-800">AIヒアリング通知を有効にする</div>
                <div className="text-[10px] text-slate-500">有効にすると「ご相談内容を送信」ボタンが自動で選ばれます</div>
              </div>
            </div>
            <ToggleSwitch
              checked={Boolean(g.notify?.enabled)}
              onChange={(v) => update(['goals', 'notify', 'enabled'], v)}
            />
          </div>

          {g.notify?.enabled && (
            <div className="space-y-4 mt-4 pt-4 border-t border-indigo-200">
              <div>
                <Label>訪問者に見せる送信ボタン名</Label>
                <TextInput
                  value={g.notify?.label || ''}
                  onChange={(v: string) => update(['goals', 'notify', 'label'], v)}
                  placeholder="ご相談内容を送信する"
                />
              </div>

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
            const GOAL_OPTIONS: { key: string; label: string; emoji: string }[] = [
              { key: 'notify', label: 'AIヒアリング通知', emoji: '📬' },
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

function NurtureTab({ config, update }: any) {
  const n = config.nurture || {};
  const options = n.options || [];
  return (
    <>
      <Card title="追客モード（検討します系の対応）">
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(n.enabled)}
              onChange={(e) => update(['nurture', 'enabled'], e.target.checked)}
            />
            <span className="text-sm font-bold">追客モードを有効にする</span>
          </label>
          <div>
            <Label>モード</Label>
            <Select value={n.mode} onChange={(v: string) => update(['nurture', 'mode'], v)} options={[
              { value: 'soft', label: 'ソフト（1つ提案）' },
              { value: 'hard', label: 'ハード（断られたら次を提案）' },
            ]} />
          </div>
        </div>
      </Card>

      <Card title="追客オプション（優先度順）">
        {options.length === 0 && <p className="text-xs text-slate-400 mb-3">LINE登録・資料請求など追客手段を登録してください</p>}
        <div className="space-y-3">
          {options.map((o: any, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  value={o.type}
                  onChange={(v: string) => {
                    const next = [...options];
                    next[i] = { ...next[i], type: v };
                    update(['nurture', 'options'], next);
                  }}
                  placeholder="line / document / mail"
                />
                <TextInput
                  value={o.label}
                  onChange={(v: string) => {
                    const next = [...options];
                    next[i] = { ...next[i], label: v };
                    update(['nurture', 'options'], next);
                  }}
                  placeholder="LINE友だち追加"
                />
              </div>
              <TextInput
                value={o.url}
                onChange={(v: string) => {
                  const next = [...options];
                  next[i] = { ...next[i], url: v };
                  update(['nurture', 'options'], next);
                }}
                placeholder="URL"
              />
              <TextArea
                value={o.message}
                onChange={(v: string) => {
                  const next = [...options];
                  next[i] = { ...next[i], message: v };
                  update(['nurture', 'options'], next);
                }}
                placeholder="提案時のメッセージ"
                rows={2}
              />
              <button
                onClick={() => {
                  const next = [...options];
                  next.splice(i, 1);
                  update(['nurture', 'options'], next);
                }}
                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
              ><Trash2 className="w-3 h-3" />削除</button>
            </div>
          ))}
          <button
            onClick={() => update(['nurture', 'options'], [...options, { type: '', label: '', url: '', message: '' }])}
            className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
          ><Plus className="w-3 h-3" />オプション追加</button>
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
        {/* ライブプレビュー */}
        <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4">
          <div
            className="w-14 h-14 flex items-center justify-center text-white shadow-lg shrink-0"
            style={{
              background: a.gradient && a.gradientTo
                ? `linear-gradient(135deg, ${a.primaryColor || '#6366f1'} 0%, ${a.gradientTo} 100%)`
                : (a.primaryColor || '#6366f1'),
              borderRadius: a.bubbleShape === 'square' ? '12px' : a.bubbleShape === 'rounded' ? '20px' : '50%',
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d={ICON_SVG_PATHS[(a.iconStyle || 'chat') as keyof typeof ICON_SVG_PATHS]} />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-600">{a.botName || 'AIアシスタント'}</div>
            <div className="text-[10px] text-slate-400">実際のバブルのイメージ</div>
          </div>
          <div
            className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-md"
            style={{
              background: a.gradient && a.gradientTo
                ? `linear-gradient(135deg, ${a.primaryColor || '#6366f1'} 0%, ${a.gradientTo} 100%)`
                : (a.primaryColor || '#6366f1'),
            }}
          >
            ボタン色
          </div>
        </div>

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
            <Label>表示位置</Label>
            <Select value={a.bubblePosition} onChange={(v: string) => update(['appearance', 'bubblePosition'], v)} options={[
              { value: 'right', label: '右下' },
              { value: 'left', label: '左下' },
            ]} />
          </div>
          <div>
            <Label>表示タイミング</Label>
            <Select value={String(a.welcomeDelay || 0)} onChange={(v: string) => update(['appearance', 'welcomeDelay'], Number(v))} options={[
              { value: '0', label: '即座' },
              { value: '10', label: '10秒後' },
              { value: '30', label: '30秒後' },
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
