'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Bot, Flame, CheckCircle2 } from 'lucide-react';

export default function ReportSessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [paletteId, setPaletteId] = useState('');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('reports_palette_id');
    if (saved && /^[A-Z][0-9]{4}$/.test(saved)) {
      setPaletteId(saved);
    } else {
      window.location.href = '/main/reports';
    }
  }, []);

  useEffect(() => {
    if (!paletteId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/main/reports/sessions/${id}?paletteId=${paletteId}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.success) setSession(data.session);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [paletteId, id]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">読み込み中...</div>;
  if (!session) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">会話が見つかりません</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/main/reports/sessions" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-slate-800">会話詳細</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
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
                  <span className="text-emerald-600 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />完了
                  </span>
                ) : (
                  <span className="text-slate-400 font-bold">進行中</span>
                )}
              </div>
            </div>
          </div>
          {session.lead && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">リード情報</div>
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

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-black text-slate-700 mb-4">会話履歴</h2>
          <div className="space-y-3">
            {session.messages?.map((m: any, i: number) => (
              <div key={i} className={`flex gap-3 ${m.role === 'visitor' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${m.role === 'visitor' ? 'bg-slate-100' : 'bg-indigo-50'}`}>
                  {m.role === 'visitor' ? <User className="w-4 h-4 text-slate-500" /> : <Bot className="w-4 h-4 text-indigo-500" />}
                </div>
                <div className={`flex-1 max-w-[80%] ${m.role === 'visitor' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'visitor' ? 'bg-slate-100 text-slate-700' : 'bg-indigo-50 text-slate-700'}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
