'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flame, User, Bot, CheckCircle2, ExternalLink } from 'lucide-react';

type Session = {
  id: string;
  paletteId: string;
  stage: string;
  buyIntentScore: number;
  matchedServiceIds: string[];
  selectedServiceId: string | null;
  messages: any[];
  lead: any;
  closedAction: string | null;
  closed: boolean;
  syncedToCrm: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function SessionDetailPage({ params }: { params: Promise<{ paletteId: string; id: string }> }) {
  const { paletteId, id } = usePromise(params);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/bot-settings/${paletteId}/sessions/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.success) setSession(data.session);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [paletteId, id]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">読み込み中...</div>;
  if (!session) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">セッションが見つかりません</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/admin/bot-settings/${paletteId}/sessions`} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-slate-800">会話詳細</h1>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-slate-400 font-bold uppercase tracking-widest">買う気度</div>
              <div className="flex items-center gap-1 mt-1">
                {session.buyIntentScore >= 4 && <Flame className="w-4 h-4 text-red-500" />}
                <span className="text-xl font-black">{session.buyIntentScore}/5</span>
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-bold uppercase tracking-widest">ステージ</div>
              <div className="text-sm font-black mt-1">{session.stage}</div>
            </div>
            <div>
              <div className="text-slate-400 font-bold uppercase tracking-widest">状態</div>
              <div className="mt-1">
                {session.closed ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-black">
                    <CheckCircle2 className="w-3 h-3" />完了
                  </span>
                ) : (
                  <span className="text-slate-400 font-bold">進行中</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-bold uppercase tracking-widest">CRM連携</div>
              <div className="mt-1">
                {session.syncedToCrm ? (
                  <span className="text-emerald-600 font-black">転送済</span>
                ) : (
                  <span className="text-slate-400 font-bold">未転送</span>
                )}
              </div>
            </div>
          </div>

          {session.lead && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">取得できたリード情報</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Object.entries(session.lead).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-slate-400">{k}</div>
                    <div className="font-bold text-slate-700">{String(v) || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-black text-slate-700 mb-4">会話履歴</h2>
          <div className="space-y-3">
            {session.messages.map((m: any, i: number) => (
              <div key={i} className={`flex gap-3 ${m.role === 'visitor' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${m.role === 'visitor' ? 'bg-slate-100' : 'bg-indigo-50'}`}>
                  {m.role === 'visitor' ? <User className="w-4 h-4 text-slate-500" /> : <Bot className="w-4 h-4 text-indigo-500" />}
                </div>
                <div className={`flex-1 max-w-[80%] ${m.role === 'visitor' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'visitor' ? 'bg-slate-100 text-slate-700' : 'bg-indigo-50 text-slate-700'}`}>
                    {m.content}
                  </div>
                  {Array.isArray(m.cards) && m.cards.length > 0 && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {m.cards.map((c: any, ci: number) => (
                        <div key={ci} className="bg-white border border-slate-200 rounded-xl p-2 text-left">
                          <div className="text-xs font-bold">{c.name}</div>
                          <div className="text-[10px] text-slate-500">{c.price} / {c.duration}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(m.actions) && m.actions.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {m.actions.map((a: any, ai: number) => (
                        <span key={ai} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{a.label || a.key}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[9px] text-slate-400 mt-1">{new Date(m.timestamp).toLocaleString('ja-JP')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
