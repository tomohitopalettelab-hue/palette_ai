export type Template = {
  id: string;
  name: string;
  tags: string[];
  description: string;
  html: string;
};

export const templates: Template[] = [
  {
    id: 'template-modern',
    name: 'Modern: シンプル & クリーン',
    tags: ['simple', 'clean', 'business', 'startup'],
    description: '汎用性の高いモダンでクリーンなデザイン。セクション固定構成に対応。',
    html: `
<div class="template-root" style="--main-color: #4f46e5; --main-dark: #3730a3; --accent-color: #f8fafc; --text-color: #0f172a; --text-light: #64748b; --bg-color: #ffffff;">
  <div class="min-h-screen font-sans text-[var(--text-color)] bg-[var(--bg-color)] selection:bg-[var(--main-color)] selection:text-white">
    
    <header class="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100/50">
      <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-[var(--main-color)] rounded-lg flex items-center justify-center text-white font-black italic">M</div>
          <h1 class="text-xl font-bold tracking-tighter text-[var(--text-color)]">Modern<span class="text-[var(--main-color)]">Corp</span></h1>
        </div>
        <nav class="hidden md:flex items-center gap-8 text-[13px] font-bold uppercase tracking-widest text-[var(--text-light)]">
          <a href="#concept" class="hover:text-[var(--main-color)] transition-colors">Concept</a>
          <a href="#features" class="hover:text-[var(--main-color)] transition-colors">Features</a>
          <a href="#service" class="hover:text-[var(--main-color)] transition-colors">Service</a>
          <a href="#contact" class="ml-4 px-6 py-2.5 bg-[var(--text-color)] text-white rounded-full hover:bg-[var(--main-color)] transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-md">Contact</a>
        </nav>
      </div>
    </header>

    <main>
      <section id="top" class="relative pt-48 pb-32 px-6 overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
          <div class="absolute top-20 left-1/4 w-64 h-64 bg-[var(--main-color)] rounded-full blur-[100px]"></div>
        </div>
        
        <div class="relative max-w-5xl mx-auto text-center">
          <span class="inline-block px-4 py-1.5 mb-6 text-[12px] font-bold tracking-[0.2em] text-[var(--main-color)] bg-[var(--main-color)]/10 rounded-full uppercase">Innovation & Design</span>
          <h2 class="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
            Create the <br/><span class="text-transparent bg-clip-text bg-gradient-to-r from-[var(--main-color)] to-[#818cf8]">Next Standard.</span>
          </h2>
          <p class="text-xl text-[var(--text-light)] mb-12 max-w-2xl mx-auto leading-relaxed">
            私たちは、複雑な課題をシンプルなデザインで解決し、<br class="hidden md:block" />ビジネスの未来を書き換えるクリエイティブパートナーです。
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button class="px-10 py-5 bg-[var(--main-color)] text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:shadow-2xl hover:bg-[var(--main-dark)] transition-all transform hover:-translate-y-1">プロジェクトを始める</button>
            <button class="px-10 py-5 bg-white text-[var(--text-color)] border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all">資料をダウンロード</button>
          </div>
        </div>
      </section>

      <section id="concept" class="py-32 px-6 max-w-6xl mx-auto">
        <div class="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h3 class="text-sm font-bold tracking-[0.3em] text-[var(--main-color)] uppercase mb-4">Our Concept</h3>
            <h4 class="text-4xl font-bold mb-8 leading-snug">デザインの力で、<br/>本質的な価値を可視化する。</h4>
          </div>
          <div class="text-lg leading-loose text-[var(--text-light)]">
            <p>情報の海の中で、本当に伝えたいメッセージを届けるために。私たちは表面的な美しさだけでなく、ビジネスの構造から深く理解し、最適なカタチを導き出します。クライアントの想いに伴走し、共に成長し続けることが私たちの使命です。</p>
          </div>
        </div>
      </section>

      <section id="features" class="py-32 px-6 bg-slate-50">
        <div class="max-w-7xl mx-auto">
          <div class="grid md:grid-cols-3 gap-10">
            <div class="group p-10 bg-white rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500">
              <div class="w-14 h-14 bg-indigo-50 text-[var(--main-color)] rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[var(--main-color)] group-hover:text-white transition-colors duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h4 class="text-xl font-bold mb-4 italic">01. Speed</h4>
              <p class="text-[var(--text-light)] leading-relaxed">市場の変化に即座に対応。アイデアを形にするまでのタイムラグを最小限に抑え、機会損失を防ぎます。</p>
            </div>
            <div class="group p-10 bg-white rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500">
              <div class="w-14 h-14 bg-indigo-50 text-[var(--main-color)] rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[var(--main-color)] group-hover:text-white transition-colors duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h4 class="text-xl font-bold mb-4 italic">02. Quality</h4>
              <p class="text-[var(--text-light)] leading-relaxed">ピクセル単位のこだわり。ユーザー体験を第一に考え、長く愛される高品質なアウトプットを約束します。</p>
            </div>
            <div class="group p-10 bg-white rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500">
              <div class="w-14 h-14 bg-indigo-50 text-[var(--main-color)] rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[var(--main-color)] group-hover:text-white transition-colors duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <h4 class="text-xl font-bold mb-4 italic">03. Support</h4>
              <p class="text-[var(--text-light)] leading-relaxed">作って終わりにしない。リリース後のデータ分析や改善案の提示など、成長のための伴走を続けます。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="service" class="py-32 px-6 bg-white">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-16">
            <h3 class="text-3xl font-bold mb-4 text-[var(--text-color)]">Service Plan</h3>
            <p class="text-[var(--text-light)]">プロジェクトの規模に合わせた最適なプランをご提案します</p>
          </div>
          <div class="space-y-4">
            <div class="group bg-slate-50 p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center border border-transparent hover:border-[var(--main-color)]/20 hover:bg-white hover:shadow-xl transition-all duration-300">
              <div class="text-center md:text-left mb-4 md:mb-0">
                <h4 class="text-xl font-bold group-hover:text-[var(--main-color)] transition-colors">Standard Plan</h4>
                <p class="text-sm text-[var(--text-light)] mt-1 font-medium">スタートアップや中小企業に最適なフルパッケージ</p>
              </div>
              <div class="flex items-center gap-6">
                <span class="text-[var(--text-color)] font-black text-3xl italic">¥298,000<span class="text-sm font-normal not-italic text-slate-400">〜</span></span>
                <div class="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[var(--main-color)] group-hover:border-transparent group-hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="works" class="py-32 px-6 bg-slate-900 text-white overflow-hidden">
        <div class="max-w-7xl mx-auto">
          <div class="flex justify-between items-end mb-16">
            <div>
              <h3 class="text-sm font-bold tracking-[0.3em] text-[var(--main-color)] uppercase mb-4">Selected Works</h3>
              <h4 class="text-4xl font-bold">実績紹介</h4>
            </div>
            <a href="#" class="text-sm font-bold border-b border-white/20 pb-1 hover:border-[var(--main-color)] transition-colors">View All</a>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="aspect-[3/4] bg-slate-800 rounded-3xl overflow-hidden relative group cursor-pointer shadow-2xl">
              <div class="absolute inset-0 bg-[var(--main-color)]/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="absolute bottom-6 left-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <p class="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Branding</p>
                <p class="font-bold">Project Alpha</p>
              </div>
            </div>
            <div class="aspect-[3/4] bg-slate-800 rounded-3xl mt-12 overflow-hidden relative group cursor-pointer shadow-2xl">
              <div class="absolute inset-0 bg-[var(--main-color)]/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="absolute bottom-6 left-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <p class="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">UI/UX</p>
                <p class="font-bold">Beta App</p>
              </div>
            </div>
            <div class="aspect-[3/4] bg-slate-800 rounded-3xl overflow-hidden relative group cursor-pointer shadow-2xl">
              <div class="absolute inset-0 bg-[var(--main-color)]/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="absolute bottom-6 left-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <p class="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Web Design</p>
                <p class="font-bold">Gamma Site</p>
              </div>
            </div>
            <div class="aspect-[3/4] bg-slate-800 rounded-3xl mt-12 overflow-hidden relative group cursor-pointer shadow-2xl">
              <div class="absolute inset-0 bg-[var(--main-color)]/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="absolute bottom-6 left-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <p class="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Graphic</p>
                <p class="font-bold">Delta Poster</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="company" class="py-32 px-6 max-w-4xl mx-auto">
        <h3 class="text-center text-3xl font-bold mb-16">Company Profile</h3>
        <dl class="divide-y divide-slate-100">
          <div class="grid grid-cols-3 py-8 items-center">
            <dt class="font-bold text-sm text-[var(--main-color)] uppercase tracking-widest">Company</dt>
            <dd class="col-span-2 text-lg">Modern Design Inc.</dd>
          </div>
          <div class="grid grid-cols-3 py-8 items-center">
            <dt class="font-bold text-sm text-[var(--main-color)] uppercase tracking-widest">Address</dt>
            <dd class="col-span-2 text-lg text-[var(--text-light)]">東京都渋谷区桜丘町 123-45<br/>Modern Bldg. 4F</dd>
          </div>
          <div class="grid grid-cols-3 py-8 items-center">
            <dt class="font-bold text-sm text-[var(--main-color)] uppercase tracking-widest">Founded</dt>
            <dd class="col-span-2 text-lg text-[var(--text-light)]">2026年 2月</dd>
          </div>
        </dl>
      </section>
    </main>

    <footer class="py-16 bg-white border-t border-slate-100">
      <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-[var(--main-color)] rounded flex items-center justify-center text-white font-black text-[10px]">M</div>
          <p class="font-bold text-sm">ModernCorp</p>
        </div>
        <p class="text-xs text-slate-400 font-medium tracking-widest">&copy; 2026 MODERN DESIGN INC. ALL RIGHTS RESERVED.</p>
        <div class="flex gap-6">
          <a href="#" class="text-slate-400 hover:text-[var(--main-color)] transition-colors"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></a>
        </div>
      </div>
    </footer>
  </div>
</div>`
  },
  {
    id: 'template-elegant',
    name: 'Elegant: ラグジュアリー',
    tags: ['luxury', 'beauty', 'hotel', 'serif'],
    description: '余白を活かした高級感のある構成。全セクション対応。',
    html: `
<div class="template-root" style="--main-color: #1a1a1a; --sub-color: #8c764b; --accent-color: #fdfbf7; --text-color: #2d2d2d; --text-light: #7a7a7a; --bg-color: #fdfbf7;">
  <div class="min-h-screen font-serif text-[var(--text-color)] bg-[var(--bg-color)] selection:bg-[#c4b393] selection:text-white">
    
    <header class="sticky top-0 w-full bg-[var(--bg-color)]/90 backdrop-blur-md z-50">
      <div class="max-w-[1400px] mx-auto px-10 h-24 flex justify-between items-center border-b border-black/[0.03]">
        <nav class="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.3em] font-light">
          <a href="#concept" class="hover:text-[var(--sub-color)] transition-colors">Philosophy</a>
          <a href="#works" class="hover:text-[var(--sub-color)] transition-colors">Collection</a>
        </nav>
        <div class="text-2xl tracking-[0.5em] uppercase font-light text-[var(--main-color)] absolute left-1/2 -translate-x-1/2">
          The <span class="font-normal">Luxury</span>
        </div>
        <div class="hidden md:block">
          <a href="#contact" class="text-[10px] uppercase tracking-[0.3em] border-b border-[var(--sub-color)] pb-1 hover:opacity-50 transition-opacity">Reservation</a>
        </div>
      </div>
    </header>

    <main>
      <section id="top" class="relative py-48 px-6 text-center overflow-hidden">
        <div class="relative z-10">
          <p class="text-[11px] tracking-[0.6em] mb-12 uppercase text-[var(--sub-color)] font-medium">Est. 2026 — Ginza, Tokyo</p>
          <h2 class="text-7xl md:text-9xl font-extralight tracking-tighter mb-12 leading-tight text-[var(--main-color)]">
            <span class="italic">Elegant</span> <br/>
            <span class="ml-12 md:ml-24">Experience</span>
          </h2>
          <div class="w-px h-24 bg-gradient-to-b from-[var(--sub-color)] to-transparent mx-auto mt-16"></div>
        </div>
      </section>

      <section id="concept" class="py-40 px-6 bg-white/40">
        <div class="max-w-4xl mx-auto text-center">
          <h3 class="text-[12px] tracking-[0.4em] mb-16 text-[var(--sub-color)] uppercase">Our Philosophy</h3>
          <p class="text-2xl md:text-3xl font-light leading-[2.2] text-[var(--text-color)]">
            「静寂」と「美しさ」の調和を追求し、<br/>
            日常を彩る至高のひとときを創造します。<br/>
            刻まれる時間は、あなただけの芸術へ。
          </p>
        </div>
      </section>

      <section id="features" class="py-40 px-10 max-w-7xl mx-auto">
        <div class="grid md:grid-cols-3 gap-20">
          <div class="group">
            <span class="text-[var(--sub-color)] text-xs mb-6 block font-light">01</span>
            <h4 class="text-2xl mb-6 italic font-light tracking-wide">Material</h4>
            <div class="w-12 h-px bg-black/10 mb-6 group-hover:w-full transition-all duration-700"></div>
            <p class="text-sm leading-loose text-[var(--text-light)]">世界各地から厳選された、触れるたびに溜息が漏れるような最高級の素材。その本質を活かす最適解を選び抜きます。</p>
          </div>
          <div class="group">
            <span class="text-[var(--sub-color)] text-xs mb-6 block font-light">02</span>
            <h4 class="text-2xl mb-6 italic font-light tracking-wide">Craftsmanship</h4>
            <div class="w-12 h-px bg-black/10 mb-6 group-hover:w-full transition-all duration-700"></div>
            <p class="text-sm leading-loose text-[var(--text-light)]">数十年もの歳月をかけて培われた熟練の職人技。機械では決して到達できない、細部への祈りにも似たこだわりを宿します。</p>
          </div>
          <div class="group">
            <span class="text-[var(--sub-color)] text-xs mb-6 block font-light">03</span>
            <h4 class="text-2xl mb-6 italic font-light tracking-wide">Concierge</h4>
            <div class="w-12 h-px bg-black/10 mb-6 group-hover:w-full transition-all duration-700"></div>
            <p class="text-sm leading-loose text-[var(--text-light)]">言葉にされない願いを形に。お客様一人ひとりのライフスタイルに深く寄り添い、パーソナライズされた体験をご提案します。</p>
          </div>
        </div>
      </section>

      <section id="service" class="py-40 px-6 bg-[var(--main-color)] text-white overflow-hidden relative">
        <div class="absolute inset-0 opacity-20 pointer-events-none">
          <div class="absolute top-0 right-0 w-96 h-96 bg-[var(--sub-color)] blur-[150px] -translate-y-1/2"></div>
        </div>
        <div class="relative max-w-3xl mx-auto text-center border border-white/10 p-20 backdrop-blur-sm">
          <h3 class="text-[11px] tracking-[0.5em] mb-12 text-white/50 uppercase italic">Premium Membership</h3>
          <p class="text-5xl font-extralight italic tracking-tighter mb-8 leading-tight">Art of <br/>Living Suite</p>
          <div class="h-px w-16 bg-[var(--sub-color)] mx-auto mb-12"></div>
          <p class="text-3xl font-thin tracking-widest text-[var(--sub-color)]">¥1,000,000 <span class="text-xs text-white/40 tracking-normal ml-2">/ year</span></p>
          <button class="mt-16 px-12 py-5 border border-white/20 text-[10px] tracking-[0.4em] uppercase hover:bg-white hover:text-[var(--main-color)] transition-all duration-500">Apply for Invitations</button>
        </div>
      </section>

      <section id="works" class="py-40 px-6">
        <div class="max-w-[1400px] mx-auto">
          <div class="flex flex-col md:flex-row gap-8 mb-8">
            <div class="w-full md:w-3/5 aspect-[16/10] bg-stone-100 relative group overflow-hidden">
               <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-700"></div>
            </div>
            <div class="w-full md:w-2/5 aspect-[1/1] bg-stone-200 mt-0 md:mt-24 relative group overflow-hidden">
               <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-700"></div>
            </div>
          </div>
          <div class="flex flex-col md:flex-row-reverse gap-8">
             <div class="w-full md:w-3/5 aspect-[16/10] bg-stone-100 relative group overflow-hidden"></div>
             <div class="w-full md:w-1/4 aspect-[3/4] bg-stone-200 -mt-0 md:-mt-32 relative group overflow-hidden"></div>
          </div>
        </div>
      </section>

      <section id="company" class="py-40 px-10 max-w-5xl mx-auto border-t border-black/[0.03]">
        <div class="grid md:grid-cols-2 gap-24">
          <div>
            <h3 class="text-3xl font-light italic mb-8">Information</h3>
            <p class="text-sm text-[var(--text-light)] leading-loose">私たちは常に、あなたのための扉を開けてお待ちしております。特別なリクエストや、より深い体験へのご相談は、下記までお気軽にお寄せください。</p>
          </div>
          <div class="space-y-12">
            <div>
              <p class="text-[10px] tracking-[0.3em] uppercase text-[var(--sub-color)] mb-4 font-bold">Main Office</p>
              <p class="text-lg font-light tracking-wide leading-relaxed">7-chome, Ginza, Chuo-ku,<br/>Tokyo 104-0061, Japan</p>
            </div>
            <div>
              <p class="text-[10px] tracking-[0.3em] uppercase text-[var(--sub-color)] mb-4 font-bold">Contact</p>
              <p class="text-lg font-light tracking-wide">concierge@theluxury-brand.com</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="py-24 border-t border-black/[0.03] text-center">
      <div class="text-[11px] tracking-[0.5em] uppercase text-[var(--main-color)] mb-8 font-light">The Luxury</div>
      <p class="text-[9px] tracking-[0.3em] text-slate-400 font-light">&copy; 2026 THE LUXURY BRAND. PRESERVING TRADITION & ELEGANCE.</p>
    </footer>
  </div>
</div>`
  }
  ,
  {
  id: 'template-corporate',
  name: 'Corporate: 信頼と実績',
  tags: ['business', 'trust', 'blue', 'firm'],
  description: '企業情報、事業内容を整理して見せる、信頼感重視の堅実なデザイン。',
  html: `<div class="template-root" style="--main-color: #1e40af; --main-dark: #1e3a8a; --accent-color: #f8fafc; --text-color: #1e293b; --text-light: #64748b; --bg-color: #ffffff;">
  <div class="min-h-screen font-sans text-[var(--text-color)] bg-[var(--bg-color)]">
    
    <header class="bg-white border-b-2 border-[var(--main-color)] sticky top-0 z-50 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-[var(--main-color)] flex items-center justify-center text-white font-bold rounded-sm">CI</div>
          <div class="font-black text-2xl tracking-tighter text-[var(--main-dark)] uppercase">Corporate <span class="text-[var(--main-color)] font-light">Inc.</span></div>
        </div>
        <nav class="hidden md:flex items-center gap-10">
          <a href="#concept" class="text-[15px] font-bold text-[var(--text-color)] hover:text-[var(--main-color)] transition-colors">Philosophy</a>
          <a href="#features" class="text-[15px] font-bold text-[var(--text-color)] hover:text-[var(--main-color)] transition-colors">Strengths</a>
          <a href="#service" class="text-[15px] font-bold text-[var(--text-color)] hover:text-[var(--main-color)] transition-colors">Solutions</a>
          <a href="#contact" class="px-6 py-2.5 bg-[var(--main-color)] text-white text-sm font-bold rounded hover:bg-[var(--main-dark)] transition-all">お問い合わせ</a>
        </nav>
      </div>
    </header>

    <main>
      <section id="top" class="relative bg-[var(--main-dark)] text-white py-32 px-6 overflow-hidden">
        <div class="absolute inset-0 opacity-10">
          <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 100 L100 0 L100 100 Z" fill="white"/></svg>
        </div>
        <div class="relative max-w-5xl mx-auto">
          <div class="inline-block px-4 py-1 bg-white/10 border-l-4 border-white mb-6 text-sm font-bold tracking-widest uppercase">Since 1990</div>
          <h2 class="text-5xl md:text-7xl font-black leading-tight mb-8">信頼を未来へつなぐ、<br/><span class="text-blue-400 font-light italic">Solution Partner.</span></h2>
          <p class="text-xl opacity-80 max-w-2xl leading-relaxed mb-12">確かな技術と豊富な実績に基づき、複雑化する社会課題に対して、最適かつ持続可能な価値を共創します。</p>
          <div class="flex gap-4">
            <div class="h-1 w-24 bg-blue-400 mt-4"></div>
            <p class="font-bold text-sm tracking-[0.2em] pt-1 uppercase">Reliability and Progress</p>
          </div>
        </div>
      </section>

      <section id="concept" class="py-28 px-6 max-w-6xl mx-auto">
        <div class="grid md:grid-cols-2 gap-20 items-center">
          <div class="relative h-[400px] bg-slate-100 rounded-lg overflow-hidden border-8 border-white shadow-2xl">
            <div class="absolute inset-0 bg-gradient-to-tr from-[var(--main-color)]/20 to-transparent"></div>
            </div>
          <div>
            <span class="text-[var(--main-color)] font-black text-sm tracking-[0.3em] uppercase mb-4 block">Concept</span>
            <h3 class="text-4xl font-bold mb-8 text-[var(--main-dark)]">誠実さとスピードで、<br/>一歩先の価値を。</h3>
            <p class="text-lg leading-loose text-[var(--text-light)] mb-6">1990年の創業以来、私たちは一貫してお客様の課題解決に向き合ってきました。変化の激しい現代において、変わらない誠実さと、止まらない技術革新で、お客様の期待を超える最高のパートナーであり続けます。</p>
            <div class="flex items-center gap-4 py-4 border-t border-slate-100">
               <span class="text-3xl font-black text-[var(--main-color)]">35</span>
               <p class="text-sm font-bold text-[var(--text-light)] tracking-tighter leading-tight">Years of<br/>Experience</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="py-28 px-6 bg-[var(--accent-color)] border-y border-slate-200">
        <div class="max-w-7xl mx-auto">
          <div class="text-center mb-16">
            <h3 class="text-3xl font-bold text-[var(--main-dark)] mb-4">私たちの3つの強み</h3>
            <div class="w-16 h-1 bg-[var(--main-color)] mx-auto"></div>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="bg-white p-10 shadow-sm border-b-4 border-[var(--main-color)] group hover:shadow-xl transition-all">
              <div class="text-5xl font-black text-slate-100 mb-6 transition-colors group-hover:text-[var(--main-color)]/10">01</div>
              <h4 class="text-xl font-bold mb-4">確かな実績</h4>
              <p class="text-sm text-[var(--text-light)] leading-relaxed">年間1,000件以上のプロジェクトを完遂。多様な業界で培った知見が、確実な成果を支えます。</p>
            </div>
            <div class="bg-white p-10 shadow-sm border-b-4 border-[var(--main-color)] group hover:shadow-xl transition-all">
              <div class="text-5xl font-black text-slate-100 mb-6 transition-colors group-hover:text-[var(--main-color)]/10">02</div>
              <h4 class="text-xl font-bold mb-4">専門家集団</h4>
              <p class="text-sm text-[var(--text-light)] leading-relaxed">有資格者や各分野のスペシャリストがチームを構成。専門性の高い課題にも、多角的な視点で解決策を提示します。</p>
            </div>
            <div class="bg-white p-10 shadow-sm border-b-4 border-[var(--main-color)] group hover:shadow-xl transition-all">
              <div class="text-5xl font-black text-slate-100 mb-6 transition-colors group-hover:text-[var(--main-color)]/10">03</div>
              <h4 class="text-xl font-bold mb-4">徹底した管理</h4>
              <p class="text-sm text-[var(--text-light)] leading-relaxed">ISO取得済みの厳格な品質・情報管理体制を構築。安定した品質と高いセキュリティをお約束します。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="service" class="py-28 px-6 max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <h3 class="text-3xl font-bold text-[var(--main-dark)] mb-4">事業内容</h3>
          <p class="text-[var(--text-light)]">多岐にわたる専門技術でビジネスを加速させます</p>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="flex items-center p-8 bg-white border border-slate-200 rounded hover:border-[var(--main-color)] transition-all group">
            <div class="w-12 h-12 bg-slate-50 rounded flex items-center justify-center mr-6 group-hover:bg-[var(--main-color)] group-hover:text-white transition-colors italic font-bold">C</div>
            <div class="font-bold text-lg">コンサルティング事業</div>
          </div>
          <div class="flex items-center p-8 bg-white border border-slate-200 rounded hover:border-[var(--main-color)] transition-all group">
            <div class="w-12 h-12 bg-slate-50 rounded flex items-center justify-center mr-6 group-hover:bg-[var(--main-color)] group-hover:text-white transition-colors italic font-bold">S</div>
            <div class="font-bold text-lg">システム開発受託事業</div>
          </div>
          <div class="flex items-center p-8 bg-white border border-slate-200 rounded hover:border-[var(--main-color)] transition-all group">
            <div class="w-12 h-12 bg-slate-50 rounded flex items-center justify-center mr-6 group-hover:bg-[var(--main-color)] group-hover:text-white transition-colors italic font-bold">M</div>
            <div class="font-bold text-lg">保守・運用マネジメント</div>
          </div>
          <div class="flex items-center p-8 bg-white border border-slate-200 rounded hover:border-[var(--main-color)] transition-all group">
            <div class="w-12 h-12 bg-slate-50 rounded flex items-center justify-center mr-6 group-hover:bg-[var(--main-color)] group-hover:text-white transition-colors italic font-bold">A</div>
            <div class="font-bold text-lg">AI・DX推進支援事業</div>
          </div>
        </div>
      </section>

      <section id="company" class="py-28 px-6 bg-slate-900 text-white">
        <div class="max-w-5xl mx-auto">
          <div class="grid md:grid-cols-3 gap-12">
            <div>
              <h3 class="text-3xl font-bold mb-6">Company<br/>Information</h3>
              <p class="text-sm text-slate-400 leading-loose">私たちの組織概要と、これまでの歩み、そして透明性の高い経営体制についてご紹介します。</p>
            </div>
            <div class="md:col-span-2">
              <dl class="divide-y divide-white/10">
                <div class="grid grid-cols-3 py-6">
                  <dt class="text-slate-400 font-bold text-sm uppercase">Representative</dt>
                  <dd class="col-span-2 font-bold">代表取締役 山田 太郎</dd>
                </div>
                <div class="grid grid-cols-3 py-6">
                  <dt class="text-slate-400 font-bold text-sm uppercase">Capital</dt>
                  <dd class="col-span-2 font-bold">5,000万円</dd>
                </div>
                <div class="grid grid-cols-3 py-6">
                  <dt class="text-slate-400 font-bold text-sm uppercase">Employees</dt>
                  <dd class="col-span-2 font-bold">120名（連結・2026年現在）</dd>
                </div>
                <div class="grid grid-cols-3 py-6">
                  <dt class="text-slate-400 font-bold text-sm uppercase">License</dt>
                  <dd class="col-span-2 font-bold text-sm">ISO 9001, ISO 27001取得済み</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="bg-black text-white py-16 text-center border-t border-white/5">
      <div class="font-black text-xl mb-6 tracking-widest uppercase">Corporate Inc.</div>
      <p class="text-[10px] tracking-[0.2em] text-slate-500">&copy; 2026 CORPORATE INC. ALL RIGHTS RESERVED.</p>
    </footer>
  </div>
</div>`
},
  {
  id: 'template-pop',
  name: 'Pop: 元気 & 親しみ',
  tags: ['pop', 'kids', 'event', 'colorful'],
  description: '明るい色使いと丸みのある要素。全セクション対応。',
  html: `<div class="template-root" style="--main-color: #ec4899; --sub-color: #3b82f6; --accent-color: #fef08a; --text-color: #334155; --bg-color: #fffaf0;">
  <div class="min-h-screen font-sans text-[var(--text-color)] bg-[var(--bg-color)] relative overflow-hidden" style="background-image: radial-gradient(var(--accent-color) 1px, transparent 1px); background-size: 30px 30px;">
    
    <header class="p-6 flex justify-center sticky top-0 z-50">
      <div class="bg-white px-8 py-3 rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6">
        <div class="font-black text-[var(--main-color)] text-2xl tracking-tighter uppercase">Pop! <span class="text-[var(--sub-color)]">Shop</span></div>
        <nav class="hidden md:flex gap-4">
          <a href="#concept" class="text-xs font-black uppercase hover:text-[var(--main-color)] transition-colors">About</a>
          <a href="#features" class="text-xs font-black uppercase hover:text-[var(--main-color)] transition-colors">Style</a>
          <a href="#service" class="text-xs font-black uppercase hover:text-[var(--main-color)] transition-colors">Menu</a>
        </nav>
      </div>
    </header>

    <main>
      <section id="top" class="relative py-24 px-4 text-center">
        <div class="max-w-4xl mx-auto">
          <div class="inline-block px-6 py-2 bg-[var(--accent-color)] border-[3px] border-black rounded-full text-sm font-black mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-3">
            HAPPINESS FOR ALL!
          </div>
          <h2 class="text-7xl md:text-[100px] font-black leading-none mb-12">
            <span class="inline-block transform -rotate-2 text-[var(--main-color)] drop-shadow-[4px_4px_0px_#000]">ワクワクを</span><br/>
            <span class="inline-block transform rotate-1 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[var(--main-color)] drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">届けよう！</span>
          </h2>
          
          <div class="flex justify-center items-center gap-6 md:gap-10">
            <div class="w-32 h-32 bg-[var(--main-color)] border-[4px] border-black rounded-full flex items-center justify-center text-white font-black text-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce italic">Fun!</div>
            <div class="w-24 h-24 bg-[var(--sub-color)] border-[4px] border-black rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce delay-150 rotate-12">Joy!</div>
            <div class="hidden md:flex w-28 h-28 bg-orange-400 border-[4px] border-black rounded-[2rem] items-center justify-center text-white font-black text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce delay-300 -rotate-12">Wow!</div>
          </div>
        </div>
      </section>

      <section id="concept" class="py-20 px-6 text-center">
        <div class="relative bg-white p-12 rounded-[3.5rem] border-[4px] border-black shadow-[12px_12px_0px_0px_var(--accent-color)] max-w-2xl mx-auto">
          <div class="absolute -top-6 -left-6 bg-[var(--sub-color)] text-white font-black px-6 py-2 rounded-xl border-[3px] border-black -rotate-6">Our Mind</div>
          <h3 class="text-4xl font-black mb-8 text-[var(--main-color)] tracking-tight">毎日に、ハッピーな色を。</h3>
          <p class="text-xl font-bold leading-relaxed">私たちは、遊び心を忘れないデザインで、あなたの日常をカラフルに塗り替えます。退屈な時間を「最高の思い出」に変える。それが私たちのミッションです！</p>
        </div>
      </section>

      <section id="features" class="py-20 px-6">
        <div class="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          <div class="group relative bg-white p-8 rounded-[2rem] border-[3px] border-black shadow-[8px_8px_0px_0px_var(--main-color)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            <span class="text-6xl mb-6 block transform group-hover:scale-125 transition-transform duration-300">🎨</span>
            <h4 class="text-2xl font-black mb-4">カラフル・パワー</h4>
            <p class="font-bold text-sm text-[var(--text-color)]/70">1,000色以上のパレットから、あなただけの「好き」を見つけ出します。</p>
          </div>
          <div class="group relative bg-white p-8 rounded-[2rem] border-[3px] border-black shadow-[8px_8px_0px_0px_var(--accent-color)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            <span class="text-6xl mb-6 block transform group-hover:rotate-12 transition-transform duration-300">🚀</span>
            <h4 class="text-2xl font-black mb-4">爆速デリバリー</h4>
            <p class="font-bold text-sm text-[var(--text-color)]/70">ワクワクは冷めないうちに！驚きのスピードでアイデアをカタチにします。</p>
          </div>
          <div class="group relative bg-white p-8 rounded-[2rem] border-[3px] border-black shadow-[8px_8px_0px_0px_var(--sub-color)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            <span class="text-6xl mb-6 block transform group-hover:-translate-y-2 transition-transform duration-300">🤝</span>
            <h4 class="text-2xl font-black mb-4">超フレンドリー</h4>
            <p class="font-bold text-sm text-[var(--text-color)]/70">まるで親友のように。あなたの想いに全力で寄り添うチームです！</p>
          </div>
        </div>
      </section>

      <section id="service" class="py-24 px-6 bg-[var(--main-color)] rounded-t-[80px] border-t-[6px] border-black">
        <div class="max-w-4xl mx-auto">
          <h3 class="text-5xl font-black text-white text-center mb-16 italic drop-shadow-[4px_4px_0px_#000]">What We Do</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="bg-[var(--accent-color)] p-10 rounded-[2.5rem] border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-1 hover:rotate-0 transition-transform cursor-default">
              <h4 class="text-3xl font-black mb-4">イベント企画</h4>
              <p class="font-bold opacity-80 leading-relaxed">度肝を抜くようなサプライズから、心温まるパーティーまで。特別な日をプロデュース！</p>
            </div>
            <div class="bg-white p-10 rounded-[2.5rem] border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-1 hover:rotate-0 transition-transform cursor-default">
              <h4 class="text-3xl font-black mb-4 text-[var(--sub-color)]">デザイン制作</h4>
              <p class="font-bold opacity-80 leading-relaxed">ロゴ、WEB、グッズまで。見た瞬間に「最高！」と言いたくなるデザインを作ります。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="works" class="py-32 px-6">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="aspect-square bg-white border-[3px] border-black rounded-[2rem] shadow-[4px_4px_0px_0px_#000] rotate-2"></div>
            <div class="aspect-square bg-[var(--sub-color)] border-[3px] border-black rounded-[2rem] shadow-[4px_4px_0px_0px_#000] -rotate-3"></div>
            <div class="aspect-square bg-orange-400 border-[3px] border-black rounded-[2rem] shadow-[4px_4px_0px_0px_#000] rotate-6"></div>
            <div class="aspect-square bg-[var(--main-color)] border-[3px] border-black rounded-[2rem] shadow-[4px_4px_0px_0px_#000] -rotate-2"></div>
          </div>
        </div>
      </section>

      <section id="company" class="py-24 px-6 text-center">
        <div class="inline-block relative">
          <div class="absolute inset-0 bg-black rounded-3xl translate-x-3 translate-y-3"></div>
          <div class="relative bg-white p-12 rounded-3xl border-[3px] border-black text-left max-w-md">
            <h3 class="text-2xl font-black mb-6 border-b-[4px] border-[var(--accent-color)] inline-block">Shop Info</h3>
            <div class="space-y-4 font-black text-lg">
              <p class="flex justify-between gap-10"><span>なまえ</span><span class="text-[var(--main-color)]">POP!制作所</span></p>
              <p class="flex justify-between gap-10"><span>ばしょ</span><span class="text-[var(--sub-color)] text-right">おもちゃの国<br/>1-2-3-4</span></p>
              <p class="flex justify-between gap-10"><span>でんわ</span><span>03-POP-JOY</span></p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="py-20 text-center bg-white border-t-[6px] border-black">
      <div class="font-black text-[var(--main-color)] text-4xl mb-4 tracking-tighter">POP! SHOP</div>
      <p class="font-black text-sm tracking-widest text-slate-400 uppercase italic">Keep Playing, Keep Smiling!</p>
      <p class="mt-8 font-black text-xs text-slate-300 tracking-widest">&copy; 2026 POP! FACTORY ALL RIGHTS RESERVED.</p>
    </footer>
  </div>
</div>`
},{
  id: 'template-minimal',
  name: 'Minimal: 洗練された余白',
  tags: ['minimal', 'art', 'fashion', 'white'],
  description: '要素を極限まで削ぎ落とし、余白で語るデザイン。',
  html: `<div class="template-root" style="--main-color: #000000; --accent-color: #f8fafc; --text-color: #1a1a1a; --text-light: #64748b; --bg-color: #ffffff;">
  <div class="min-h-screen font-sans text-[var(--text-color)] bg-[var(--bg-color)] selection:bg-black selection:text-white">
    
    <header class="sticky top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
      <div class="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center">
        <h1 class="text-lg font-bold tracking-[0.4em] uppercase">Mnml</h1>
        <nav class="hidden md:flex items-center gap-10 text-[11px] font-bold tracking-[0.2em] uppercase">
          <a href="#concept" class="hover:text-gray-400 transition-colors">Concept</a>
          <a href="#features" class="hover:text-gray-400 transition-colors">Method</a>
          <a href="#service" class="hover:text-gray-400 transition-colors">Pricing</a>
          <a href="#contact" class="px-5 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all">Contact</a>
        </nav>
      </div>
    </header>

    <main>
      <section id="top" class="py-32 md:py-48 px-8 max-w-7xl mx-auto">
        <div class="max-w-3xl">
          <h2 class="text-5xl md:text-7xl font-light tracking-tight leading-tight mb-12">
            Less <span class="italic font-serif">is</span> more.<br/>
            本質を、デザインする。
          </h2>
          <p class="text-lg text-[var(--text-light)] leading-relaxed mb-16 max-w-xl">
            私たちは、情報の洪水の中から本当に価値のあるものだけを抽出し、研ぎ澄まされた形へと昇華させます。
          </p>
          <div class="flex items-center gap-4">
            <div class="h-px w-20 bg-black"></div>
            <span class="text-xs font-bold tracking-[0.3em] uppercase">Est. 2026 Tokyo</span>
          </div>
        </div>
      </section>

      <section id="concept" class="py-32 px-8 bg-[var(--accent-color)]">
        <div class="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div class="text-sm leading-[2.2] tracking-widest text-[var(--text-color)]">
            <h3 class="text-xs font-bold mb-10 tracking-[0.4em] uppercase text-[var(--text-light)]">Philosophy</h3>
            <p class="text-xl font-light">
              装飾は最小限に。メッセージは最大限に。<br/>
              無駄を削ぎ落とすプロセスこそが、<br/>
              ブランドの輪郭を最も鮮明に描き出します。
            </p>
          </div>
          <div class="aspect-video bg-white shadow-sm border border-slate-100 rounded-sm"></div>
        </div>
      </section>

      <section id="features" class="py-32 px-8 max-w-7xl mx-auto">
        <div class="grid md:grid-cols-3 gap-12">
          <div class="border-t border-black pt-8">
            <h4 class="text-xs font-bold mb-6 tracking-[0.2em] uppercase">01. Identity</h4>
            <p class="text-[13px] leading-relaxed text-[var(--text-light)]">
              トレンドに左右されない、普遍的なアイデンティティを追求します。
            </p>
          </div>
          <div class="border-t border-black pt-8">
            <h4 class="text-xs font-bold mb-6 tracking-[0.2em] uppercase">02. Space</h4>
            <p class="text-[13px] leading-relaxed text-[var(--text-light)]">
              適切な余白を設計し、ユーザーの視線と直感に寄り添う構成を構築します。
            </p>
          </div>
          <div class="border-t border-black pt-8">
            <h4 class="text-xs font-bold mb-6 tracking-[0.2em] uppercase">03. Quality</h4>
            <p class="text-[13px] leading-relaxed text-[var(--text-light)]">
              1pxのズレも許さない緻密な実装で、デジタル上の体験を磨き上げます。
            </p>
          </div>
        </div>
      </section>

      <section id="service" class="py-32 px-8 bg-black text-white">
        <div class="max-w-4xl mx-auto">
          <h3 class="text-center text-xs tracking-[0.5em] uppercase mb-20 opacity-50">Service Plan</h3>
          <div class="divide-y divide-white/20">
            <div class="py-10 flex justify-between items-center group cursor-pointer">
              <span class="text-xl font-light tracking-widest group-hover:pl-4 transition-all uppercase">Design Consulting</span>
              <span class="text-sm font-bold tracking-widest">¥500,000 —</span>
            </div>
            <div class="py-10 flex justify-between items-center group cursor-pointer">
              <span class="text-xl font-light tracking-widest group-hover:pl-4 transition-all uppercase">Full Identity System</span>
              <span class="text-sm font-bold tracking-widest">¥1,200,000 —</span>
            </div>
          </div>
        </div>
      </section>

      <section id="works" class="py-32 px-8 max-w-7xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="group">
            <div class="aspect-square bg-slate-100 overflow-hidden relative border border-slate-100">
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
            </div>
            <p class="mt-4 text-[10px] tracking-widest uppercase font-bold text-gray-400 italic">2026 / Visual Study</p>
          </div>
          <div class="group">
            <div class="aspect-square bg-slate-100 overflow-hidden relative border border-slate-100">
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
            </div>
            <p class="mt-4 text-[10px] tracking-widest uppercase font-bold text-gray-400 italic">2026 / Architecture</p>
          </div>
        </div>
      </section>

      <section id="company" class="py-32 px-8 border-t border-slate-100 max-w-7xl mx-auto">
        <div class="grid md:grid-cols-2 gap-12 text-sm tracking-widest">
          <div>
            <p class="mb-4 text-xs font-bold uppercase opacity-40">Office</p>
            <p class="leading-loose">〒150-0001<br/>東京都渋谷区神宮前 1-2-3<br/>MNML STUDIO</p>
          </div>
          <div class="md:text-right">
            <p class="mb-4 text-xs font-bold uppercase opacity-40">Contact</p>
            <p class="leading-loose">info@mnml.jp<br/>03-1234-5678</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="py-20 text-center border-t border-slate-100">
      <p class="text-[10px] font-bold tracking-[0.4em] uppercase text-slate-300">© MMXXVI MNML ALL RIGHTS RESERVED.</p>
    </footer>
  </div>
</div>`
},{
  id: 'template-dark',
  name: 'Dark: テック & クール',
  tags: ['dark', 'tech', 'night', 'cool'],
  description: '黒を基調とした、先進的なダークモード。',
  html: `<div class="template-root" style="--main-color: #06b6d4; --sub-color: #0891b2; --accent-color: #0f172a; --text-color: #e2e8f0; --bg-color: #020617;">
  <div class="min-h-screen font-mono text-[var(--text-color)] bg-[var(--bg-color)] relative selection:bg-[var(--main-color)] selection:text-black">
    
    <div class="absolute inset-0 pointer-events-none z-[100]" style="background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02)); background-size: 100% 4px, 3px 100%;"></div>

    <header class="p-6 border-b border-[var(--main-color)]/30 flex justify-between bg-black/80 backdrop-blur-md sticky top-0 z-50">
      <div class="flex items-center gap-4">
        <div class="w-3 h-3 bg-[var(--main-color)] rounded-full animate-pulse shadow-[0_0_10px_var(--main-color)]"></div>
        <span class="font-black tracking-tighter text-xl">DEV<span class="text-[var(--main-color)]">.IO</span></span>
      </div>
      <nav class="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.2em] items-center">
        <a href="#concept" class="hover:text-[var(--main-color)] transition-colors">/Concept</a>
        <a href="#features" class="hover:text-[var(--main-color)] transition-colors">/Specs</a>
        <a href="#service" class="hover:text-[var(--main-color)] transition-colors">/Core</a>
        <div class="px-3 py-1 border border-red-500/50 text-red-500 text-[8px] animate-pulse">System: Stable</div>
      </nav>
    </header>

    <main>
      <section id="top" class="relative py-40 px-6 max-w-6xl mx-auto overflow-hidden">
        <div class="absolute -top-20 -left-20 w-96 h-96 bg-[var(--main-color)]/10 blur-[120px] rounded-full"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-6">
            <span class="bg-[var(--main-color)]/20 text-[var(--main-color)] text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest border border-[var(--main-color)]/40">Initialize... Success</span>
            <span class="text-slate-600 text-[10px]">v4.02.26</span>
          </div>
          <h2 class="text-6xl md:text-8xl font-black mb-10 leading-none">
            FUTURE<br/>
            <span class="text-transparent" style="-webkit-text-stroke: 1px var(--main-color); filter: drop-shadow(0 0 5px var(--main-color));">PROTOCOL</span>
          </h2>
          <p class="text-slate-400 max-w-xl text-lg mb-12 border-l-2 border-slate-700 pl-6">
            最先端の量子アルゴリズムと、洗練されたアーキテクチャで、<br/>
            デジタル領域の限界を再定義する。
          </p>
          <button class="group relative px-8 py-4 bg-transparent border border-[var(--main-color)] text-[var(--main-color)] uppercase text-xs tracking-[0.3em] overflow-hidden hover:text-black transition-colors duration-300">
            <span class="relative z-10">Connect Terminal</span>
            <div class="absolute inset-0 bg-[var(--main-color)] translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </section>

      <section id="concept" class="py-24 px-6 bg-slate-900/50 border-y border-slate-800 relative">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-end mb-12">
            <h3 class="text-[var(--main-color)] text-xs tracking-[0.5em] uppercase">Core Mission</h3>
            <span class="text-slate-700 text-[8px]">0x001A_44B</span>
          </div>
          <p class="text-3xl md:text-5xl font-bold leading-tight italic">
            「不可能を<span class="text-[var(--main-color)] shadow-[0_0_15px_rgba(6,182,212,0.5)]">コード</span>で解決する」
          </p>
          <div class="mt-12 flex gap-1">
            <div class="w-12 h-1 bg-[var(--main-color)]"></div>
            <div class="w-4 h-1 bg-slate-700"></div>
            <div class="w-2 h-1 bg-slate-700"></div>
          </div>
        </div>
      </section>

      <section id="features" class="py-32 px-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div class="group p-10 border border-slate-800 bg-black/60 relative hover:border-[var(--main-color)] transition-all overflow-hidden">
            <div class="absolute top-0 right-0 p-2 text-[8px] text-slate-700 uppercase group-hover:text-[var(--main-color)] transition-colors">M_01</div>
            <h4 class="text-xl font-bold mb-4 text-white group-hover:text-[var(--main-color)] transition-colors">Fast Execution</h4>
            <p class="text-xs text-slate-500 leading-relaxed mb-6">極限まで最適化されたランタイムにより、ミリ秒単位のレスポンスを実現。</p>
            <div class="w-full h-0.5 bg-slate-800 group-hover:bg-[var(--main-color)] transition-all"></div>
          </div>
          <div class="group p-10 border border-slate-800 bg-black/60 relative hover:border-[var(--main-color)] transition-all overflow-hidden">
            <div class="absolute top-0 right-0 p-2 text-[8px] text-slate-700 uppercase group-hover:text-[var(--main-color)] transition-colors">M_02</div>
            <h4 class="text-xl font-bold mb-4 text-white group-hover:text-[var(--main-color)] transition-colors">Encrypted</h4>
            <p class="text-xs text-slate-500 leading-relaxed mb-6">ゼロトラスト原則に基づく、軍用レベルの暗号化プロトコルを標準装備。</p>
            <div class="w-full h-0.5 bg-slate-800 group-hover:bg-[var(--main-color)] transition-all"></div>
          </div>
          <div class="group p-10 border border-slate-800 bg-black/60 relative hover:border-[var(--main-color)] transition-all overflow-hidden">
            <div class="absolute top-0 right-0 p-2 text-[8px] text-slate-700 uppercase group-hover:text-[var(--main-color)] transition-colors">M_03</div>
            <h4 class="text-xl font-bold mb-4 text-white group-hover:text-[var(--main-color)] transition-colors">Scalability</h4>
            <p class="text-xs text-slate-500 leading-relaxed mb-6">数百万の同時接続に耐えうる、自律分散型のスケーリング機構。</p>
            <div class="w-full h-0.5 bg-slate-800 group-hover:bg-[var(--main-color)] transition-all"></div>
          </div>
        </div>
      </section>

      <section id="service" class="py-24 px-6 bg-slate-900/30">
        <div class="max-w-4xl mx-auto">
          <div class="border border-slate-800 p-8 bg-black/40">
            <h3 class="text-xs mb-8 tracking-[0.4em] text-slate-500 uppercase">Available Protocols</h3>
            <div class="space-y-4">
              <div class="flex justify-between items-center p-5 border-l-2 border-[var(--main-color)] bg-slate-800/20 group hover:bg-[var(--main-color)]/5 transition-colors">
                <div class="flex items-center gap-4">
                  <span class="text-xs text-slate-600">01</span>
                  <span class="text-sm font-bold tracking-widest uppercase">Cloud Architecture</span>
                </div>
                <span class="text-[10px] text-[var(--main-color)] animate-pulse font-bold tracking-widest">[ READY ]</span>
              </div>
              <div class="flex justify-between items-center p-5 border-l-2 border-slate-700 bg-slate-800/10 group hover:bg-[var(--main-color)]/5 transition-colors">
                <div class="flex items-center gap-4">
                  <span class="text-xs text-slate-600">02</span>
                  <span class="text-sm font-bold tracking-widest uppercase">Neural Net Interface</span>
                </div>
                <span class="text-[10px] text-slate-600 font-bold tracking-widest">[ STANDBY ]</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="works" class="py-32 px-6">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="aspect-video bg-slate-800/50 border border-slate-700 group relative cursor-crosshair">
              <div class="absolute inset-0 bg-[var(--main-color)]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="absolute bottom-2 left-2 text-[8px] text-slate-600 uppercase">Archive_01</div>
            </div>
            <div class="aspect-video bg-slate-900/50 border border-slate-700 group relative cursor-crosshair">
              <div class="absolute inset-0 bg-[var(--main-color)]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="absolute bottom-2 left-2 text-[8px] text-slate-600 uppercase">Archive_02</div>
            </div>
            <div class="aspect-video bg-slate-800/50 border border-slate-700 group relative cursor-crosshair">
              <div class="absolute inset-0 bg-[var(--main-color)]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="absolute bottom-2 left-2 text-[8px] text-slate-600 uppercase">Archive_03</div>
            </div>
            <div class="aspect-video bg-slate-900/50 border border-slate-700 group relative cursor-crosshair">
              <div class="absolute inset-0 bg-[var(--main-color)]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="absolute bottom-2 left-2 text-[8px] text-slate-600 uppercase">Archive_04</div>
            </div>
          </div>
        </div>
      </section>

      <section id="company" class="py-24 px-6 border-t border-slate-800/50">
        <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 text-[11px] tracking-widest">
          <div class="space-y-6">
            <p class="text-slate-600 uppercase">// Location_Data</p>
            <div class="p-6 bg-slate-900/50 border-r-2 border-red-500/50">
               <p class="text-white">SHIBUYA_QUARTER_X</p>
               <p class="text-slate-500 mt-2 italic">Latitude: 35.6580° N, Longitude: 139.7016° E</p>
            </div>
          </div>
          <div class="space-y-6">
            <p class="text-slate-600 uppercase">// Contact_Channel</p>
            <div class="p-6 bg-slate-900/50 border-r-2 border-[var(--main-color)]/50">
               <p class="text-white">ENCRYPTED_LINE: 03-XXXX-XXXX</p>
               <p class="text-slate-500 mt-2 italic">Signal_Strength: Optimal</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="py-16 border-t border-slate-900 bg-black text-center">
      <div class="mb-4 text-[var(--main-color)] opacity-50 text-[10px] animate-pulse">■ CONNECTION_ACTIVE</div>
      <p class="text-[9px] text-slate-600 tracking-[0.4em] uppercase">
        TERMINAL_END. (C) 2026 DEV.IO - ALL SYSTEMS OPERATIONAL
      </p>
    </footer>
  </div>
</div>`
},
  {
    id: 'template-natural',
    name: 'Natural: オーガニック',
    tags: ['natural', 'cafe', 'food', 'green'],
    description: 'アースカラーと柔らかい雰囲気で、自然や健康志向をアピール。',
    html: `<div class="template-root" style="--main-color: #8B9D8B; --sub-color: #a7b4a7; --accent-color: #4A5D4A; --bg-color: #F7F5F0; --text-color: #5A5A5A; --white: #ffffff;">
  <div class="min-h-screen font-sans text-[var(--text-color)] bg-[var(--bg-color)]">
    
    <header class="p-8 flex justify-between items-center max-w-7xl mx-auto">
      <div class="font-serif text-xl tracking-widest text-[var(--accent-color)] font-bold">Organic <span class="font-light">Life</span></div>
      <nav class="hidden md:flex gap-8 text-xs uppercase tracking-[0.2em] font-medium">
        <a href="#concept" class="hover:text-[var(--main-color)] transition-colors">Story</a>
        <a href="#features" class="hover:text-[var(--main-color)] transition-colors">Quality</a>
        <a href="#service" class="hover:text-[var(--main-color)] transition-colors">Menu</a>
      </nav>
    </header>

    <main>
      <section id="top" class="py-12 px-6 text-center">
        <div class="max-w-4xl mx-auto">
          <div class="relative mb-16 px-4">
            <div class="rounded-t-[200px] rounded-b-[20px] overflow-hidden shadow-2xl shadow-[var(--main-color)]/10 aspect-[4/5] md:aspect-[16/9] max-h-[500px]">
              <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-[2000ms]">
            </div>
            <div class="absolute -bottom-6 -right-2 md:right-10 bg-[var(--main-color)] text-white p-8 rounded-full w-24 h-24 flex items-center justify-center text-[10px] leading-tight tracking-widest font-bold rotate-12">
              NATURAL<br/>FIRST
            </div>
          </div>
          <h2 class="font-serif text-4xl md:text-5xl text-[var(--accent-color)] leading-snug mb-8 tracking-tight">
            自然の恵みを、<br class="md:hidden"/>そのままに。
          </h2>
          <p class="text-sm md:text-base tracking-[0.1em] leading-loose max-w-xl mx-auto opacity-80">
            心と体に優しい、オーガニックな暮らし。<br/>
            日々の忙しさを忘れ、自分を慈しむ時間をご提案します。
          </p>
        </div>
      </section>

      <section id="concept" class="py-24 px-6">
        <div class="max-w-3xl mx-auto bg-white/60 p-12 md:p-20 rounded-[40px] border border-white text-center shadow-sm">
          <span class="text-[var(--main-color)] text-xs tracking-[0.4em] uppercase font-bold mb-6 block">Concept</span>
          <h3 class="font-serif text-2xl md:text-3xl text-[var(--accent-color)] mb-10 leading-relaxed">地球と調和する、<br/>素材本来の力。</h3>
          <p class="leading-[2.2] text-sm md:text-base">
            私たちが大切にしているのは、素材本来の力です。<br/>
            余計なものを削ぎ落とし、地球のサイクルと<br/>
            一歩ずつ歩幅を合わせるようなライフスタイルを。<br/>
            あなたの毎日に、小さな「心地よさ」を届けます。
          </p>
          <div class="mt-12 flex justify-center gap-2">
            <span class="w-1.5 h-1.5 bg-[var(--sub-color)] rounded-full"></span>
            <span class="w-1.5 h-1.5 bg-[var(--sub-color)] rounded-full opacity-40"></span>
            <span class="w-1.5 h-1.5 bg-[var(--sub-color)] rounded-full opacity-20"></span>
          </div>
        </div>
      </section>

      <section id="features" class="py-24 px-6 max-w-6xl mx-auto">
        <div class="grid md:grid-cols-3 gap-12 md:gap-8">
          <div class="text-center group">
            <div class="w-16 h-16 bg-[var(--main-color)]/10 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-[var(--main-color)]/20 transition-colors">
              <span class="text-2xl italic font-serif text-[var(--accent-color)]">01</span>
            </div>
            <h4 class="font-serif text-xl mb-4 text-[var(--accent-color)]">厳選素材</h4>
            <p class="text-xs leading-[2.2] px-4 opacity-80">独自の厳しい基準で選ばれた、国内の有機契約農家直送の素材のみを使用しています。</p>
          </div>
          <div class="text-center group">
            <div class="w-16 h-16 bg-[var(--main-color)]/10 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-[var(--main-color)]/20 transition-colors">
              <span class="text-2xl italic font-serif text-[var(--accent-color)]">02</span>
            </div>
            <h4 class="font-serif text-xl mb-4 text-[var(--accent-color)]">環境配慮</h4>
            <p class="text-xs leading-[2.2] px-4 opacity-80">生分解性のパッケージや再生紙を使用し、地球への負担を最小限に抑えています。</p>
          </div>
          <div class="text-center group">
            <div class="w-16 h-16 bg-[var(--main-color)]/10 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-[var(--main-color)]/20 transition-colors">
              <span class="text-2xl italic font-serif text-[var(--accent-color)]">03</span>
            </div>
            <h4 class="font-serif text-xl mb-4 text-[var(--accent-color)]">手仕事</h4>
            <p class="text-xs leading-[2.2] px-4 opacity-80">効率よりも質を。一つひとつ丁寧に、職人が想いを込めて作り上げています。</p>
          </div>
        </div>
      </section>

      <section id="service" class="py-24 px-6 bg-[var(--main-color)]/5">
        <div class="max-w-2xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="font-serif text-3xl text-[var(--accent-color)]">Main Menu</h2>
            <p class="text-[10px] tracking-[0.3em] uppercase mt-2 opacity-50">Seasonal Selection</p>
          </div>
          <div class="bg-white p-8 md:p-12 rounded-[30px] shadow-sm">
            <ul class="space-y-8">
              <li class="flex justify-between items-baseline border-b border-dotted border-gray-200 pb-4">
                <div>
                  <span class="font-bold text-[var(--accent-color)] block">季節の野菜セット</span>
                  <span class="text-[10px] opacity-60">旬の有機野菜 8〜10種</span>
                </div>
                <span class="font-serif text-lg italic text-[var(--main-color)]">¥3,500</span>
              </li>
              <li class="flex justify-between items-baseline border-b border-dotted border-gray-200 pb-4">
                <div>
                  <span class="font-bold text-[var(--accent-color)] block">オーガニックティー</span>
                  <span class="text-[10px] opacity-60">手摘み・天日干し 10パック</span>
                </div>
                <span class="font-serif text-lg italic text-[var(--main-color)]">¥1,200</span>
              </li>
              <li class="flex justify-between items-baseline border-b border-dotted border-gray-200 pb-4">
                <div>
                  <span class="font-bold text-[var(--accent-color)] block">自家製ジャム</span>
                  <span class="text-[10px] opacity-60">無添加・砂糖不使用 200g</span>
                </div>
                <span class="font-serif text-lg italic text-[var(--main-color)]">¥950</span>
              </li>
            </ul>
            <div class="mt-12 text-center">
              <button class="px-10 py-4 bg-[var(--main-color)] text-white text-xs font-bold tracking-[0.2em] rounded-full hover:bg-[var(--accent-color)] transition-all shadow-lg shadow-[var(--main-color)]/20 uppercase">View All Menu</button>
            </div>
          </div>
        </div>
      </section>

      <section id="gallery" class="py-24 px-6 max-w-6xl mx-auto">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div class="aspect-square bg-white rounded-2xl overflow-hidden border-8 border-white shadow-sm rotate-1">
             <div class="w-full h-full bg-slate-200"></div>
          </div>
          <div class="aspect-square bg-white rounded-2xl overflow-hidden border-8 border-white shadow-sm -rotate-2 mt-4 md:mt-0">
             <div class="w-full h-full bg-slate-100"></div>
          </div>
          <div class="aspect-square bg-white rounded-2xl overflow-hidden border-8 border-white shadow-sm rotate-3 hidden md:block">
             <div class="w-full h-full bg-slate-200"></div>
          </div>
        </div>
      </section>

      <section id="company" class="py-24 px-6 border-t border-[var(--main-color)]/10">
        <div class="max-w-3xl mx-auto">
          <div class="flex flex-col md:flex-row justify-between items-start gap-12">
            <div class="max-w-xs">
              <h3 class="font-serif text-2xl text-[var(--accent-color)] mb-4">Store Info</h3>
              <p class="text-sm leading-relaxed opacity-70">都会の喧騒から少し離れた、静かな路地裏に私たちの小さな拠点はあります。お散歩のついでに、ぜひお立ち寄りください。</p>
            </div>
            <div class="w-full md:w-auto">
              <table class="w-full text-sm">
                <tr class="border-b border-gray-100"><th class="py-4 pr-12 text-left font-bold text-[var(--accent-color)]">店名</th><td class="py-4">Organic Life</td></tr>
                <tr class="border-b border-gray-100"><th class="py-4 pr-12 text-left font-bold text-[var(--accent-color)]">住所</th><td class="py-4">東京都自然区緑町 1-2-3</td></tr>
                <tr class="border-b border-gray-100"><th class="py-4 pr-12 text-left font-bold text-[var(--accent-color)]">営業時間</th><td class="py-4">11:00 - 18:00 (Tue - Sun)</td></tr>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="py-12 bg-white text-center">
      <div class="font-serif text-lg tracking-widest text-[var(--accent-color)] opacity-50 mb-4">Organic Life</div>
      <p class="text-[10px] tracking-[0.1em] opacity-40">&copy; 2026 ORGANIC LIFE. PRESERVING NATURE'S GIFT.</p>
    </footer>
  </div>
</div>`
  },
  {
    id: 'template-japanese',
    name: 'Japanese: 和の伝統',
    tags: ['japanese', 'traditional', 'restaurant', 'culture'],
    description: '縦書きや和柄を取り入れた、落ち着きのある和風デザイン。',
    html: `<div class="template-root" style="--main-color: #722F37; --accent-color: #2C2C2C; --bg-color: #F9F8F6; --text-color: #1a1a1a; --border-color: #d1d1d1;">
  <div class="min-h-screen font-serif text-[var(--text-color)] bg-[var(--bg-color)] relative" style="background-image: url('https://www.transparenttextures.com/patterns/washi.png');">
    
    <header class="p-10 flex justify-between items-start sticky top-0 z-50 pointer-events-none">
      <div class="bg-[var(--main-color)] text-white p-4 writing-vertical-rl text-lg tracking-[0.3em] font-bold pointer-events-auto">
        和風建築工房
      </div>
      <nav class="hidden md:flex flex-col gap-8 text-xs tracking-[0.4em] font-bold pointer-events-auto text-right">
        <a href="#concept" class="hover:text-[var(--main-color)] transition-colors">想い</a>
        <a href="#features" class="hover:text-[var(--main-color)] transition-colors">特徴</a>
        <a href="#service" class="hover:text-[var(--main-color)] transition-colors">品書</a>
      </nav>
    </header>

    <main>
      <section id="top" class="min-h-screen flex items-center justify-center px-6 relative">
        <div class="absolute right-10 md:right-20 top-1/4 h-32 w-px bg-[var(--main-color)]"></div>
        <div class="relative">
          <h2 class="writing-vertical-rl text-5xl md:text-7xl leading-relaxed tracking-[0.4em] font-bold">
            和の伝統と<br/>
            <span class="text-[var(--main-color)]">革新</span>の融合。
          </h2>
          <p class="absolute -left-12 bottom-0 text-[10px] tracking-[0.5em] uppercase opacity-40 rotate-180 writing-vertical-rl">Tradition & Innovation</p>
        </div>
      </section>

      <section id="concept" class="py-32 px-6 max-w-5xl mx-auto">
        <div class="flex flex-col md:flex-row-reverse items-center justify-between gap-16">
          <div class="relative">
             <div class="w-64 md:w-80 aspect-[3/4] bg-slate-200 border-[12px] border-white shadow-xl relative z-10"></div>
             <div class="absolute -top-6 -left-6 w-full h-full border border-[var(--main-color)]/20 z-0"></div>
          </div>
          <div class="flex gap-10">
            <h3 class="writing-vertical-rl text-2xl font-bold border-r border-[var(--main-color)] pr-6 tracking-[0.3em]">
              心安らぐ、<br/>木の住まい。
            </h3>
            <p class="writing-vertical-rl text-sm leading-[3] tracking-widest h-[400px]">
              四季の移ろいを愛で、心安らぐ空間を。<br/>
              私たちは伝統的な建築技術を頑なに守りつつ、<br/>
              現代の暮らしに寄り添う住まいをご提案します。<br/>
              百年の時を耐えうる、真の価値をここに。
            </p>
          </div>
        </div>
      </section>

      <section id="features" class="py-32 px-6 bg-[var(--accent-color)] text-white relative">
        <div class="max-w-6xl mx-auto">
          <div class="flex items-center gap-6 mb-20">
            <div class="w-12 h-px bg-[var(--main-color)]"></div>
            <h3 class="text-xl tracking-[0.5em] font-bold uppercase">特徴 / Strength</h3>
          </div>
          <div class="grid md:grid-cols-3 gap-12">
            <div class="border border-white/20 p-10 hover:border-[var(--main-color)] transition-colors relative group">
              <span class="absolute top-4 left-4 text-[10px] text-[var(--main-color)] font-bold">一</span>
              <h4 class="text-lg font-bold mb-6 text-center tracking-[0.2em]">天然木材</h4>
              <p class="text-xs leading-loose opacity-70">選び抜かれた国産材のみを使用。木の呼吸を感じる、健やかな住空間を実現します。</p>
            </div>
            <div class="border border-white/20 p-10 hover:border-[var(--main-color)] transition-colors relative group">
              <span class="absolute top-4 left-4 text-[10px] text-[var(--main-color)] font-bold">二</span>
              <h4 class="text-lg font-bold mb-6 text-center tracking-[0.2em]">匠の技</h4>
              <p class="text-xs leading-loose opacity-70">熟練の職人による繊細な仕上げ。継手、仕口、細部に至るまで妥協なき技を注ぎます。</p>
            </div>
            <div class="border border-white/20 p-10 hover:border-[var(--main-color)] transition-colors relative group">
              <span class="absolute top-4 left-4 text-[10px] text-[var(--main-color)] font-bold">三</span>
              <h4 class="text-lg font-bold mb-6 text-center tracking-[0.2em]">持続性</h4>
              <p class="text-xs leading-loose opacity-70">三世代にわたって住み継げる強度。日本の風土に適した、堅牢な構造体を構築します。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="service" class="py-32 px-6 max-w-3xl mx-auto">
        <div class="border-2 border-[var(--accent-color)] p-1 md:p-2">
          <div class="border border-[var(--accent-color)] p-10 md:p-16">
            <h3 class="text-center font-bold text-2xl tracking-[0.5em] mb-16 underline underline-offset-8 decoration-[var(--main-color)]">御品書き</h3>
            <div class="space-y-12">
              <div class="flex justify-between items-end border-b border-dashed border-[var(--border-color)] pb-4">
                <span class="text-lg font-bold tracking-widest">注文住宅設計</span>
                <span class="text-sm opacity-60 font-sans">伍、〇〇〇万円〜</span>
              </div>
              <div class="flex justify-between items-end border-b border-dashed border-[var(--border-color)] pb-4">
                <span class="text-lg font-bold tracking-widest">古民家再生事業</span>
                <span class="text-sm opacity-60 font-sans">弐、〇〇〇万円〜</span>
              </div>
              <div class="flex justify-between items-end border-b border-dashed border-[var(--border-color)] pb-4">
                <span class="text-lg font-bold tracking-widest">茶室・庭園造作</span>
                <span class="text-sm opacity-60 font-sans">応相談</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="works" class="py-32 px-6 bg-white/40">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-6xl mx-auto">
          <div class="aspect-video bg-slate-200 relative group overflow-hidden">
            <div class="absolute inset-0 border border-white z-10 m-4"></div>
            </div>
          <div class="aspect-video bg-slate-300 relative group overflow-hidden">
            <div class="absolute inset-0 border border-white z-10 m-4"></div>
            </div>
        </div>
      </section>

      <section id="company" class="py-32 px-6 max-w-4xl mx-auto text-sm">
        <div class="border-t border-b border-[var(--accent-color)] py-12 grid md:grid-cols-3 gap-8">
          <div class="md:col-span-1">
            <h3 class="font-bold text-lg tracking-widest uppercase mb-4">屋号</h3>
            <p class="text-xl">和風建築工房</p>
          </div>
          <div class="md:col-span-2 space-y-4">
            <p class="flex justify-between border-b border-[var(--border-color)] pb-2">
              <span class="opacity-60">所在地</span>
              <span>東京都千代田区和風町一丁目一番地</span>
            </p>
            <p class="flex justify-between border-b border-[var(--border-color)] pb-2">
              <span class="opacity-60">連絡先</span>
              <span class="font-sans">03-1234-5678</span>
            </p>
          </div>
        </div>
      </section>
    </main>

    <footer class="py-20 text-center opacity-40 text-[10px] tracking-[0.5em] uppercase">
      &copy; MMXXVI JAPANESE TRADITION - KOUBOU.
    </footer>
  </div>
</div>`
  },
  {
    id: 'template-portfolio',
    name: 'Portfolio: 作品重視',
    tags: ['portfolio', 'photo', 'creator', 'gallery'],
    description: '画像や作品をグリッド状に配置し、視覚的なインパクトを重視。',
    html: `<div class="template-root" style="--main-color: #000000; --sub-color: #f4f4f4; --accent-color: #666666; --bg-color: #ffffff; --text-color: #1a1a1a;">
  <div class="min-h-screen font-sans text-[var(--text-color)] bg-[var(--bg-color)] selection:bg-black selection:text-white">
    
    <div class="fixed top-10 right-10 z-[100] hidden md:block">
      <a href="#contact" class="w-24 h-24 rounded-full border border-black flex items-center justify-center text-[10px] font-bold tracking-widest uppercase hover:bg-black hover:text-white transition-all duration-500">Contact</a>
    </div>

    <header class="h-screen flex flex-col justify-center px-8 md:px-[10%] relative overflow-hidden">
      <div class="absolute top-10 left-10">
        <span class="text-xs font-bold tracking-[0.5em] uppercase opacity-30 italic">Vol. 2026 / Selected Works</span>
      </div>
      
      <div class="relative z-10">
        <h1 class="text-[18vw] font-[900] leading-[0.85] tracking-tighter uppercase mix-blend-difference">
          Port<br/><span class="ml-[5vw]">folio.</span>
        </h1>
        <div class="mt-12 flex items-center gap-8">
          <div class="h-px w-32 bg-black"></div>
          <p class="text-sm font-bold tracking-[0.3em] uppercase">Visual Designer / Art Director</p>
        </div>
      </div>

      <div class="absolute bottom-10 left-10 text-[10px] tracking-[0.4em] uppercase opacity-20 rotate-90 origin-left">
        Scroll to discover
      </div>
    </header>

    <main>
      <section id="concept" class="py-40 px-8 md:px-[10%] bg-[var(--sub-color)]">
        <div class="max-w-5xl mx-auto">
          <h2 class="text-[10px] font-bold tracking-[0.5em] uppercase text-[var(--accent-color)] mb-12">About</h2>
          <p class="text-3xl md:text-6xl font-bold leading-[1.1] tracking-tight text-balance">
            境界を超え、新しい視点を与えるデザインを。コンセプトからアウトプットまで、一貫した世界観を構築します。
          </p>
        </div>
      </section>

      <section id="features" class="py-32 px-8 md:px-[10%] border-b border-slate-100">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
          <div class="group">
            <span class="text-6xl font-black opacity-5 group-hover:opacity-10 transition-opacity">01</span>
            <h3 class="text-xl font-bold mt-[-1.5rem] mb-4">Strategy</h3>
            <p class="text-sm leading-relaxed text-[var(--accent-color)]">徹底したリサーチに基づき、ブランドが進むべき本質的なルートを策定します。</p>
          </div>
          <div class="group">
            <span class="text-6xl font-black opacity-5 group-hover:opacity-10 transition-opacity">02</span>
            <h3 class="text-xl font-bold mt-[-1.5rem] mb-4">Design</h3>
            <p class="text-sm leading-relaxed text-[var(--accent-color)]">視覚的な美しさと使い心地を高次元で融合させた、独自のビジュアルを提案します。</p>
          </div>
          <div class="group">
            <span class="text-6xl font-black opacity-5 group-hover:opacity-10 transition-opacity">03</span>
            <h3 class="text-xl font-bold mt-[-1.5rem] mb-4">Development</h3>
            <p class="text-sm leading-relaxed text-[var(--accent-color)]">細部までこだわり抜いた実装で、デジタル上の体験に命を吹き込みます。</p>
          </div>
        </div>
      </section>

      <section id="works" class="py-32">
        <div class="px-8 md:px-[10%] mb-16 flex justify-between items-end">
          <h2 class="text-5xl font-[900] uppercase tracking-tighter">Works</h2>
          <span class="text-xs font-bold opacity-30">Featured Projects (06)</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
          <div class="aspect-square bg-slate-100 relative group cursor-pointer overflow-hidden">
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/80 transition-all duration-500 z-10"></div>
            <div class="absolute inset-0 flex flex-col justify-center items-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 p-8">
              <span class="text-[10px] tracking-[0.3em] uppercase mb-4 translate-y-4 group-hover:translate-y-0 transition-transform">Branding</span>
              <h4 class="text-2xl font-bold tracking-tight">Project Name 01</h4>
            </div>
          </div>
          <div class="aspect-square bg-slate-200 relative group cursor-pointer overflow-hidden">
             <div class="absolute inset-0 bg-black/0 group-hover:bg-black/80 transition-all duration-500 z-10"></div>
             <div class="absolute inset-0 flex flex-col justify-center items-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 p-8">
              <span class="text-[10px] tracking-[0.3em] uppercase mb-4 translate-y-4 group-hover:translate-y-0 transition-transform">Digital</span>
              <h4 class="text-2xl font-bold tracking-tight">Project Name 02</h4>
            </div>
          </div>
          <div class="aspect-square bg-slate-100 relative group cursor-pointer overflow-hidden">
             <div class="absolute inset-0 bg-black/0 group-hover:bg-black/80 transition-all duration-500 z-10"></div>
             <div class="absolute inset-0 flex flex-col justify-center items-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 p-8">
              <span class="text-[10px] tracking-[0.3em] uppercase mb-4 translate-y-4 group-hover:translate-y-0 transition-transform">Identity</span>
              <h4 class="text-2xl font-bold tracking-tight">Project Name 03</h4>
            </div>
          </div>
          <div class="aspect-square bg-slate-200 relative group cursor-pointer overflow-hidden">
             <div class="absolute inset-0 bg-black/0 group-hover:bg-black/80 transition-all duration-500 z-10"></div>
             <div class="absolute inset-0 flex flex-col justify-center items-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 p-8">
              <span class="text-[10px] tracking-[0.3em] uppercase mb-4 translate-y-4 group-hover:translate-y-0 transition-transform">Visual</span>
              <h4 class="text-2xl font-bold tracking-tight">Project Name 04</h4>
            </div>
          </div>
          <div class="aspect-square bg-slate-100 relative group cursor-pointer overflow-hidden">
             <div class="absolute inset-0 bg-black/0 group-hover:bg-black/80 transition-all duration-500 z-10"></div>
             <div class="absolute inset-0 flex flex-col justify-center items-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 p-8">
              <span class="text-[10px] tracking-[0.3em] uppercase mb-4 translate-y-4 group-hover:translate-y-0 transition-transform">Motion</span>
              <h4 class="text-2xl font-bold tracking-tight">Project Name 05</h4>
            </div>
          </div>
          <div class="aspect-square bg-slate-200 relative group cursor-pointer overflow-hidden">
             <div class="absolute inset-0 bg-black/0 group-hover:bg-black/80 transition-all duration-500 z-10"></div>
             <div class="absolute inset-0 flex flex-col justify-center items-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 p-8">
              <span class="text-[10px] tracking-[0.3em] uppercase mb-4 translate-y-4 group-hover:translate-y-0 transition-transform">Editorial</span>
              <h4 class="text-2xl font-bold tracking-tight">Project Name 06</h4>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" class="py-48 px-8 md:px-[10%] text-center">
        <h3 class="text-xs font-bold tracking-[0.8em] uppercase opacity-30 mb-12">Get in touch</h3>
        <a href="mailto:hello@portfolio.com" class="text-3xl md:text-7xl font-bold tracking-tighter hover:opacity-50 transition-opacity">hello@portfolio.com</a>
        <div class="mt-24 flex justify-center gap-12 text-[10px] font-bold tracking-widest uppercase">
          <a href="#" class="hover:underline">Instagram</a>
          <a href="#" class="hover:underline">Dribbble</a>
          <a href="#" class="hover:underline">Behance</a>
        </div>
      </section>
    </main>

    <footer class="py-12 px-8 md:px-[10%] flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-100 text-[10px] font-bold tracking-[0.2em] uppercase opacity-30">
      <span>&copy; 2026 Creative Works Portfolio.</span>
      <span>Designed with focus.</span>
    </footer>
  </div>
</div>`
  },
  {
    id: 'template-lp',
    name: 'LP: コンバージョン特化',
    tags: ['lp', 'marketing', 'sales', 'bold'],
    description: '大きな見出しと明確なCTAで、ユーザーのアクションを促す構成。',
    html: `<div class="template-root" style="--main-color: #E63946; --sub-color: #f8fafc; --accent-color: #1D3557; --text-color: #1d3557; --text-light: #475569; --bg-color: #FFFFFF;">
  <div class="min-h-screen font-sans text-[var(--text-color)] bg-[var(--bg-color)] selection:bg-[var(--main-color)] selection:text-white">
    
    <header class="bg-white/90 backdrop-blur-md border-b border-slate-100 py-5 px-8 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <div class="text-2xl font-black tracking-tighter text-[var(--accent-color)]">PRODUCT<span class="text-[var(--main-color)]">X</span></div>
        <nav class="hidden lg:flex gap-8 text-sm font-bold text-[var(--text-light)]">
          <a href="#concept" class="hover:text-[var(--main-color)]">特徴</a>
          <a href="#features" class="hover:text-[var(--main-color)]">選ばれる理由</a>
          <a href="#flow" class="hover:text-[var(--main-color)]">導入の流れ</a>
          <a href="#service" class="hover:text-[var(--main-color)]">料金</a>
        </nav>
        <a href="#cta" class="bg-[var(--main-color)] text-white text-xs font-bold px-8 py-3 rounded-full hover:shadow-lg hover:shadow-red-200 transition-all uppercase tracking-widest">無料相談はこちら</a>
      </div>
    </header>

    <main>
      <section id="top" class="relative pt-32 pb-40 px-6 bg-gradient-to-br from-[var(--accent-color)] to-[#162a45] text-white overflow-hidden">
        <div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div class="text-left">
            <span class="inline-block border border-red-400 text-red-400 text-xs font-bold px-4 py-1 rounded-full mb-8 tracking-[0.2em] uppercase">2026 New Solution</span>
            <h2 class="text-5xl md:text-7xl font-black leading-[1.1] mb-8">
              停滞したビジネスに、<br/><span class="text-[var(--main-color)]">劇的な加速</span>を。
            </h2>
            <p class="text-xl opacity-80 mb-12 leading-relaxed max-w-xl">
              私たちは単なるツール提供者ではありません。あなたのチームの一員として、戦略立案から実行まで、圧倒的なスピードで成果へと導きます。
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
              <a href="#cta" class="px-10 py-5 bg-[var(--main-color)] text-white font-bold text-lg rounded-xl shadow-2xl hover:-translate-y-1 transition-all text-center">資料を無料でダウンロード</a>
              <div class="flex items-center gap-4 px-6 py-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <span class="text-2xl font-black text-red-400">98%</span>
                <span class="text-[10px] leading-tight opacity-70 uppercase tracking-widest">Customer<br/>Satisfaction</span>
              </div>
            </div>
          </div>
          <div class="relative hidden lg:block">
            <div class="aspect-video bg-white/5 rounded-3xl border border-white/10 backdrop-blur-3xl p-4 shadow-2xl">
               <div class="w-full h-full bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
                 <span class="text-white/20 text-xs tracking-[1em] uppercase">Visual Asset Area</span>
               </div>
            </div>
            <div class="absolute -bottom-10 -right-10 w-48 h-48 bg-[var(--main-color)] rounded-full blur-[100px] opacity-20"></div>
          </div>
        </div>
      </section>

      <section id="concept" class="py-32 px-6">
        <div class="max-w-7xl mx-auto">
          <div class="text-center mb-24">
            <h3 class="text-3xl md:text-5xl font-black mb-8">なぜ、あなたのビジネスには<br class="hidden md:block"/>「ProductX」が必要なのか？</h3>
            <div class="h-1.5 w-24 bg-[var(--main-color)] mx-auto mb-8"></div>
            <p class="text-[var(--text-light)] text-lg max-w-3xl mx-auto leading-loose">
              多くの企業が陥る「リソース不足」と「戦略の迷走」。私たちは、これら2つの課題を同時に解決するために、独自のフレームワークを開発しました。
            </p>
          </div>
          <div class="grid md:grid-cols-2 gap-20 items-center">
            <div class="space-y-12">
              <div class="flex gap-6">
                <div class="shrink-0 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold">Q</div>
                <div>
                  <h4 class="text-xl font-bold mb-3">競合他社との差別化が困難</h4>
                  <p class="text-sm text-[var(--text-light)] leading-loose">独自の強みを言語化し、マーケットでの優位性を1ヶ月以内に確立します。市場調査からポジショニング設定までワンストップで対応。</p>
                </div>
              </div>
              <div class="flex gap-6">
                <div class="shrink-0 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold">Q</div>
                <div>
                  <h4 class="text-xl font-bold mb-3">複雑化したオペレーション</h4>
                  <p class="text-sm text-[var(--text-light)] leading-loose">属人化した業務を徹底的にデジタル化。生産性を平均40%向上させ、クリエイティブな仕事に集中できる環境を作ります。</p>
                </div>
              </div>
            </div>
            <div class="bg-slate-900 rounded-[2rem] p-12 text-white relative overflow-hidden">
              <div class="relative z-10">
                <p class="text-red-400 font-bold mb-4">Solution</p>
                <p class="text-2xl leading-relaxed italic mb-8">「分析・戦略・実行。この3要素を、分断させることなく一本の線で繋ぐこと。」</p>
                <p class="text-sm opacity-60">これが、私たちが提供する唯一無二のバリューです。</p>
              </div>
              <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="py-32 px-6 bg-[var(--sub-color)]">
        <div class="max-w-7xl mx-auto">
          <div class="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div class="max-w-2xl text-left">
              <h3 class="text-xs font-bold tracking-[0.4em] uppercase text-[var(--main-color)] mb-4">Core Strengths</h3>
              <p class="text-4xl font-black">圧倒的な成果を支える<br/>3つの柱</p>
            </div>
            <p class="text-[var(--text-light)] max-w-md text-sm leading-loose">
              私たちは表面的な改善は行いません。根源的なデータに基づき、持続可能な成長基盤を構築します。
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 group hover:border-[var(--main-color)] transition-all duration-500">
              <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-red-50 transition-colors">
                <svg class="w-8 h-8 text-[var(--main-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <h4 class="text-2xl font-bold mb-6">業界最速の実行力</h4>
              <p class="text-[var(--text-light)] text-sm leading-loose mb-8">
                構想から検証まで、平均2週間。失敗を恐れず高速でサイクルを回すことで、最短ルートでの正解を見つけ出します。
              </p>
              <ul class="space-y-3 text-xs font-bold text-slate-400">
                <li>・最短3日でプロトタイプ作成</li>
                <li>・リアルタイムフィードバック体制</li>
              </ul>
            </div>
            <div class="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 group hover:border-[var(--main-color)] transition-all duration-500">
              <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-red-50 transition-colors">
                <svg class="w-8 h-8 text-[var(--main-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <h4 class="text-2xl font-bold mb-6">フルスタック支援</h4>
              <p class="text-[var(--text-light)] text-sm leading-loose mb-8">
                デザイン、マーケティング、開発、営業戦略。各領域のスペシャリストがチームを組み、一貫した支援を提供します。
              </p>
              <ul class="space-y-3 text-xs font-bold text-slate-400">
                <li>・全領域を一社で完結</li>
                <li>・シームレスなコミュニケーション</li>
              </ul>
            </div>
            <div class="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 group hover:border-[var(--main-color)] transition-all duration-500">
              <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-red-50 transition-colors">
                <svg class="w-8 h-8 text-[var(--main-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </div>
              <h4 class="text-2xl font-bold mb-6">データドリブン</h4>
              <p class="text-[var(--text-light)] text-sm leading-loose mb-8">
                「勘」に頼らない。独自の解析ツールを用い、ユーザーの行動を可視化。事実に基づいた最適な打ち手を選定します。
              </p>
              <ul class="space-y-3 text-xs font-bold text-slate-400">
                <li>・精度の高いA/Bテスト実行</li>
                <li>・LTVを最大化する導線設計</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="flow" class="py-32 px-6">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-20">
            <h3 class="text-3xl font-black mb-4">導入までの4ステップ</h3>
            <p class="text-slate-400 uppercase tracking-widest text-[10px]">Seamless Onboarding Process</p>
          </div>
          <div class="space-y-4">
            <div class="flex flex-col md:flex-row gap-8 items-start p-10 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
              <div class="text-4xl font-black text-slate-200 italic">01</div>
              <div>
                <h4 class="text-xl font-bold mb-4">ヒアリング・現状分析</h4>
                <p class="text-sm text-[var(--text-light)] leading-loose">まずはオンラインにて貴社のビジネスモデルと現在抱えている課題を詳しく伺います。専門のコンサルタントが指標となる数値を洗い出し、ポテンシャルを可視化します。</p>
              </div>
            </div>
            <div class="flex flex-col md:flex-row gap-8 items-start p-10 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
              <div class="text-4xl font-black text-slate-200 italic">02</div>
              <div>
                <h4 class="text-xl font-bold mb-4">戦略ロードマップの提示</h4>
                <p class="text-sm text-[var(--text-light)] leading-loose">ヒアリング内容に基づき、具体的な解決策とスケジュールを提示します。「何を」「いつまでに」「どれくらいの成果」を出すのかを明確にしたロードマップを作成します。</p>
              </div>
            </div>
            <div class="flex flex-col md:flex-row gap-8 items-start p-10 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
              <div class="text-4xl font-black text-slate-200 italic">03</div>
              <div>
                <h4 class="text-xl font-bold mb-4">実行・プロダクト実装</h4>
                <p class="text-sm text-[var(--text-light)] leading-loose">合意いただいた戦略に沿って、専任チームが実装を開始します。デザインの作成、システム開発、広告運用設定など、必要なリソースをすべて投入します。</p>
              </div>
            </div>
            <div class="flex flex-col md:flex-row gap-8 items-start p-10 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
              <div class="text-4xl font-black text-slate-200 italic">04</div>
              <div>
                <h4 class="text-xl font-bold mb-4">グロース・継続改善</h4>
                <p class="text-sm text-[var(--text-light)] leading-loose">リリースはスタートに過ぎません。実際のユーザーデータを元に、PDCAサイクルを回し続けます。週次でのレポーティングを行い、成果を最大化します。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="service" class="py-32 px-6 bg-slate-900 text-white">
        <div class="max-w-7xl mx-auto">
          <div class="text-center mb-24">
            <h3 class="text-3xl md:text-5xl font-black mb-8">明快な料金体系</h3>
            <p class="text-slate-400 max-w-2xl mx-auto">貴社のフェーズに合わせた3つのプランをご用意しました。<br/>すべてのプランに専任のプロジェクトマネージャーがつきます。</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="p-10 border border-white/10 rounded-3xl flex flex-col">
              <h4 class="text-xl font-bold mb-4">Lite Plan</h4>
              <p class="text-xs text-slate-400 mb-8 font-sans">まず始めてみたい小規模チーム向け</p>
              <div class="flex items-baseline gap-1 mb-10">
                <span class="text-3xl font-black">¥19,800</span>
                <span class="text-slate-500">/月</span>
              </div>
              <ul class="space-y-4 text-sm mb-12 flex-grow">
                <li class="flex items-center gap-3 opacity-60"><svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 基本解析機能</li>
                <li class="flex items-center gap-3 opacity-60"><svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 月次レポート</li>
                <li class="flex items-center gap-3 opacity-30"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg> 専任担当者</li>
              </ul>
              <button class="w-full py-4 border border-white/20 rounded-xl hover:bg-white/5 transition-colors">詳細を見る</button>
            </div>
            <div class="p-10 bg-white text-[var(--accent-color)] rounded-3xl shadow-2xl relative scale-105 z-10">
              <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--main-color)] text-white text-[10px] font-bold px-6 py-1 rounded-full tracking-widest uppercase shadow-xl">Most Recommended</div>
              <h4 class="text-xl font-bold mb-4">Standard Plan</h4>
              <p class="text-xs text-slate-400 mb-8 font-sans">本格的なグロースを目指す企業向け</p>
              <div class="flex items-baseline gap-1 mb-10">
                <span class="text-4xl font-black text-[var(--main-color)]">¥49,800</span>
                <span class="text-slate-500">/月</span>
              </div>
              <ul class="space-y-4 text-sm mb-12 flex-grow">
                <li class="flex items-center gap-3"><svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> すべての解析機能</li>
                <li class="flex items-center gap-3"><svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 週次詳細レポート</li>
                <li class="flex items-center gap-3"><svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 専任担当PMアサイン</li>
                <li class="flex items-center gap-3"><svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 無制限のデータ保存</li>
              </ul>
              <button class="w-full py-5 bg-[var(--accent-color)] text-white font-bold rounded-xl hover:bg-[var(--main-color)] transition-all shadow-xl">このプランで申し込む</button>
            </div>
            <div class="p-10 border border-white/10 rounded-3xl flex flex-col">
              <h4 class="text-xl font-bold mb-4">Enterprise</h4>
              <p class="text-xs text-slate-400 mb-8 font-sans">大規模組織・多角的な支援が必要な場合</p>
              <div class="flex items-baseline gap-1 mb-10">
                <span class="text-3xl font-black">Custom</span>
              </div>
              <ul class="space-y-4 text-sm mb-12 flex-grow">
                <li class="flex items-center gap-3 opacity-80"><svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 24時間365日サポート</li>
                <li class="flex items-center gap-3 opacity-80"><svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 独自のダッシュボード構築</li>
                <li class="flex items-center gap-3 opacity-80"><svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 役員向け戦略コンサルティング</li>
              </ul>
              <button class="w-full py-4 border border-white/20 rounded-xl hover:bg-white/5 transition-colors">お問い合わせ</button>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" class="py-32 px-6 bg-white">
        <div class="max-w-4xl mx-auto">
          <h3 class="text-center text-3xl font-black mb-20">よくあるご質問</h3>
          <div class="divide-y divide-slate-100">
            <div class="py-8">
              <h4 class="text-lg font-bold mb-4 flex gap-4"><span class="text-red-400">Q.</span> 導入までにどれくらいの期間が必要ですか？</h4>
              <p class="text-sm text-[var(--text-light)] leading-loose pl-8">最短でヒアリングから1週間で初期設定が完了し、運用を開始できます。通常は2週間〜1ヶ月程度で本格的なフェーズに移行します。</p>
            </div>
            <div class="py-8">
              <h4 class="text-lg font-bold mb-4 flex gap-4"><span class="text-red-400">Q.</span> 途中でプランの変更は可能ですか？</h4>
              <p class="text-sm text-[var(--text-light)] leading-loose pl-8">はい、月単位でのアップグレード・ダウングレードが可能です。ビジネスの成長スピードに合わせて柔軟に調整いただけます。</p>
            </div>
            <div class="py-8">
              <h4 class="text-lg font-bold mb-4 flex gap-4"><span class="text-red-400">Q.</span> 解約金などは発生しますか？</h4>
              <p class="text-sm text-[var(--text-light)] leading-loose pl-8">いいえ、最低利用期間などの縛りは一切ございません。私たちは成果に自信があるため、不要になったらいつでも停止いただけます。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="cta" class="py-32 px-6 bg-slate-50 border-t border-slate-100">
        <div class="max-w-5xl mx-auto text-center">
          <h3 class="text-4xl md:text-6xl font-black mb-12">次は、あなたの番です。</h3>
          <p class="text-lg text-[var(--text-light)] mb-12">
            現状を維持するか、それとも一気に飛躍するか。<br/>
            まずは無料で、あなたのビジネスの可能性を診断させてください。
          </p>
          <div class="bg-white p-12 rounded-[3rem] shadow-2xl shadow-slate-200 inline-block w-full md:w-auto">
             <div class="flex flex-col md:flex-row items-center gap-8">
                <div class="text-left">
                  <p class="text-xs font-bold text-red-500 mb-2 uppercase tracking-widest">Free Consultation</p>
                  <p class="text-xl font-bold">オンライン相談を予約する</p>
                </div>
                <button class="px-12 py-6 bg-[var(--main-color)] text-white font-bold text-xl rounded-2xl hover:bg-[var(--accent-color)] transition-all shadow-xl shadow-red-200">相談予約フォームへ</button>
             </div>
          </div>
        </div>
      </section>

      <section id="company" class="py-24 px-6 border-t border-slate-100 bg-white">
        <div class="max-w-4xl mx-auto">
          <div class="grid md:grid-cols-2 gap-16">
            <div>
              <h3 class="text-2xl font-black mb-8">運営会社</h3>
              <p class="text-sm leading-loose text-[var(--text-light)] mb-8">
                私たちはテクノロジーとデザインの力で、あらゆるビジネスのボトルネックを解消することを目指すクリエイティブ・エージェンシーです。
              </p>
            </div>
            <div class="bg-slate-50 p-8 rounded-2xl">
              <table class="w-full text-sm">
                <tr class="border-b border-slate-200"><th class="py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Company</th><td class="py-4 text-right">株式会社ProductX</td></tr>
                <tr class="border-b border-slate-200"><th class="py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Location</th><td class="py-4 text-right">東京都港区六本木 1-2-3</td></tr>
                <tr><th class="py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Established</th><td class="py-4 text-right">2018年4月</td></tr>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="py-16 bg-[var(--accent-color)] text-white/40 text-center text-xs tracking-[0.2em] font-bold">
      <div class="mb-8 opacity-100 text-white font-black tracking-tighter text-xl">PRODUCT<span class="text-[var(--main-color)]">X</span></div>
      &copy; 2026 PRODUCTX INC. ALL RIGHTS RESERVED.
    </footer>
  </div>
</div>`
  }
];