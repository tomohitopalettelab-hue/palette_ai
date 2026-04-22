'use client';

import { useEffect, useState, useCallback, use as usePromise } from 'react';
import Link from 'next/link';
import {
  Bot, ArrowLeft, Save, Copy, Check, Plus, Trash2, MessageSquare, Code,
  Sparkles, Settings2, HelpCircle, Palette, Heart, Package,
} from 'lucide-react';

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
        {tab === 'conversation' && <ConversationTab config={config} update={updateConfigField} />}
        {tab === 'nurture' && <NurtureTab config={config} update={updateConfigField} />}
        {tab === 'appearance' && (
          <AppearanceTab
            config={config}
            update={updateConfigField}
            embedCode={embedCode}
            onCopy={copyEmbed}
            copied={copied}
          />
        )}
      </div>
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
            <div className="md:col-span-2"><Label>こんな方におすすめ（タグをカンマ区切り）</Label><TextInput value={(s.targetTags || []).join(',')} onChange={(v: string) => onChange(s.id, { targetTags: v.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="クセ毛,40代以降,広がり" /></div>
            <div className="md:col-span-2"><Label>解決できる悩み（タグをカンマ区切り）</Label><TextInput value={(s.problemTags || []).join(',')} onChange={(v: string) => onChange(s.id, { problemTags: v.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="まとまらない,毎朝のセット" /></div>
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

function ConversationTab({ config, update }: any) {
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
      <Card title="ウェルカム・ヒアリング">
        <div className="space-y-4">
          <div><Label>ウェルカムメッセージ（最初に表示）</Label><TextArea value={c.welcomeMessage} onChange={(v: string) => update(['conversation', 'welcomeMessage'], v)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>ヒアリング最小往復数</Label><TextInput value={String(c.hearingMinTurns ?? 2)} onChange={(v: string) => update(['conversation', 'hearingMinTurns'], Number(v) || 2)} /></div>
            <div><Label>ヒアリング最大往復数</Label><TextInput value={String(c.hearingMaxTurns ?? 5)} onChange={(v: string) => update(['conversation', 'hearingMaxTurns'], Number(v) || 5)} /></div>
          </div>
        </div>
      </Card>

      <Card title="サービス提案（カード形式）">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>提示カード数（1-3）</Label><TextInput value={String(c.cardCount ?? 3)} onChange={(v: string) => update(['conversation', 'cardCount'], Math.max(1, Math.min(3, Number(v) || 3)))} /></div>
            <div><Label>提示順の基準</Label>
              <Select value={c.cardSortBy} onChange={(v: string) => update(['conversation', 'cardSortBy'], v)} options={[
                { value: 'match', label: 'マッチ度' },
                { value: 'price_asc', label: '価格昇順' },
                { value: 'price_desc', label: '価格降順' },
                { value: 'new', label: '新着順' },
              ]} />
            </div>
          </div>
          <div>
            <Label>カード表示項目</Label>
            <div className="flex flex-wrap gap-3 text-xs">
              {['price', 'duration', 'features', 'testimonial'].map((key) => (
                <label key={key} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(show[key])}
                    onChange={(e) => update(['conversation', 'cardShow', key], e.target.checked)}
                  />
                  {key === 'price' && '価格'}
                  {key === 'duration' && '所要時間'}
                  {key === 'features' && '特徴'}
                  {key === 'testimonial' && 'お客様の声'}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="クロージング（ゴール）設定">
        <div className="space-y-4">
          {goalKeys.map((gk) => {
            const goal = g[gk.key] || {};
            return (
              <div key={gk.key} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                <label className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={Boolean(goal.enabled)}
                    onChange={(e) => update(['goals', gk.key, 'enabled'], e.target.checked)}
                  />
                  <span className="text-xs font-bold">{gk.label}</span>
                </label>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <TextInput
                    value={goal.label}
                    onChange={(v: string) => update(['goals', gk.key, 'label'], v)}
                    placeholder="ボタンラベル"
                  />
                  <TextInput
                    value={gk.key === 'phone' ? goal.number : goal.url}
                    onChange={(v: string) => update(['goals', gk.key, gk.key === 'phone' ? 'number' : 'url'], v)}
                    placeholder={gk.key === 'phone' ? '電話番号' : 'URL'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="買う気度×ゴール マトリクス">
        <p className="text-xs text-slate-500 mb-3">買う気度スコア別に、どのクロージング先を使うか優先順位で指定</p>
        <div className="space-y-2">
          {['5', '4', '3', '2', '1'].map((score) => (
            <div key={score} className="flex items-center gap-3">
              <div className="w-20 shrink-0 text-xs font-bold">スコア{score}</div>
              <TextInput
                value={(matrix[score] || []).join(',')}
                onChange={(v: string) => update(['conversation', 'closingMatrix', score], v.split(',').map((x) => x.trim()).filter(Boolean))}
                placeholder="reservation,phone"
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">※使えるキー: reservation / inquiry / phone / line / document</p>
      </Card>

      <Card title="リード取得項目">
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

function AppearanceTab({ config, update, embedCode, onCopy, copied }: any) {
  const a = config.appearance || {};
  return (
    <>
      <Card title="見た目">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Bot名</Label><TextInput value={a.botName} onChange={(v: string) => update(['appearance', 'botName'], v)} placeholder="AIアシスタント" /></div>
          <div><Label>プライマリカラー</Label><TextInput value={a.primaryColor} onChange={(v: string) => update(['appearance', 'primaryColor'], v)} placeholder="#6366f1" /></div>
          <div><Label>Botアイコン（URL）</Label><TextInput value={a.botIcon} onChange={(v: string) => update(['appearance', 'botIcon'], v)} /></div>
          <div><Label>表示タイミング</Label>
            <Select value={a.welcomeDelay} onChange={(v: string) => update(['appearance', 'welcomeDelay'], Number(v))} options={[
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
