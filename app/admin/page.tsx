"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Layout, Check, RotateCcw, Monitor, Smartphone, Search, Eye, EyeOff, Plus, Sparkles, Loader2, Grid, Image as ImageIcon, Upload, Wand2, X, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import { templates, Template } from './templates';

type Customer = {
  id: string;
  name: string;
  status: 'hearing' | 'reviewing' | 'completed';
  answers: { q: string, a: string }[];
  htmlCode: string;
  updatedAt: string;
  description?: string;
  isTemplate?: boolean;
};

// AIのレスポンスからHTMLとコメントを分離するヘルパー関数
const extractHtmlAndComment = (text: string) => {
  const codeBlockRegex = /```html([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);
  
  if (match) {
    return {
      html: match[1].trim(),
      comment: text.replace(match[0], "").trim()
    };
  }
  
  // コードブロックがない場合、HTMLタグで簡易判定
  const htmlTagRegex = /<html[\s\S]*<\/html>/i;
  const htmlMatch = text.match(htmlTagRegex);
  if (htmlMatch) {
    return {
      html: htmlMatch[0],
      comment: text.replace(htmlMatch[0], "").trim()
    };
  }

  return { html: text, comment: "" };
};

export default function PaletteLab() {
  const [viewMode, setViewMode] = useState<'pc' | 'mobile'>('pc');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [labMode, setLabMode] = useState<'work' | 'templates'>('work');
  const [aiInstruction, setAiInstruction] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // 画像編集用ステート
  const [editingImage, setEditingImage] = useState<{ pid: string, src: string, alt: string } | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [searchedImages, setSearchedImages] = useState<any[]>([]);
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [imageTab, setImageTab] = useState<'upload' | 'search' | 'generate'>('search');
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  
  const [activeSections, setActiveSections] = useState<{ [key: string]: boolean }>({
    "top": true,
    "concept": true,
    "features": true,
    "service": true,
    "works": true,
    "company": true
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id);

  const refreshCustomers = async () => {
    try {
      const response = await fetch('/api/get-customers');
      const dbData = await response.json();
      const dbCustomers = Array.isArray(dbData) ? dbData : [];
      
      // テンプレートデータをCustomer型に変換
      const templateData: Customer[] = templates.map(t => ({
        id: `tpl-${t.id}`,
        name: t.name,
        status: 'completed',
        answers: [],
        htmlCode: t.html,
        updatedAt: new Date().toISOString(),
        description: t.description,
        isTemplate: true
      }));

      const combinedData = [...templateData, ...dbCustomers];
      setCustomers(combinedData);
      
      if (combinedData.length > 0 && !selectedCustomerId) {
        // 実際の顧客がいればそれを優先的に選択、いなければ最初のテンプレートを選択
        setSelectedCustomerId(dbCustomers.length > 0 ? dbCustomers[0].id : combinedData[0].id);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    refreshCustomers();
  }, []);

  // iframeからのメッセージ受信（画像クリック検知）
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'IMAGE_CLICK') {
        setEditingImage(event.data);
        setImageSearchQuery(event.data.alt || "business"); // altを初期キーワードにする
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  // テンプレート自動選択ロジック
  const autoSelectTemplate = (answers: { q: string, a: string }[]) => {
    if (!answers || answers.length === 0) return templates[0].id;

    const text = answers.map(a => a.a).join(" ").toLowerCase();
    const scores: { [key: string]: number } = {};

    templates.forEach(t => {
      scores[t.id] = 0;
      t.tags.forEach(tag => {
        // タグそのものが含まれているか
        if (text.includes(tag)) scores[t.id] += 3;
        
        // タグに関連する日本語キーワードのマッチング（簡易版）
        const keywords: {[key: string]: string[]} = {
          'simple': ['シンプル', 'すっきり', '簡潔', '標準'],
          'luxury': ['高級', 'エレガント', '上品', '高価', 'ラグジュアリー'],
          'business': ['企業', '会社', '信頼', '誠実', 'ビジネス', 'コーポレート'],
          'pop': ['元気', '明るい', '楽しい', 'ポップ', '子供', 'キッズ'],
          'minimal': ['ミニマル', '余白', '洗練', '無駄のない', '白'],
          'dark': ['クール', 'かっこいい', '黒', 'ダーク', '夜', 'テック'],
          'natural': ['自然', 'オーガニック', '優しい', '緑', 'カフェ', 'ナチュラル'],
          'japanese': ['和風', '日本', '伝統', '和食', '旅館'],
          'portfolio': ['写真', '作品', 'ポートフォリオ', 'ギャラリー', 'クリエイター'],
          'lp': ['販売', '集客', 'ランディング', '訴求', 'コンバージョン']
        };

        if (keywords[tag]) {
          keywords[tag].forEach(k => {
            if (text.includes(k)) scores[t.id] += 1;
          });
        }
      });
    });

    // スコアが最も高いテンプレートIDを返す
    const sortedTemplates = Object.entries(scores).sort(([, a], [, b]) => b - a);
    // スコアが0より大きいものがあればそれを、なければデフォルト(modern)を返す
    return sortedTemplates[0][1] > 0 ? sortedTemplates[0][0] : templates[0].id;
  };

  // 顧客選択時にテンプレートを自動選択
  useEffect(() => {
    if (selectedCustomer && !selectedCustomer.isTemplate && selectedCustomer.answers) {
      const recommendedId = autoSelectTemplate(selectedCustomer.answers);
      setSelectedTemplateId(recommendedId);
    }
  }, [selectedCustomerId]);

  const handleApplyAiAdjustment = async () => {
    if (!aiInstruction || !selectedCustomer) return;
    setIsApplying(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiInstruction,
          history: [
            { role: 'ai', content: `現在のHTMLはこれです: ${selectedCustomer.htmlCode}` }
          ]
        })
      });

      const data = await response.json();
      const { html, comment } = extractHtmlAndComment(data.text || "");

      if (html) {
        setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { 
          ...c, 
          htmlCode: html,
          description: comment || c.description // コメントがあれば更新
        } : c));
      }
    } catch (error: any) {
      console.error("Gemini Error:", error);
      alert(`AIエラー: ${error.message}`);
    } finally {
      setIsApplying(false);
      setAiInstruction("");
    }
  };

  const handleInitialGeneration = async () => {
    if (!selectedCustomer) return;
    setIsApplying(true);
    try {
      // データが存在しない場合のガード処理を追加
      const answerSummary = (selectedCustomer.answers || []).map(a => `${a.q}: ${a.a}`).join("\n");
      
      // 選択されたテンプレートを取得
      const template = templates.find(t => t.id === selectedTemplateId);
      const baseHtml = template ? template.html : "";

      const prompt = `
      あなたはWebデザイナーです。以下の「ヒアリング内容」を元に、「ベースHTML」の中身（テキスト、画像URL、配色クラス）を書き換えて、顧客専用のHTMLを作成してください。

      【制約事項】
      1. **HTML構造（タグの入れ子構造やクラス名）は極力維持**してください。レイアウトを大きく壊さないでください。
      2. テキストはヒアリング内容に合わせて魅力的なものに変更してください。
      3. 画像は \`https://placehold.co/600x400\` などのプレースホルダー画像、またはUnsplash等の実在するURLに差し替えてください。
      4. 配色はTailwind CSSのクラスを変更して調整してください（例: bg-indigo-600 -> bg-pink-500 など）。

      【ヒアリング内容】
      ${answerSummary}

      【ベースHTML】
      ${baseHtml}
      `;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: []
        })
      });

      // サーバーエラーの場合の処理を追加
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ text: response.statusText }));
        throw new Error(errorData.text || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const { html, comment } = extractHtmlAndComment(data.text || "");

      if (html) {
        setCustomers(prev => prev.map(c => 
          c.id === selectedCustomerId ? { ...c, htmlCode: html, description: comment, status: 'reviewing' } : c
        ));
      }
    } catch (error: any) {
      console.error("Generation Error:", error);
      alert(`初期生成に失敗しました: ${error.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedCustomer) return;
    const newName = prompt("名前を入力して保存:", `${selectedCustomer.name} のコピー`);
    if (!newName) return;

    setIsLoadingData(true);
    try {
      const response = await fetch('/api/save-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedCustomer,
          id: `data-${Date.now()}`,
          name: newName,
          updatedAt: new Date().toLocaleDateString()
        })
      });

      if (response.ok) {
        alert("保存しました！");
        await refreshCustomers();
      }
    } catch (error) {
      alert("保存に失敗しました。");
    } finally {
      setIsLoadingData(false);
    }
  };

  // 画像検索ハンドラ
  const handleImageSearch = async () => {
    if (!imageSearchQuery) return;
    setIsSearchingImage(true);
    try {
      const res = await fetch('/api/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: imageSearchQuery })
      });
      const data = await res.json();
      setSearchedImages(data.images || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingImage(false);
    }
  };

  const handleScreenshot = async () => {
    if (!iframeRef.current?.contentWindow) {
      alert('プレビューの読み込みが完了していません。');
      return;
    }

    try {
      const canvas = await html2canvas(iframeRef.current.contentWindow.document.body, {
        useCORS: true, // 外部画像を許可
        allowTaint: true,
        scale: 2, // 高解像度化
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `palette-ai-screenshot-${Date.now()}.png`;
      link.click();
      link.remove();
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('スクリーンショットの撮影に失敗しました。');
    }
  };

  // 画像適用ハンドラ
  const applyNewImage = (newSrc: string) => {
    if (!selectedCustomer || !editingImage) return;

    // pidからインデックスを抽出 (例: "img-0" -> 0)
    const indexMatch = editingImage.pid.match(/img-(\d+)/);
    if (!indexMatch) return;
    const targetIndex = parseInt(indexMatch[1], 10);

    let currentIndex = 0;
    // imgタグを検索して、targetIndex番目のものを置換
    const updatedHtml = selectedCustomer.htmlCode.replace(/<img\s+([^>]*?)>/gi, (match) => {
      if (currentIndex === targetIndex) {
        // src属性を置換
        return match.replace(/src="[^"]*"/, `src="${newSrc}"`);
      }
      currentIndex++;
      return match;
    });

    setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { ...c, htmlCode: updatedHtml } : c));
    setEditingImage(null); // モーダルを閉じる
  };

  // ファイルアップロードハンドラ
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        applyNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getProcessedHtml = (html: string, enableEdit: boolean = true) => {
    if (!html) return "";
    let processed = html;
    
    Object.keys(activeSections).forEach(id => {
      if (!activeSections[id]) {
        const regex = new RegExp(`id="${id}"`, 'g');
        processed = processed.replace(regex, `id="${id}" hidden style="display: none !important;"`);
      }
    });

    if (enableEdit) {
      // imgタグにユニークID (data-pid) を付与し、クリックイベント用のスタイルを追加
      let imgIndex = 0;
      // 既存のdata-pidがない場合のみ付与
      processed = processed.replace(/<img\s+([^>]*?)>/gi, (match, attrs) => {
        if (attrs.includes('data-pid')) return match;
        const pid = `img-${imgIndex}`;
        imgIndex++;
        return `<img data-pid="${pid}" ${attrs} style="cursor: pointer; transition: 0.2s; outline: 2px solid transparent;" onmouseover="this.style.outline='4px solid #4f46e5'; this.style.zIndex='100';" onmouseout="this.style.outline='2px solid transparent'">`;
      });

      // クリックイベントを親ウィンドウに送信するスクリプトを注入
      processed += `
        <script>
          document.body.addEventListener('click', function(e) {
            if (e.target.tagName === 'IMG') {
              e.preventDefault();
              e.stopPropagation();
              window.parent.postMessage({ type: 'IMAGE_CLICK', pid: e.target.getAttribute('data-pid'), src: e.target.src, alt: e.target.alt }, '*');
            }
          }, true);
        </script>
      `;
    }

    return processed;
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#F0F2F5] overflow-hidden text-slate-800 font-sans">
      {/* 画像編集モーダル */}
      {editingImage && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> 画像を変更
              </h3>
              <button onClick={() => setEditingImage(null)} className="p-1 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex border-b">
              <button onClick={() => setImageTab('search')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${imageTab === 'search' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Search className="w-4 h-4" /> 素材検索 (無料)
              </button>
              <button onClick={() => setImageTab('upload')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${imageTab === 'upload' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Upload className="w-4 h-4" /> アップロード
              </button>
              <button onClick={() => setImageTab('generate')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${imageTab === 'generate' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Wand2 className="w-4 h-4" /> AI生成
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {imageTab === 'search' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={imageSearchQuery} 
                      onChange={(e) => setImageSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleImageSearch()}
                      placeholder="キーワード (例: cafe, office, nature)" 
                      className="flex-1 p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={handleImageSearch} disabled={isSearchingImage} className="px-6 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700">
                      {isSearchingImage ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {searchedImages.map((img) => (
                      <button key={img.id} onClick={() => applyNewImage(img.url)} className="group relative aspect-video bg-slate-200 rounded-lg overflow-hidden hover:ring-2 ring-indigo-500 transition-all">
                        <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        <p className="absolute bottom-1 left-1 text-[8px] text-white opacity-0 group-hover:opacity-100 truncate w-full px-1">{img.photographer}</p>
                      </button>
                    ))}
                  </div>
                  {searchedImages.length === 0 && !isSearchingImage && (
                    <p className="text-center text-slate-400 text-xs py-8">キーワードを入力して検索してください</p>
                  )}
                </div>
              )}

              {imageTab === 'upload' && (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-2xl bg-white hover:bg-slate-50 transition-colors relative">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-sm font-bold text-slate-500">クリックして画像を選択</p>
                  <p className="text-xs text-slate-400 mt-2">またはドラッグ＆ドロップ</p>
                </div>
              )}

              {imageTab === 'generate' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <strong>AI生成 (Beta):</strong> 理想の画像が見つからない場合に利用してください。プロンプトに基づいて画像を生成します。
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={imageSearchQuery} 
                      onChange={(e) => setImageSearchQuery(e.target.value)}
                      placeholder="どんな画像を作りますか？ (例: futuristic city with neon lights)" 
                      className="flex-1 p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                      onClick={() => {
                        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageSearchQuery)}`;
                        setGeneratedImageUrl(url);
                      }}
                      className="px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90"
                    >
                      Generate
                    </button>
                  </div>
                  {generatedImageUrl && (
                    <div className="mt-4">
                      <div className="aspect-video bg-slate-200 rounded-xl overflow-hidden relative group">
                        <img src={generatedImageUrl} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => applyNewImage(generatedImageUrl)}
                          className="absolute bottom-4 right-4 px-6 py-2 bg-white text-slate-900 rounded-full font-bold text-xs shadow-lg hover:scale-105 transition-transform"
                        >
                          この画像を使用する
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="h-14 w-full bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 p-1 rounded-lg"><Layout className="w-5 h-5" /></div>
          <h1 className="text-sm font-black tracking-tighter uppercase italic">Palette Lab</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={refreshCustomers} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <RotateCcw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button onClick={() => setViewMode('pc')} className={`p-1.5 rounded ${viewMode === 'pc' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('mobile')} className={`p-1.5 rounded ${viewMode === 'mobile' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}><Smartphone className="w-4 h-4" /></button>
          </div>
          <button onClick={handleScreenshot} title="Download Screenshot" className="p-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700">
            <Camera className="w-4 h-4" />
          </button>
          <button onClick={() => setLabMode('templates')} className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${labMode === 'templates' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
            <Grid className="w-4 h-4" /> Templates
          </button>
          <button onClick={handleSaveAsTemplate} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> 保存
          </button>
          <button className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all active:scale-95"><Check className="w-4 h-4" /> 送信</button>
        </div>
      </header>

      <div className="flex-1 w-full flex overflow-hidden">
        <nav className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="検索..." className="w-full bg-slate-100 border-none rounded-xl py-2 pl-9 text-xs outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingData ? (
              <div className="p-10 flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Loading...</p>
              </div>
            ) : (
              customers.filter(c => !c.isTemplate).map(customer => (
                <button 
                  key={customer.id} 
                  onClick={() => {
                    setSelectedCustomerId(customer.id);
                    setLabMode('work');
                  }} 
                  className={`w-full p-4 flex items-center justify-between border-b border-slate-50 transition-all ${selectedCustomerId === customer.id ? 'bg-indigo-50 border-r-4 border-r-indigo-500' : 'hover:bg-slate-50'}`}>
                  <div className="text-left">
                    <p className="font-bold text-sm truncate w-40">{customer.name}</p>
                    <p className={`text-[10px] uppercase font-bold ${customer.id.startsWith('tpl-') ? 'text-purple-500' : 'text-slate-400'}`}>
                      {customer.id.startsWith('tpl-') ? 'TEMPLATE' : customer.status}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </nav>

        <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 space-y-6">
          {selectedCustomer && (
            <>
              {/* Section Control */}
              <section className="space-y-4">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout Sections</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(activeSections).map(key => (
                    <button
                      key={key}
                      onClick={() => setActiveSections(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-between ${
                        activeSections[key] 
                          ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' 
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span>{key}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${activeSections[key] ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </section>

              {/* Generation Memo (Hearing Answersの上に配置) */}
              <section className="space-y-4">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generation Memo</h2>
                <textarea
                  value={selectedCustomer.description || ""}
                  onChange={(e) => {
                    const newDesc = e.target.value;
                    setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { ...c, description: newDesc } : c));
                  }}
                  className="w-full h-24 p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm text-slate-600"
                  placeholder="AIからのコメントやメモ..."
                />
              </section>

              {/* 【復活】ヒアリング内容セクション */}
              <section className="space-y-4 pt-4 border-t border-slate-200">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hearing Answers</h2>
                <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm overflow-hidden max-h-48 overflow-y-auto">
                  {selectedCustomer.answers && selectedCustomer.answers.length > 0 ? (
                    selectedCustomer.answers.map((ans, i) => (
                      <div key={i} className="mb-2 last:mb-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Q: {ans.q}</p>
                        {ans.a?.startsWith('data:image') ? (
                          <div className="mt-1">
                            <img src={ans.a} alt="Answer Image" className="max-w-full h-auto rounded-lg border border-slate-200 max-h-40 object-contain" />
                          </div>
                        ) : (
                          <p className="text-[11px] font-medium text-slate-700 leading-tight">{ans.a}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">No answers available.</p>
                  )}
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t border-slate-200">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Generation</h2>
                
                {/* テンプレート選択プルダウン */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500">使用するテンプレート</label>
                  <select 
                    value={selectedTemplateId} 
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleInitialGeneration}
                  disabled={isApplying}
                  className="w-full py-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-xl transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                  <span>Generate Draft</span>
                </button>
              </section>

              <section className="space-y-4 pt-4 border-t border-slate-200">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">AI Tuning</h2>
                <textarea 
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleApplyAiAdjustment(); } }}
                  className="w-full h-32 p-4 bg-white border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner resize-none" 
                  placeholder="指示を入力..."
                ></textarea>
                <button onClick={handleApplyAiAdjustment} disabled={isApplying || !aiInstruction} className={`w-full py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${isApplying ? 'bg-slate-400' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                  {isApplying ? 'Applying...' : 'Apply Adjustments'}
                </button>
              </section>
            </>
          )}
        </aside>

        <main className="flex-1 w-full bg-slate-200 p-4 flex flex-col overflow-hidden">
          {labMode === 'templates' ? (
            <div className="w-full h-full overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
                {customers.filter(c => c.isTemplate).map(template => (
                  <button 
                    key={template.id} 
                    onClick={() => {
                      setSelectedCustomerId(template.id);
                      setLabMode('work');
                    }}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all text-left flex flex-col group border border-slate-200 h-80"
                  >
                    <div className="h-40 bg-slate-100 relative overflow-hidden border-b border-slate-100">
                      <div className="absolute inset-0 pointer-events-none select-none opacity-80 group-hover:opacity-100 transition-opacity">
                        <iframe 
                          srcDoc={`<html><body style="transform: scale(0.4); transform-origin: top left; width: 250%; overflow: hidden;">${template.htmlCode}</body></html>`}
                          className="w-full h-full border-none pointer-events-none"
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-800 mb-1">{template.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">{template.description}</p>
                      <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">TEMPLATE</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : selectedCustomer ? (
            <div className="flex-1 w-full flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${activeTab === 'preview' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white/50 text-slate-500'}`}>Preview</button>
                  <button onClick={() => setActiveTab('code')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${activeTab === 'code' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white/50 text-slate-500'}`}>Code</button>
                </div>
                <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase italic">{selectedCustomer.name} - {selectedCustomer.id}</div>
              </div>
              <div className="flex-1 w-full flex justify-center items-stretch overflow-hidden bg-slate-300/50 rounded-2xl">
                {activeTab === 'preview' ? (
                  <div className={`bg-white transition-all duration-500 shadow-2xl relative flex flex-col ${viewMode === 'pc' ? 'w-full h-full' : 'w-[375px] h-[667px] my-auto mx-auto rounded-[40px] border-[12px] border-slate-900 overflow-hidden shrink-0'}`}>
                    <iframe 
                      ref={iframeRef}
                      key={selectedCustomer.htmlCode}
                      srcDoc={`
                        <html>
                          <head>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>body { margin: 0; padding: 0; } body::-webkit-scrollbar { display: none; }</style>
                          </head>
                          <body>${getProcessedHtml(selectedCustomer.htmlCode)}</body>
                        </html>
                      `}
                      className="flex-1 w-full h-full border-none" 
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-slate-900 p-6 overflow-auto text-left rounded-xl shadow-2xl">
                    <pre className="text-emerald-400 text-xs font-mono leading-relaxed">
                      <code>{getProcessedHtml(selectedCustomer.htmlCode)}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 italic">顧客を選択してください</div>
          )}
        </main>
      </div>
    </div>
  );
}