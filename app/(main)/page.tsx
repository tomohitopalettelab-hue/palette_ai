"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Layout, MessageSquare, Sparkles, User, Box, PenLine, RefreshCw, BellRing } from 'lucide-react';

function PaletteDesignInner() {
  const searchParams = useSearchParams();
  const queryCid = searchParams.get('cid')?.trim();
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'こんにちは！Palette AIです。素敵なホームページを作るために、いくつか質問をさせていただきますね。まず、お名前や屋号（サービス名）を教えていただけますか？' }
  ]);
  const [generatedCode, setGeneratedCode] = useState("");
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [confirmMessages, setConfirmMessages] = useState<any[]>([]);
  const [aiExplanation, setAiExplanation] = useState(""); // AI の意思決定・方針を保存
  const [conversationEnded, setConversationEnded] = useState(false); // ヒアリング完了フラグ
  const [sessionCustomerId] = useState(
    () => queryCid || `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // ★DB保存の判定ロジックを含む関数
  const extractCode = async (text: string, currentMessages: any[]) => {
    const match = text.match(/```html([\s\S]*?)```/);
    if (!match || !match[1]) return;

    const code = match[1].trim();
    setGeneratedCode(code);
    
    // HTML コードブロック前の「AI の説明」を抽出
    const explanationMatch = text.match(/```html/i);
    let explanation = "";
    if (explanationMatch) {
      // HTML コードブロックより前のテキスト = AI の意思決定
      explanation = text.substring(0, explanationMatch.index || 0).trim();
    }
    setAiExplanation(explanation);
    
    // 「ワイヤーフレーム」や「構成案」という言葉が含まれている場合は、
    // DB保存のための情報を保持しておく（OK が来たら saveToLab を呼ぶ）
    if (text.includes("ワイヤーフレーム") || text.includes("構成案") || text.includes("図面")) {
      console.log("ワイヤーフレームを検知しました。OK が送信されたら保存します。");
      // wireframe でも currentMessages を保持しておく
      setConfirmMessages(currentMessages);
      setShowConfirmSave(true); // OKボタンを表示
      // conversationEndedはfalseのまま
      return;
    }

    // 本番デザインと判断されたので、保存候補として情報を保持しておく
    setConfirmMessages(currentMessages);
    setShowConfirmSave(true); // HTMLが生成されたら即表示

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => setActiveTab('preview'), 1000);
    }
  };

  const buildUserAnswers = (currentMessages: any[]) => {
    const userAnswers: { q: string, a: string }[] = [];
    for (let i = 0; i < currentMessages.length; i++) {
      const msg = currentMessages[i];
      if (msg.role !== 'user') continue;
      const prevAiMsg = currentMessages
        .slice(0, i)
        .reverse()
        .find((m: any) => m.role === 'ai');
      userAnswers.push({
        q: prevAiMsg?.content || '質問',
        a: String(msg.content || ''),
      });
    }
    return userAnswers;
  };

  const saveDraftToLab = async (currentMessages: any[], status: 'hearing' | 'reviewing' | 'completed' = 'hearing') => {
    try {
      const firstUserMessage = currentMessages.find((m: any) => m.role === 'user')?.content || '新規顧客';
      const userAnswers = buildUserAnswers(currentMessages);

      const payload = {
        id: sessionCustomerId,
        customer_id: sessionCustomerId,
        name: String(firstUserMessage).slice(0, 80) || '新規顧客',
        answers: userAnswers,
        description: aiExplanation || 'ヒアリング中',
        htmlCode: generatedCode || '',
        status,
      };

      const response = await fetch('/api/save-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `保存に失敗しました (${response.status})`);
      }
    } catch (err) {
      console.error('下書き保存エラー:', err);
    }
  };

  // 明示的に保存を行う関数
  const saveToLab = async (currentMessages: any[], html: string) => {
    if (!html) {
      console.error("保存するHTMLがありません");
      return;
    }
    try {
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      let customerName = titleMatch ? titleMatch[1] : (currentMessages.find(m => m.role === 'user')?.content || "新規顧客");
      if (!titleMatch) {
        customerName += ` (${new Date().toLocaleTimeString()})`;
      }

      const userAnswers = buildUserAnswers(currentMessages);

      const payload = {
        id: sessionCustomerId,
        customer_id: sessionCustomerId,
        name: customerName,
        answers: userAnswers,
        description: aiExplanation || "デザイン方針の詳細記録なし",
        htmlCode: html,
        status: 'reviewing',
      };

      const response = await fetch('/api/save-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `保存に失敗しました (${response.status})`);
      }

      console.log("Labへの保存が完了しました");
    } catch (err) {
      console.error("保存エラー:", err);
      alert('保存に失敗しました。環境変数やDB接続を確認してください。');
    }
  };

  const handleSend = async (overrideText?: string, e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    // 新規送信があれば確認UIを閉じる
    setShowConfirmSave(false);
    const messageToSend = overrideText || inputText;
    if (!messageToSend.trim() || isLoading) return;

    // ★ wireframe 後（conversationEnded = true）の OK 送信時に保存処理を実行
    if (conversationEnded && /OK|ok|了解|承認/.test(messageToSend)) {
      console.log("wireframe 系統での OK 送信を検知。saveToLab を実行します。");
      await saveToLab(confirmMessages, generatedCode);
      // その後、通常通り AI に OK メッセージを送信
    } else if (conversationEnded) {
      // OK 以外のメッセージは無視
      return;
    }

    const userMessage = { role: 'user', content: messageToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    await saveDraftToLab(updatedMessages, 'hearing');
    setInputText("");
    setIsLoading(true);

    // テンプレート情報をAIへの隠し指示として付与
    const systemContext = `
あなたはプロのWebディレクターです。次の方針で会話してください。
`;

    const sanitizeHistoryText = (text: string) => {
      return String(text || '')
        .replace(/```html[\s\S]*?```/gi, '[HTML omitted]')
        .replace(/\s{3,}/g, ' ')
        .trim();
    };

    const fieldOrder = [
      '屋号名・会社名',
      '業種・サービス',
      'ターゲット',
      'デザインの好み',
      '掲載内容',
      '実績紹介',
      '会社概要',
      'お問い合わせ',
      '採用情報',
    ];

    const fieldPatterns: { label: string; pattern: RegExp }[] = [
      { label: '屋号名・会社名', pattern: /(屋号|会社名|法人名|社名|ブランド名)/i },
      { label: '業種・サービス', pattern: /(業種|サービス|事業内容|取扱|提供)/i },
      { label: 'ターゲット', pattern: /(ターゲット|対象|顧客層|ペルソナ)/i },
      { label: 'デザインの好み', pattern: /(雰囲気|デザイン|テイスト|トーン|色味)/i },
      { label: '掲載内容', pattern: /(掲載|内容|ページ|必要な項目|構成)/i },
      { label: '実績紹介', pattern: /(実績|制作実績|事例|ポートフォリオ|ギャラリー)/i },
      { label: '会社概要', pattern: /(会社概要|アクセス|住所|電話|営業時間|定休日|所在地)/i },
      { label: 'お問い合わせ', pattern: /(問い合わせ|お問合せ|フォーム|連絡先|メール|電話窓口)/i },
      { label: '採用情報', pattern: /(採用|求人|募集|雇用形態|職種|応募方法)/i },
    ];

    const summaryMap = new Map<string, string>();
    const addSummary = (label: string, value: string) => {
      if (!summaryMap.has(label) && value.length >= 2) {
        summaryMap.set(label, value.slice(0, 160));
      }
    };

    messages.forEach((msg: any, index: number) => {
      if (msg.role !== 'user') return;
      const answer = sanitizeHistoryText(msg.content);
      if (!answer || /^(ok|了解|承認|お願いします|修正お願いします)$/i.test(answer)) return;
      const prevAi = messages.slice(0, index).reverse().find((m: any) => m.role === 'ai');
      const questionText = sanitizeHistoryText(prevAi?.content || '');
      const matched = fieldPatterns.find(({ pattern }) => pattern.test(questionText));
      if (matched) {
        addSummary(matched.label, answer);
      }
    });

    if (!summaryMap.has('屋号名・会社名')) {
      const fallbackCompany = messages
        .filter((m: any) => m.role === 'user')
        .map((m: any) => sanitizeHistoryText(m.content))
        .find((text: string) => /株式会社|有限会社|合同会社|Inc\.|LLC|店|サロン|クリニック|工務店|Studio|スタジオ/i.test(text));
      if (fallbackCompany) addSummary('屋号名・会社名', fallbackCompany);
    }

    const summaryLines = fieldOrder
      .filter((label) => summaryMap.has(label))
      .map((label) => `- ${label}: ${summaryMap.get(label)}`);

    const summaryPayload = {
      companyName: summaryMap.get('屋号名・会社名') || null,
      businessService: summaryMap.get('業種・サービス') || null,
      target: summaryMap.get('ターゲット') || null,
      designPreference: summaryMap.get('デザインの好み') || null,
      contents: summaryMap.get('掲載内容') || null,
      works: summaryMap.get('実績紹介') || null,
      companyProfile: summaryMap.get('会社概要') || null,
      contactForm: summaryMap.get('お問い合わせ') || null,
      recruiting: summaryMap.get('採用情報') || null,
    };

    const recentUserFacts = messages
      .filter((m: any) => m.role === 'user')
      .map((m: any) => sanitizeHistoryText(m.content))
      .filter((text: string) => text.length >= 3)
      .filter((text: string) => !/^(ok|了解|承認|お願いします|修正お願いします)$/i.test(text))
      .slice(-4)
      .map((text: string, index: number) => `${index + 1}. ${text.slice(0, 120)}`);

    const summaryContent = summaryLines.length
      ? `確定事項サマリ(JSON):\n${JSON.stringify(summaryPayload)}\n\n確定事項サマリ（可読）:\n${summaryLines.join('\n')}`
      : recentUserFacts.length
        ? `確定事項サマリ（直近回答）:\n${recentUserFacts.join('\n')}`
        : '';

    const summaryHistory = summaryContent
      ? [{
          role: 'user',
          content: summaryContent,
        }]
      : [];

    const recentHistory = messages
      .slice(-8)
      .map((m: any) => ({
        role: m.role === 'ai' ? 'ai' : 'user',
        content: sanitizeHistoryText(m.content).slice(0, 500),
      }))
      .filter((m: any) => m.content.length > 0);

    const compactHistory = [...summaryHistory, ...recentHistory];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          system: systemContext,
          history: compactHistory
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        const aiText = data.text;
        const newMessages = [...updatedMessages, { role: 'ai', content: aiText }];
        setMessages(newMessages);
        extractCode(aiText, newMessages);
        await saveDraftToLab(newMessages, /よろしいでしょうか|OKであれば|確認してください/.test(aiText) ? 'reviewing' : 'hearing');
        // AIが構成確認の文言を含んでいたらボタン表示
        if (/よろしいでしょうか|OKであれば|確認してください/.test(aiText)) {
          setShowConfirmSave(true);
        }

      } else {
        setMessages(prev => [...prev, { role: 'ai', content: "すみません、エラーが起きてしまいました。" }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "接続エラーです。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 確認ボタンが押されたとき
  const handleConfirmSave = async () => {
    setShowConfirmSave(false);
    await saveToLab(confirmMessages, generatedCode);
    setMessages(prev => [
      ...prev,
      {
        role: 'ai',
        content: 'ありがとうございました！\nこの構成を参考に制作させていただきます。\n３～５営業日以内に担当よりご連絡いたします。\n楽しみにお待ちください☺'
      }
    ]);
    setConversationEnded(true);
  };

  const handleRequestRevision = () => {
    setShowConfirmSave(false);
    handleSend("修正お願いします");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex items-center justify-center p-0 md:p-8 overflow-hidden bg-slate-50 touch-none">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-pink-400/10 blur-[120px] rounded-full -top-20 -left-20 animate-pulse" />
        <div className="absolute w-[600px] h-[600px] bg-cyan-400/10 blur-[150px] rounded-full -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '-5s' }} />
      </div>

      <div className="w-full max-w-[1300px] h-full md:h-[90vh] bg-white/40 md:backdrop-blur-[30px] md:rounded-[60px] shadow-neu-flat flex flex-col md:flex-row border-none md:border md:border-white/60 overflow-hidden relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex md:hidden bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/50 z-50">
          <button onClick={() => setActiveTab('chat')} className={`px-6 py-1.5 rounded-full text-[10px] font-black transition-all ${activeTab === 'chat' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}>CHAT</button>
          <button onClick={() => setActiveTab('preview')} className={`px-6 py-1.5 rounded-full text-[10px] font-black transition-all ${activeTab === 'preview' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}>VIEW</button>
        </div>

        <div className={`flex flex-col p-5 md:p-10 h-full border-r border-white/20 w-full md:w-[400px] lg:w-[460px] shrink-0 ${activeTab === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          <header className="flex justify-between items-center mb-6 shrink-0 pt-12 md:pt-0">
            <div className="flex flex-col text-slate-800">
              <h1 className="text-2xl font-black tracking-tighter italic">Palette AI</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">prototype</span>
            </div>
            <div className="w-10 h-10 rounded-full shadow-neu-flat bg-white/50 flex items-center justify-center border border-white">
              <User className="w-4 h-4 text-slate-400" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar flex flex-col pb-4 touch-auto">
            {messages.map((msg, index) => (
              (() => {
                const isCompletionMessage =
                  msg.role === 'ai' &&
                  typeof msg.content === 'string' &&
                  msg.content.startsWith('ありがとうございました！');

                return (
                  <div key={index} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl shadow-neu-flat flex items-center justify-center shrink-0 border ${isCompletionMessage ? 'bg-violet-50 border-violet-200' : 'bg-white/80 border-white'}`}>
                      {msg.role === 'ai' ? (
                        isCompletionMessage ? <BellRing className="w-4 h-4 text-violet-500" /> : <Sparkles className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className={`p-4 rounded-[22px] max-w-[85%] text-sm font-medium whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'ai'
                        ? isCompletionMessage
                          ? 'rounded-tl-none bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 text-violet-800 shadow-[0_8px_24px_rgba(139,92,246,0.12)]'
                          : 'rounded-tl-none shadow-neu-inset bg-white/20 text-slate-600'
                        : 'rounded-tr-none shadow-neu-flat bg-white/80 text-slate-600'
                    }`}>
                      {msg.role === 'ai'
                        ? msg.content.replace(/```html[\s\S]*?```/g, '').trim() || "プレビューを生成しました！"
                        : msg.content}
                    </div>
                  </div>
                );
              })()
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center px-10">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={scrollEndRef} />
          </main>

          <div className="mt-auto pt-4 pb-2 md:pb-0">
            {showConfirmSave && !conversationEnded && (
              <div className="mb-3 rounded-2xl border border-violet-200/70 bg-white/60 backdrop-blur-md p-2.5 shadow-neu-flat flex items-center justify-between gap-2">
                <button onClick={handleRequestRevision} className="px-4 py-2.5 bg-white text-slate-700 rounded-xl text-xs font-black tracking-wide border border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
                  修正
                </button>
                <button onClick={handleConfirmSave} className="px-5 py-2.5 bg-gradient-to-r from-violet-400 to-fuchsia-400 text-white rounded-xl text-xs font-black tracking-wide shadow-lg hover:from-violet-300 hover:to-fuchsia-300 transition-all active:scale-95">
                  OK
                </button>
              </div>
            )}
            <div className="p-2 rounded-[30px] shadow-neu-flat bg-white/30 border border-white/50">
              <div className="flex items-end shadow-neu-inset rounded-[24px] bg-[#F0F2F5]/50 px-3 py-1">
                <textarea 
                  ref={textareaRef} 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={handleKeyDown} 
                  placeholder="回答を入力..." 
                  rows={1} 
                  disabled={conversationEnded}
                  className="flex-1 bg-transparent border-none py-3 text-base focus:outline-none text-slate-700 font-medium resize-none min-h-[40px] max-h-[120px] touch-auto" 
                />
                <button 
                  type="button" 
                  onClick={() => handleSend()} 
                  disabled={isLoading} 
                  className="bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 shrink-0 mb-1 ml-2 transition-transform"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`${activeTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 p-5 md:p-10 flex-col bg-slate-50/50 md:bg-white/10 overflow-hidden touch-auto`}>
          <div className="flex justify-between items-center mb-6 shrink-0 pt-12 md:pt-0">
             <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               <Layout className="w-4 h-4" /> Live Preview
             </h2>
          </div>
          <div className="flex-1 rounded-[30px] shadow-neu-inset bg-white md:bg-[#F8FAFC]/50 overflow-hidden border border-white/40">
            {generatedCode ? (
              <iframe 
                srcDoc={`<html><head><script src="https://cdn.tailwindcss.com"></script><style>body { margin: 0; font-family: sans-serif; }</style></head><body>${generatedCode}</body></html>`} 
                className="w-full h-full border-none" 
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <Box className="w-16 h-16 opacity-10" />
                <p className="text-[10px] font-bold tracking-[0.3em] opacity-30 uppercase text-center">Hearing in progress...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaletteDesign() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-slate-50" />}>
      <PaletteDesignInner />
    </Suspense>
  );
}