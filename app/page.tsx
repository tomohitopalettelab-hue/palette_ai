"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Layout, MessageSquare, Sparkles, User, Box, PenLine, RefreshCw, BellRing } from 'lucide-react';

export default function PaletteDesign() {
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'こんにちは！Palette AIです。素敵なホームページを作るために、10ほど質問をさせていただきますね。まず、お名前や屋号（サービス名）を教えていただけますか？' }
  ]);
  const [generatedCode, setGeneratedCode] = useState("");

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

  const extractCode = async (text: string, currentMessages: any[]) => {
    const match = text.match(/```html([\s\S]*?)```/);
    if (!match || !match[1]) return;

    const code = match[1].trim();
    setGeneratedCode(code);
    
    try {
      const emailPayload = {
        siteName: "Palette AI ヒアリング結果",
        answers: currentMessages.map(m => ({ role: String(m.role), content: String(m.content) })),
        htmlCode: code
      };

      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });
    } catch (err) {
      console.error("送信エラー:", err);
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => setActiveTab('preview'), 1000);
    }
  };

  const handleSend = async (overrideText?: string, e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const messageToSend = overrideText || inputText;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          history: messages.map(m => ({
            role: m.role === 'ai' ? 'ai' : 'user', 
            content: m.content 
          }))
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        const aiText = data.text;
        const newMessages = [...updatedMessages, { role: 'ai', content: aiText }];
        setMessages(newMessages);
        extractCode(aiText, newMessages);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: "すみません、エラーが起きてしまいました。" }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "接続エラーです。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    /* 修正: fixed inset-0 と touch-none で全体のスクロールと揺れを物理的に禁止 */
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

          {/* 修正: touch-auto を追加し、メッセージ部分だけスクロール可能に */}
          <main className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar flex flex-col pb-4 touch-auto">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-xl shadow-neu-flat bg-white/80 flex items-center justify-center shrink-0 border border-white">
                  {msg.role === 'ai' ? <Sparkles className="w-4 h-4 text-indigo-500" /> : <User className="w-4 h-4 text-slate-400" />}
                </div>
                <div className={`p-4 rounded-[22px] max-w-[85%] ${msg.role === 'ai' ? 'rounded-tl-none shadow-neu-inset bg-white/20' : 'rounded-tr-none shadow-neu-flat bg-white/80'} text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed`}>
                  {msg.role === 'ai' 
                    ? msg.content.replace(/```html[\s\S]*?```/g, '').trim() || "プレビューを生成しました！"
                    : msg.content
                  }
                </div>
              </div>
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
            <div className="p-2 rounded-[30px] shadow-neu-flat bg-white/30 border border-white/50">
              <div className="flex items-end shadow-neu-inset rounded-[24px] bg-[#F0F2F5]/50 px-3 py-1">
                {/* 修正: text-base (16px) にして自動ズームを防止。touch-auto を追加 */}
                <textarea 
                  ref={textareaRef} 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={handleKeyDown} 
                  placeholder="回答を入力..." 
                  rows={1} 
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