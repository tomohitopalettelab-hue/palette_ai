export type Template = {
  id: string;
  name: string;
  tags: string[];
  description: string;
  html: string;
};

export const templates: Template[] = [
  {
    id: 'template-warm',
    name: 'Warm: 温かみと信頼感',
    tags: ['warm', 'gold', 'corporate', 'construction', 'beige', '温かい', '信頼', '柔らかい'],
    description: '暖色系の背景にゴールドアクセント。建設・不動産・専門サービス業に最適な、信頼感と温もりのあるデザイン。',
    html: `<div class="template-root" style="--main-color: #c59500; --main-dark: #9a7500; --accent-color: #FDFBF7; --text-color: #333333; --text-light: #6b7280; --bg-color: #ffffff; --section-gap: 0; --section-padding: 4rem 0;">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Quicksand:wght@600;700&display=swap');
    .template-root { font-family: 'Noto Sans JP', sans-serif; }
    .template-root .font-en { font-family: 'Quicksand', sans-serif; }
    .template-root .bubble-field { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
    .template-root .bubble { position: absolute; border-radius: 9999px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0)); opacity: 0.5; filter: blur(0.5px); animation: warmFloat 16s ease-in-out infinite; }
    .template-root .bubble-warm { background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--main-color) 25%, transparent), transparent); }
    @keyframes warmFloat { 0% { transform: translateY(0px); } 50% { transform: translateY(-18px); } 100% { transform: translateY(0px); } }
  </style>
  <div class="min-h-screen text-[var(--text-color)] bg-[var(--bg-color)]">

    <header class="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 md:px-10 h-20 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-[var(--main-color)] flex items-center justify-center text-white font-black rounded-full text-sm">W</div>
          <div class="font-black text-xl tracking-tight">Company <span class="text-[var(--main-color)] font-bold">Name</span></div>
        </div>
        <nav data-sync="site-pages" class="hidden md:flex items-center gap-6 text-sm font-black tracking-widest">
          <a href="#concept" class="hover:text-[var(--main-color)] transition-colors">コンセプト</a>
          <a href="#features" class="hover:text-[var(--main-color)] transition-colors">強み</a>
          <a href="#service" class="hover:text-[var(--main-color)] transition-colors">事業内容</a>
          <a href="#company" class="bg-[var(--main-color)] text-white px-5 py-2 rounded-full hover:opacity-80 transition-all">お問い合わせ</a>
        </nav>
      </div>
    </header>

    <main>
      <!-- top: ヒーロー -->
      <section id="top" class="relative h-[80vh] min-h-[500px] flex items-center justify-center overflow-hidden bg-gray-900">
        <div class="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000" class="w-full h-full object-cover opacity-30" alt="Hero">
        </div>
        <div class="relative z-10 text-center px-6">
          <h1 class="text-5xl md:text-7xl font-black leading-tight mb-8 text-white">
            お客様の未来を<br><span class="text-[var(--main-color)]">共創</span>する。
          </h1>
          <p class="text-lg md:text-xl font-bold tracking-widest text-white/80">プロフェッショナルな技術と確かな実績で</p>
        </div>
      </section>

      <!-- 数字セクション -->
      <section class="py-14 bg-[var(--accent-color)]">
        <div class="max-w-6xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div>
            <span class="block font-en text-5xl font-bold text-[var(--main-color)] mb-2">500<span class="text-lg">+</span></span>
            <p class="font-bold text-sm">年間実績数</p>
          </div>
          <div>
            <span class="block font-en text-5xl font-bold text-[var(--main-color)] mb-2">98<span class="text-lg">%</span></span>
            <p class="font-bold text-sm">クライアント継続率</p>
          </div>
          <div>
            <span class="block font-en text-5xl font-bold text-[var(--main-color)] mb-2">50<span class="text-lg">名</span></span>
            <p class="font-bold text-sm">在籍スタッフ</p>
          </div>
          <div>
            <span class="block font-en text-5xl font-bold text-[var(--main-color)] mb-2">15<span class="text-lg">年</span></span>
            <p class="font-bold text-sm">業界での信頼実績</p>
          </div>
        </div>
      </section>

      <!-- concept: ミッション・理念 -->
      <section id="concept" class="py-20 bg-[#F4F7F9] overflow-hidden">
        <div class="max-w-6xl mx-auto px-6">
          <div class="grid lg:grid-cols-2 gap-14 items-center">
            <div class="relative">
              <div class="rounded-[60px] rounded-tr-[20px] overflow-hidden aspect-[4/5] shadow-2xl">
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000" class="w-full h-full object-cover" alt="Office">
              </div>
            </div>
            <div class="relative">
              <div class="bubble-field">
                <span class="bubble bubble-warm" style="width:120px;height:120px;left:8%;top:12%;animation-delay:0.6s;"></span>
                <span class="bubble bubble-warm" style="width:90px;height:90px;left:60%;top:8%;animation-delay:1.4s;"></span>
              </div>
              <div class="relative z-10">
                <h2 class="font-en font-bold tracking-widest text-[var(--main-color)] mb-6 text-sm">OUR MISSION</h2>
                <h3 class="text-3xl md:text-4xl font-black mb-6 leading-tight">
                  技術の先に、<br>確かな<span class="text-[var(--main-color)]">安心</span>を届ける。
                </h3>
                <p class="text-[var(--text-light)] leading-loose mb-8">
                  私たちはお客様の課題解決に真摯に向き合い、確かな技術と豊富な実績をもとに、最適なソリューションを提供します。変化の激しい現代において、変わらない誠実さと最先端の技術を融合させ、お客様の期待を超えるパートナーであり続けます。
                </p>
                <div class="grid grid-cols-2 gap-6 border-t border-gray-200 pt-8">
                  <div>
                    <span class="block text-2xl font-en font-black">Quality First</span>
                    <p class="text-xs font-bold text-[var(--text-light)] mt-2">徹底した品質管理体制</p>
                  </div>
                  <div>
                    <span class="block text-2xl font-en font-black">Global Team</span>
                    <p class="text-xs font-bold text-[var(--text-light)] mt-2">多様な視点による最適解</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- features: 強み -->
      <section id="features" class="py-20 bg-white relative overflow-hidden">
        <div class="max-w-6xl mx-auto px-6">
          <div class="text-center mb-16">
            <h2 class="font-en font-bold tracking-widest text-[var(--main-color)] mb-2 text-sm">STRENGTHS</h2>
            <h3 class="text-3xl font-black">私たちの3つの強み</h3>
            <div class="mt-6 w-16 h-1 bg-[var(--main-color)] mx-auto rounded-full"></div>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="bg-[var(--accent-color)] p-10 rounded-[40px] shadow-sm group hover:shadow-xl transition-all text-center">
              <div class="w-20 h-20 bg-[var(--main-color)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--main-color)]/20">
                <span class="text-white font-en font-bold text-xl">01</span>
              </div>
              <h4 class="text-xl font-black mb-4">確かな実績</h4>
              <p class="text-sm text-[var(--text-light)] leading-relaxed">年間500件以上のプロジェクトを完遂。多様な業界で培った知見が、確実な成果を支えます。</p>
            </div>
            <div class="bg-[var(--accent-color)] p-10 rounded-[40px] shadow-sm group hover:shadow-xl transition-all text-center">
              <div class="w-20 h-20 bg-[var(--main-color)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--main-color)]/20">
                <span class="text-white font-en font-bold text-xl">02</span>
              </div>
              <h4 class="text-xl font-black mb-4">専門家集団</h4>
              <p class="text-sm text-[var(--text-light)] leading-relaxed">各分野のスペシャリストがチームを構成。専門性の高い課題にも多角的な視点で解決策を提示します。</p>
            </div>
            <div class="bg-[var(--accent-color)] p-10 rounded-[40px] shadow-sm group hover:shadow-xl transition-all text-center">
              <div class="w-20 h-20 bg-[var(--main-color)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--main-color)]/20">
                <span class="text-white font-en font-bold text-xl">03</span>
              </div>
              <h4 class="text-xl font-black mb-4">徹底した管理</h4>
              <p class="text-sm text-[var(--text-light)] leading-relaxed">厳格な品質・情報管理体制を構築。安定した品質と高いセキュリティをお約束します。</p>
            </div>
          </div>
        </div>
      </section>

      <!-- service: 事業内容 -->
      <section id="service" class="py-20 bg-[var(--accent-color)] relative overflow-hidden">
        <div class="max-w-6xl mx-auto px-6">
          <div class="bubble-field">
            <span class="bubble" style="width:110px;height:110px;left:8%;top:12%;animation-delay:0.7s;"></span>
            <span class="bubble" style="width:100px;height:100px;left:86%;top:72%;animation-delay:2.1s;"></span>
          </div>
          <div class="mb-12">
            <h2 class="font-en font-bold tracking-widest text-[var(--main-color)] mb-2 text-sm">SERVICES</h2>
            <h3 class="text-3xl font-black">事業内容</h3>
          </div>
          <div class="grid md:grid-cols-3 gap-6">
            <div class="bg-white p-8 rounded-[40px] flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow">
              <div>
                <span class="text-xs font-bold text-[var(--main-color)] mb-4 block uppercase tracking-tighter">01 / Service</span>
                <h4 class="text-2xl font-black mb-6">コンサルティング</h4>
                <div class="rounded-[30px] overflow-hidden mb-4 h-40">
                  <img src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&q=80&w=800" class="w-full h-full object-cover" alt="Service 1">
                </div>
                <p class="text-sm text-[var(--text-light)] leading-relaxed">お客様の課題を分析し、最適なソリューションを提案します。</p>
              </div>
              <span class="mt-6 font-black text-xs border-b border-[var(--main-color)] pb-1 self-start text-[var(--text-color)]">MORE</span>
            </div>
            <div class="bg-white p-8 rounded-[40px] flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow">
              <div>
                <span class="text-xs font-bold text-[var(--main-color)] mb-4 block uppercase tracking-tighter">02 / Service</span>
                <h4 class="text-2xl font-black mb-6">プロジェクト管理</h4>
                <div class="rounded-[30px] overflow-hidden mb-4 h-40">
                  <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800" class="w-full h-full object-cover" alt="Service 2">
                </div>
                <p class="text-sm text-[var(--text-light)] leading-relaxed">経験豊富なチームが、プロジェクトの成功を一貫してサポートします。</p>
              </div>
              <span class="mt-6 font-black text-xs border-b border-[var(--main-color)] pb-1 self-start text-[var(--text-color)]">MORE</span>
            </div>
            <div class="bg-white p-8 rounded-[40px] flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow">
              <div>
                <span class="text-xs font-bold text-[var(--main-color)] mb-4 block uppercase tracking-tighter">03 / Service</span>
                <h4 class="text-2xl font-black mb-6">人材ソリューション</h4>
                <div class="rounded-[30px] overflow-hidden mb-4 h-40">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800" class="w-full h-full object-cover" alt="Service 3">
                </div>
                <p class="text-sm text-[var(--text-light)] leading-relaxed">適切な人材をマッチングし、組織の力を最大化します。</p>
              </div>
              <span class="mt-6 font-black text-xs border-b border-[var(--main-color)] pb-1 self-start text-[var(--text-color)]">MORE</span>
            </div>
          </div>
        </div>
      </section>

      <!-- works: 実績・メッセージ -->
      <section id="works" class="py-20 bg-[#F4F7F9] relative overflow-hidden">
        <div class="max-w-6xl mx-auto px-6">
          <div class="bubble-field">
            <span class="bubble bubble-warm" style="width:130px;height:130px;left:6%;top:20%;animation-delay:0.8s;"></span>
            <span class="bubble bubble-warm" style="width:95px;height:95px;left:80%;top:65%;animation-delay:1.9s;"></span>
          </div>
          <div class="bg-white rounded-[60px] p-8 md:p-14 shadow-xl">
            <div class="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 class="font-en font-bold tracking-widest text-[var(--main-color)] mb-4 text-sm">MESSAGE</h2>
                <h3 class="text-3xl font-black mb-6 italic">お客様と共に、<br>価値を創造する。</h3>
                <p class="text-[var(--text-light)] leading-loose mb-8">
                  私たちは単にサービスを提供するだけでなく、お客様のビジネスパートナーとして、持続的な成長をサポートします。長年の経験と専門知識を活かし、最高の成果をお約束します。
                </p>
                <a href="#company" class="bg-[var(--main-color)] text-white px-10 py-4 rounded-full font-bold inline-block hover:opacity-90 transition-all">企業情報を詳しく見る</a>
              </div>
              <div class="rounded-[40px] overflow-hidden aspect-[3/4]">
                <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=800" class="w-full h-full object-cover" alt="Meeting">
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- news: ニュース -->
      <section id="news" class="py-20 bg-white relative overflow-hidden">
        <div class="max-w-6xl mx-auto px-6">
          <div class="bubble-field">
            <span class="bubble" style="width:110px;height:110px;left:4%;top:18%;animation-delay:0.6s;"></span>
            <span class="bubble" style="width:90px;height:90px;left:88%;top:60%;animation-delay:1.8s;"></span>
          </div>
          <div class="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 class="font-en font-bold tracking-widest text-[var(--main-color)] mb-2 text-sm">NEWS</h2>
              <h3 class="text-3xl font-black">ニュース</h3>
            </div>
            <a href="/news" class="text-sm font-bold border-b-2 border-[var(--main-color)] pb-1 mt-4 md:mt-0 hover:text-[var(--main-color)] transition-all">VIEW ALL</a>
          </div>
          <div class="grid md:grid-cols-2 gap-6">
            <a href="/news/news-page" class="group block"><article class="flex flex-col sm:flex-row gap-4 p-5 bg-[var(--accent-color)] rounded-[24px] hover:shadow-lg transition-shadow"><div class="w-full sm:w-32 h-24 bg-gray-100 rounded-[16px] overflow-hidden shrink-0"><img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=400" class="w-full h-full object-cover group-hover:scale-105 transition-transform"></div><div><p class="text-xs font-en font-bold text-[var(--main-color)] mb-2">2025.04.01</p><h4 class="text-base font-bold group-hover:text-[var(--main-color)] transition-colors line-clamp-2">最新情報は公開投稿から自動生成されます。</h4></div></article></a>
            <a href="/news/news-page" class="group block"><article class="flex flex-col sm:flex-row gap-4 p-5 bg-[var(--accent-color)] rounded-[24px] hover:shadow-lg transition-shadow"><div class="w-full sm:w-32 h-24 bg-gray-100 rounded-[16px] overflow-hidden shrink-0"><img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400" class="w-full h-full object-cover group-hover:scale-105 transition-transform"></div><div><p class="text-xs font-en font-bold text-[var(--main-color)] mb-2">2025.03.15</p><h4 class="text-base font-bold group-hover:text-[var(--main-color)] transition-colors line-clamp-2">ニュース記事のタイトルがここに表示されます。</h4></div></article></a>
          </div>
        </div>
      </section>

      <!-- blog: ブログ -->
      <section id="blog" class="py-20 bg-[var(--accent-color)] relative overflow-hidden">
        <div class="max-w-6xl mx-auto px-6">
          <div class="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 class="font-en font-bold tracking-widest text-[var(--main-color)] mb-2 text-sm">BLOG</h2>
              <h3 class="text-3xl font-black">ブログ</h3>
            </div>
            <a href="/blog" class="text-sm font-bold border-b-2 border-[var(--main-color)] pb-1 mt-4 md:mt-0 hover:text-[var(--main-color)] transition-all">VIEW ALL</a>
          </div>
          <div class="grid md:grid-cols-3 gap-6">
            <a href="/blog/blog-page" class="group">
              <div class="aspect-video overflow-hidden rounded-3xl mb-4 shadow-md">
                <img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=800" alt="Blog 1" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
              </div>
              <div class="flex items-center gap-3 mb-3">
                <span class="text-sm font-en font-bold text-gray-400">2025.04.01</span>
                <span class="bg-[#F4F7F9] text-[var(--main-color)] text-xs font-bold px-3 py-1 rounded-full">BLOG</span>
              </div>
              <h4 class="text-lg font-bold group-hover:text-[var(--main-color)] transition-all line-clamp-2">ブログ記事は公開投稿から自動生成されます。</h4>
            </a>
            <a href="/blog/blog-page" class="group">
              <div class="aspect-video overflow-hidden rounded-3xl mb-4 shadow-md">
                <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800" alt="Blog 2" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
              </div>
              <div class="flex items-center gap-3 mb-3">
                <span class="text-sm font-en font-bold text-gray-400">2025.03.15</span>
                <span class="bg-[#F4F7F9] text-[var(--main-color)] text-xs font-bold px-3 py-1 rounded-full">BLOG</span>
              </div>
              <h4 class="text-lg font-bold group-hover:text-[var(--main-color)] transition-all line-clamp-2">ブログ記事のタイトルがここに表示されます。</h4>
            </a>
            <a href="/blog/blog-page" class="group">
              <div class="aspect-video overflow-hidden rounded-3xl mb-4 shadow-md">
                <img src="https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=800" alt="Blog 3" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
              </div>
              <div class="flex items-center gap-3 mb-3">
                <span class="text-sm font-en font-bold text-gray-400">2025.03.01</span>
                <span class="bg-[#F4F7F9] text-[var(--main-color)] text-xs font-bold px-3 py-1 rounded-full">BLOG</span>
              </div>
              <h4 class="text-lg font-bold group-hover:text-[var(--main-color)] transition-all line-clamp-2">最新のアプローチと私たちの取り組み。</h4>
            </a>
          </div>
        </div>
      </section>

      <!-- company: 企業情報・お問い合わせ -->
      <section id="company" class="py-12 px-6">
        <div class="max-w-5xl mx-auto bg-[var(--main-color)] rounded-[60px] p-10 md:p-16 text-center text-white shadow-2xl">
          <h2 class="font-en font-bold tracking-[0.3em] mb-4 text-sm">CONTACT</h2>
          <h3 class="text-3xl md:text-4xl font-black mb-8">お気軽にご相談ください</h3>
          <div class="flex flex-col md:flex-row justify-center items-center gap-4">
            <a href="#" class="bg-white text-[var(--main-color)] w-full md:w-auto px-10 py-4 rounded-full font-black text-lg hover:bg-gray-100 transition-all">
              TEL. 000-0000-0000
            </a>
            <a href="#" class="bg-transparent border-2 border-white w-full md:w-auto px-10 py-4 rounded-full font-black text-lg hover:bg-white hover:text-[var(--main-color)] transition-all">
              お問い合わせフォーム
            </a>
          </div>
        </div>
      </section>
    </main>

    <footer class="bg-[var(--accent-color)] pt-14 pb-10 relative overflow-hidden">
      <div class="max-w-6xl mx-auto px-6">
        <div class="bubble-field">
          <span class="bubble bubble-warm" style="width:120px;height:120px;left:6%;top:18%;animation-delay:0.7s;"></span>
          <span class="bubble bubble-warm" style="width:90px;height:90px;left:82%;top:65%;animation-delay:1.9s;"></span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
          <div class="col-span-2 md:col-span-1">
            <div class="font-black text-lg mb-4">Company Name</div>
            <p class="text-xs font-bold text-gray-400 leading-loose">
              株式会社サンプル<br>
              〒000-0000<br>
              東京都渋谷区1-1-1<br>
              TEL: 000-0000-0000
            </p>
          </div>
          <div>
            <h4 class="font-bold text-sm mb-6 border-l-4 border-[var(--main-color)] pl-3">企業情報</h4>
            <ul class="space-y-3 text-sm font-bold text-gray-500">
              <li><a href="#" class="hover:text-[var(--main-color)]">会社概要</a></li>
              <li><a href="#" class="hover:text-[var(--main-color)]">代表挨拶</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-bold text-sm mb-6 border-l-4 border-[var(--main-color)] pl-3">事業内容</h4>
            <ul class="space-y-3 text-sm font-bold text-gray-500">
              <li><a href="#" class="hover:text-[var(--main-color)]">サービス一覧</a></li>
              <li><a href="#" class="hover:text-[var(--main-color)]">実績紹介</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-bold text-sm mb-6 border-l-4 border-[var(--main-color)] pl-3">その他</h4>
            <ul class="space-y-3 text-sm font-bold text-gray-500">
              <li><a href="#" class="hover:text-[var(--main-color)]">採用情報</a></li>
              <li><a href="#" class="hover:text-[var(--main-color)]">ブログ</a></li>
              <li><a href="#" class="hover:text-[var(--main-color)]">お問い合わせ</a></li>
            </ul>
          </div>
        </div>
        <div class="border-t border-gray-200 pt-6 text-center text-xs font-bold text-gray-400">
          <p>&copy; Company Name. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  </div>
</div>`,
  },
  {
    id: 'template-noir',
    name: 'Noir: ミニマルエディトリアル',
    tags: ['minimal', 'editorial', 'monochrome', 'creative', 'studio', 'モダン', 'クール', 'シンプル'],
    description: 'モノクロベースにレッドアクセント。クリエイティブスタジオ・デザイン事務所向けのエディトリアルデザイン。',
    html: `<div class="template-root" style="--main-color: #c8161d; --main-dark: #111; --accent-color: #f7f7f5; --text-color: #1a1a1a; --text-light: #999; --bg-color: #fff; --section-gap: 0; --section-padding: 4rem 0;">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Noto+Sans+JP:wght@300;400;500;700&display=swap');

/* ===== CSS Reset & Variables ===== */
.template-root {
  --color-bg: var(--bg-color, #fff);
  --color-text: var(--text-color, #1a1a1a);
  --color-accent: var(--main-color, #c8161d);
  --color-gray: var(--accent-color, #f7f7f5);
  --color-border: #e5e5e5;
  --color-dark: var(--main-dark, #111);
  --font-display: 'Cormorant Garamond', serif;
  --font-body: 'Noto Sans JP', sans-serif;
  --ease: cubic-bezier(.16, 1, .3, 1);

  margin: 0;
  padding: 0;
  font-family: var(--font-body);
  font-weight: 400;
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.8;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

.template-root *, .template-root *::before, .template-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.template-root a {
  text-decoration: none;
  color: inherit;
}

.template-root ul, .template-root ol {
  list-style: none;
}

.template-root img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* ===== Loading Screen ===== */
.template-root .loader {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: var(--color-dark);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity .6s var(--ease), visibility .6s var(--ease);
}

.template-root .loader.is-loaded {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.template-root .loader__inner {
  text-align: center;
}

.template-root .loader__logo {
  display: block;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 400;
  letter-spacing: .25em;
  color: #fff;
  margin-bottom: 24px;
  opacity: 0;
  animation: loaderTextIn 1s var(--ease) .2s forwards;
}

.template-root .loader__bar {
  width: 120px;
  height: 1px;
  background: rgba(255,255,255,.15);
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

.template-root .loader__bar::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: var(--color-accent);
  animation: loaderBar 1.8s var(--ease) .4s forwards;
}

@keyframes loaderTextIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes loaderBar {
  to { left: 100%; }
}

/* ===== Header ===== */
.template-root .header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  transition: transform .4s var(--ease), box-shadow .4s var(--ease);
}

.template-root .header.is-hidden {
  transform: translateY(-100%);
}

.template-root .header.is-scrolled {
  box-shadow: 0 1px 30px rgba(0,0,0,.06);
}

.template-root .header__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 60px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-root .header__logo {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.template-root .header__logo-text {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 400;
  letter-spacing: .2em;
}

.template-root .header__logo-sub {
  font-size: .6rem;
  letter-spacing: .15em;
  color: var(--color-accent);
  text-transform: uppercase;
}

.template-root .header__nav {
  display: flex;
  align-items: center;
  gap: 40px;
}

.template-root .header__nav-list {
  display: flex;
  gap: 36px;
  align-items: center;
}

.template-root .header__nav-item {
  position: relative;
}

.template-root .header__nav-link {
  font-size: .7rem;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: var(--color-text);
  transition: color .3s;
}

.template-root .header__nav-link:hover {
  color: var(--color-accent);
}

/* Nav-flip animation */
.template-root .nav-flip {
  display: inline-block;
  position: relative;
  overflow: hidden;
  height: 1.2em;
  line-height: 1.2em;
}

.template-root .nav-flip span {
  display: block;
  transition: transform .35s var(--ease);
}

.template-root .nav-flip span:last-child {
  position: absolute;
  top: 0; left: 0;
  color: var(--color-accent);
  transform: translateY(100%);
}

.template-root .nav-flip:hover span:first-child {
  transform: translateY(-100%);
}

.template-root .nav-flip:hover span:last-child {
  transform: translateY(0);
}

.template-root .header__cta {
  font-size: .7rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  padding: 10px 28px;
  border: 1px solid var(--color-text);
  transition: all .3s var(--ease);
}

.template-root .header__cta:hover {
  background: var(--color-text);
  color: #fff;
}

/* Hamburger */
.template-root .hamburger {
  display: none;
  width: 28px;
  height: 20px;
  position: relative;
  cursor: pointer;
  z-index: 200;
}

.template-root .hamburger span {
  display: block;
  width: 100%;
  height: 1px;
  background: var(--color-text);
  position: absolute;
  left: 0;
  transition: all .35s var(--ease);
}

.template-root .hamburger span:nth-child(1) { top: 0; }
.template-root .hamburger span:nth-child(2) { top: 50%; }
.template-root .hamburger span:nth-child(3) { bottom: 0; }

.template-root .hamburger.is-active span:nth-child(1) {
  top: 50%;
  transform: rotate(45deg);
}

.template-root .hamburger.is-active span:nth-child(2) {
  opacity: 0;
}

.template-root .hamburger.is-active span:nth-child(3) {
  bottom: 50%;
  transform: rotate(-45deg);
}

/* Mobile Nav Overlay */
.template-root .mobile-nav {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: var(--color-dark);
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all .5s var(--ease);
}

.template-root .mobile-nav.is-open {
  opacity: 1;
  visibility: visible;
}

.template-root .mobile-nav__list {
  text-align: center;
}

.template-root .mobile-nav__item {
  margin-bottom: 32px;
}

.template-root .mobile-nav__link {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 300;
  letter-spacing: .15em;
  color: #fff;
  opacity: 0;
  transform: translateY(20px);
  transition: all .4s var(--ease);
}

.template-root .mobile-nav.is-open .mobile-nav__link {
  opacity: 1;
  transform: translateY(0);
}

.template-root .mobile-nav__item:nth-child(1) .mobile-nav__link { transition-delay: .1s; }
.template-root .mobile-nav__item:nth-child(2) .mobile-nav__link { transition-delay: .15s; }
.template-root .mobile-nav__item:nth-child(3) .mobile-nav__link { transition-delay: .2s; }
.template-root .mobile-nav__item:nth-child(4) .mobile-nav__link { transition-delay: .25s; }
.template-root .mobile-nav__item:nth-child(5) .mobile-nav__link { transition-delay: .3s; }
.template-root .mobile-nav__item:nth-child(6) .mobile-nav__link { transition-delay: .35s; }

/* ===== Scroll Animations ===== */
.template-root [data-anim="fade"] {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity .8s var(--ease), transform .8s var(--ease);
}

.template-root [data-anim="fade"].is-visible {
  opacity: 1;
  transform: translateY(0);
}

.template-root [data-anim="rise"] {
  opacity: 0;
  transform: translateY(60px);
  transition: opacity 1s var(--ease), transform 1s var(--ease);
}

.template-root [data-anim="rise"].is-visible {
  opacity: 1;
  transform: translateY(0);
}

.template-root [data-anim="img-reveal"] {
  position: relative;
  overflow: hidden;
}

.template-root [data-anim="img-reveal"]::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: var(--color-dark);
  transform-origin: right;
  transition: transform 1s var(--ease);
}

.template-root [data-anim="img-reveal"].is-visible::after {
  transform: scaleX(0);
}

.template-root [data-anim="img-reveal"] img {
  transform: scale(1.3);
  transition: transform 1.4s var(--ease);
}

.template-root [data-anim="img-reveal"].is-visible img {
  transform: scale(1);
}

.template-root [data-anim="slide-left"] {
  opacity: 0;
  transform: translateX(-60px);
  transition: opacity .8s var(--ease), transform .8s var(--ease);
}

.template-root [data-anim="slide-left"].is-visible {
  opacity: 1;
  transform: translateX(0);
}

.template-root [data-anim="slide-right"] {
  opacity: 0;
  transform: translateX(60px);
  transition: opacity .8s var(--ease), transform .8s var(--ease);
}

.template-root [data-anim="slide-right"].is-visible {
  opacity: 1;
  transform: translateX(0);
}

.template-root [data-anim="scale"] {
  opacity: 0;
  transform: scale(.9);
  transition: opacity .8s var(--ease), transform .8s var(--ease);
}

.template-root [data-anim="scale"].is-visible {
  opacity: 1;
  transform: scale(1);
}

.template-root [data-anim="stagger"] > * {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity .6s var(--ease), transform .6s var(--ease);
}

.template-root [data-anim="stagger"].is-visible > * {
  opacity: 1;
  transform: translateY(0);
}

.template-root [data-anim="stagger"].is-visible > *:nth-child(1) { transition-delay: 0s; }
.template-root [data-anim="stagger"].is-visible > *:nth-child(2) { transition-delay: .1s; }
.template-root [data-anim="stagger"].is-visible > *:nth-child(3) { transition-delay: .2s; }
.template-root [data-anim="stagger"].is-visible > *:nth-child(4) { transition-delay: .3s; }
.template-root [data-anim="stagger"].is-visible > *:nth-child(5) { transition-delay: .4s; }
.template-root [data-anim="stagger"].is-visible > *:nth-child(6) { transition-delay: .5s; }

/* ===== SVG Animation ===== */
.template-root .svg-line-draw {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}

.template-root .about__svg-path,
.template-root #aboutPath {
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  transition: stroke-dashoffset 2s var(--ease);
}

.template-root .about__svg-path.is-drawn,
.template-root #aboutPath.is-drawn {
  stroke-dashoffset: 0;
}

/* ===== Hero Section ===== */
.template-root .hero {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 700px;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--color-dark);
}

.template-root .hero__bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 1;
}

.template-root .hero__bg img {
  width: 100%; height: 100%;
  object-fit: cover;
  opacity: .25;
  transform: scale(1.1);
  animation: heroScale 15s var(--ease) forwards;
}

@keyframes heroScale {
  from { transform: scale(1.1); }
  to   { transform: scale(1); }
}

.template-root .hero__content {
  position: relative;
  z-index: 3;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 60px;
}

.template-root .hero__label {
  font-size: .65rem;
  letter-spacing: .35em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 32px;
  opacity: 0;
  animation: loaderTextIn 1s var(--ease) 1.8s forwards;
}

.template-root .hero__title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 7vw, 6.5rem);
  font-weight: 300;
  font-style: italic;
  line-height: 1.05;
  color: #fff;
  letter-spacing: .02em;
  margin-bottom: 40px;
  opacity: 0;
  animation: loaderTextIn 1s var(--ease) 2s forwards;
}

.template-root .hero__line {
  width: 60px;
  height: 1px;
  background: var(--color-accent);
  opacity: 0;
  animation: loaderTextIn 1s var(--ease) 2.2s forwards;
}

.template-root .hero__scroll {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255,255,255,.4);
  font-size: .55rem;
  letter-spacing: .25em;
  text-transform: uppercase;
}

.template-root .hero__scroll-line {
  display: block;
  width: 1px;
  height: 50px;
  background: rgba(255,255,255,.2);
  position: relative;
  overflow: hidden;
}

.template-root .hero__scroll-line::after {
  content: '';
  position: absolute;
  top: -100%;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-accent);
  animation: scrollPulse 2s ease-in-out infinite;
}

@keyframes scrollPulse {
  0%   { top: -100%; }
  50%  { top: 0; }
  100% { top: 100%; }
}

/* ===== About Section ===== */
.template-root .about {
  position: relative;
  padding: 140px 0;
  background: var(--color-bg);
  overflow: hidden;
}

.template-root .about__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 60px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.template-root .about__label {
  font-family: var(--font-display);
  font-size: .75rem;
  letter-spacing: .3em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 20px;
}

.template-root .about__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.5vw, 3.2rem);
  font-weight: 300;
  font-style: italic;
  line-height: 1.2;
  margin-bottom: 24px;
}

.template-root .about__line {
  width: 40px;
  height: 1px;
  background: var(--color-accent);
  margin-bottom: 32px;
}

.template-root .about__text {
  font-size: .85rem;
  line-height: 2.2;
  color: #666;
  font-weight: 300;
}

.template-root .about__img-wrap {
  position: relative;
}

.template-root .about__img-wrap img {
  width: 100%;
  height: 500px;
  object-fit: cover;
}

/* ===== Service (svc) Section ===== */
.template-root .svc {
  padding: 140px 0;
  background: var(--color-gray);
}

.template-root .svc__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 60px;
}

.template-root .svc__header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: start;
  margin-bottom: 80px;
}

.template-root .svc__label {
  font-family: var(--font-display);
  font-size: .75rem;
  letter-spacing: .3em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 20px;
}

.template-root .svc__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.5vw, 3.2rem);
  font-weight: 300;
  font-style: italic;
  line-height: 1.2;
}

.template-root .svc__desc {
  font-size: .85rem;
  line-height: 2.2;
  color: #666;
  font-weight: 300;
  padding-top: 16px;
}

.template-root .svc__img-wrap {
  position: relative;
  margin-bottom: 80px;
}

.template-root .svc__img-wrap img {
  width: 100%;
  height: 480px;
  object-fit: cover;
}

.template-root .svc__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
}

.template-root .svc__card {
  padding: 40px 0;
  border-top: 1px solid var(--color-border);
}

.template-root .svc__card-num {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 300;
  color: var(--color-accent);
  margin-bottom: 20px;
  line-height: 1;
}

.template-root .svc__card-title {
  font-size: .95rem;
  font-weight: 700;
  margin-bottom: 16px;
}

.template-root .svc__card-text {
  font-size: .8rem;
  line-height: 2;
  color: #666;
  font-weight: 300;
}

/* ===== Works Section ===== */
.template-root .works {
  padding: 140px 0;
  background: var(--color-bg);
  overflow: hidden;
}

.template-root .works__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 60px;
}

.template-root .works__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 60px;
}

.template-root .works__label {
  font-family: var(--font-display);
  font-size: .75rem;
  letter-spacing: .3em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 20px;
}

.template-root .works__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.5vw, 3.2rem);
  font-weight: 300;
  font-style: italic;
  line-height: 1.2;
}

.template-root .works__more {
  font-family: var(--font-display);
  font-size: .85rem;
  letter-spacing: .1em;
  position: relative;
  padding-bottom: 4px;
}

.template-root .works__more::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 1px;
  background: var(--color-text);
  transform-origin: right;
  transition: transform .3s var(--ease);
}

.template-root .works__more:hover::after {
  transform: scaleX(0);
  transform-origin: left;
}

/* Works marquee */
.template-root .works__marquee {
  overflow: hidden;
  white-space: nowrap;
  margin-bottom: 60px;
}

.template-root .works__marquee-inner {
  display: inline-flex;
  animation: marquee 30s linear infinite;
}

.template-root .works__marquee-text {
  font-family: var(--font-display);
  font-size: 8rem;
  font-weight: 300;
  font-style: italic;
  color: transparent;
  -webkit-text-stroke: 1px var(--color-border);
  letter-spacing: .05em;
  padding-right: 80px;
  user-select: none;
}

@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.template-root .works__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
}

.template-root .works__card {
  display: block;
  position: relative;
  overflow: hidden;
}

.template-root .works__card-img {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4/3;
}

.template-root .works__card-img img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform .8s var(--ease);
}

.template-root .works__card:hover .works__card-img img {
  transform: scale(1.08);
}

.template-root .works__card-info {
  padding: 24px 0;
}

.template-root .works__card-cat {
  font-size: .65rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 8px;
}

.template-root .works__card-name {
  font-size: 1rem;
  font-weight: 500;
  transition: color .3s;
}

.template-root .works__card:hover .works__card-name {
  color: var(--color-accent);
}

/* ===== News Section ===== */
.template-root .news {
  padding: 140px 0;
  background: var(--color-gray);
}

.template-root .news__inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 60px;
}

.template-root .news__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 60px;
}

.template-root .news__label {
  font-family: var(--font-display);
  font-size: .75rem;
  letter-spacing: .3em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 20px;
}

.template-root .news__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.5vw, 3.2rem);
  font-weight: 300;
  font-style: italic;
  line-height: 1.2;
}

.template-root .news__more {
  font-family: var(--font-display);
  font-size: .85rem;
  letter-spacing: .1em;
  position: relative;
  padding-bottom: 4px;
}

.template-root .news__more::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 1px;
  background: var(--color-text);
  transform-origin: right;
  transition: transform .3s var(--ease);
}

.template-root .news__more:hover::after {
  transform: scaleX(0);
  transform-origin: left;
}

.template-root .news__list {
  border-top: 1px solid var(--color-border);
}

.template-root .news__item {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 28px 0;
  border-bottom: 1px solid var(--color-border);
  transition: padding-left .3s var(--ease);
}

.template-root .news__item:hover {
  padding-left: 12px;
}

.template-root .news__date {
  font-size: .75rem;
  letter-spacing: .08em;
  color: #999;
  flex-shrink: 0;
}

.template-root .news__tag {
  font-size: .6rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  padding: 3px 12px;
  flex-shrink: 0;
}

.template-root .news__text {
  font-size: .85rem;
  color: var(--color-text);
  transition: color .3s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-root .news__item:hover .news__text {
  color: var(--color-accent);
}

/* ===== Company Section ===== */
.template-root .company {
  padding: 140px 0;
  background: var(--color-bg);
}

.template-root .company__inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 60px;
}

.template-root .company__header {
  text-align: center;
  margin-bottom: 60px;
}

.template-root .company__label {
  font-family: var(--font-display);
  font-size: .75rem;
  letter-spacing: .3em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 20px;
}

.template-root .company__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.5vw, 3.2rem);
  font-weight: 300;
  font-style: italic;
  line-height: 1.2;
}

.template-root .company__table {
  width: 100%;
  border-collapse: collapse;
}

.template-root .company__table tr {
  border-bottom: 1px solid var(--color-border);
}

.template-root .company__table th {
  text-align: left;
  font-size: .75rem;
  font-weight: 400;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #999;
  padding: 24px 0;
  width: 180px;
  vertical-align: top;
}

.template-root .company__table td {
  font-size: .85rem;
  padding: 24px 0;
  line-height: 1.8;
}

/* ===== CTA Section ===== */
.template-root .cta {
  padding: 0;
  background: var(--color-bg);
}

.template-root .cta__inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 60px 140px;
}

.template-root .cta__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 80px;
}

.template-root .cta__box {
  padding: 48px;
  transition: all .4s var(--ease);
}

.template-root .cta__box--dark {
  background: var(--color-dark);
  color: #fff;
}

.template-root .cta__box--dark:hover {
  background: var(--color-accent);
}

.template-root .cta__box--outline {
  border: 1px solid var(--color-border);
}

.template-root .cta__box--outline:hover {
  border-color: var(--color-accent);
}

.template-root .cta__box-label {
  font-size: .65rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  opacity: .5;
  margin-bottom: 16px;
}

.template-root .cta__box-value {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 400;
  letter-spacing: .05em;
}

.template-root .cta__box-note {
  font-size: .7rem;
  margin-top: 16px;
  opacity: .4;
}

/* ===== Footer ===== */
.template-root .footer {
  background: var(--color-dark);
  color: #fff;
  padding: 80px 0 40px;
}

.template-root .footer__inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 60px;
}

.template-root .footer__grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 60px;
  margin-bottom: 60px;
}

.template-root .footer__logo {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 400;
  letter-spacing: .2em;
  margin-bottom: 20px;
}

.template-root .footer__info {
  font-size: .75rem;
  line-height: 2;
  color: rgba(255,255,255,.35);
}

.template-root .footer__heading {
  font-size: .65rem;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: rgba(255,255,255,.45);
  margin-bottom: 24px;
}

.template-root .footer__link-list li {
  margin-bottom: 12px;
}

.template-root .footer__link-list a {
  font-size: .8rem;
  color: rgba(255,255,255,.35);
  transition: color .3s;
}

.template-root .footer__link-list a:hover {
  color: var(--color-accent);
}

.template-root .footer__bottom {
  border-top: 1px solid rgba(255,255,255,.08);
  padding-top: 24px;
  text-align: center;
}

.template-root .footer__copy {
  font-size: .6rem;
  letter-spacing: .15em;
  color: rgba(255,255,255,.25);
}

/* ===== Responsive: Tablet ===== */
/* ===== Features ===== */
.template-root .features {
  padding: 140px 0;
  background: var(--color-bg);
}

.template-root .features__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 60px;
}

.template-root .features__header {
  margin-bottom: 64px;
}

.template-root .features__label {
  font-family: var(--font-display);
  font-size: .9rem;
  font-weight: 300;
  color: var(--color-accent);
  margin-bottom: 12px;
}

.template-root .features__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 300;
  letter-spacing: -.02em;
  line-height: 1.2;
}

.template-root .features__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.template-root .features__card {
  padding: 40px 0;
  border-top: 1px solid var(--color-border);
}

.template-root .features__card-num {
  font-family: var(--font-display);
  font-size: .85rem;
  color: var(--color-accent);
  margin-bottom: 20px;
}

.template-root .features__card-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.template-root .features__card-text {
  font-size: .82rem;
  color: #999;
  line-height: 2;
  font-weight: 300;
}

/* ===== Blog ===== */
.template-root .blog {
  padding: 140px 0;
  background: var(--color-bg);
}

.template-root .blog__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 60px;
}

.template-root .blog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 56px;
}

.template-root .blog__label {
  font-family: var(--font-display);
  font-size: .9rem;
  font-weight: 300;
  color: #999;
  margin-bottom: 12px;
}

.template-root .blog__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 300;
  letter-spacing: -.02em;
  line-height: 1.2;
}

.template-root .blog__more {
  font-family: var(--font-display);
  font-size: .8rem;
  letter-spacing: .08em;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 4px;
  transition: border-color .3s;
}

.template-root .blog__more:hover {
  border-color: var(--color-text);
}

.template-root .blog__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
}

.template-root .blog__card {
  display: block;
}

.template-root .blog__card-img {
  position: relative;
  overflow: hidden;
  aspect-ratio: 3 / 2;
  margin-bottom: 16px;
  background: #eee;
}

.template-root .blog__card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .8s var(--ease);
}

.template-root .blog__card:hover .blog__card-img img {
  transform: scale(1.06);
}

.template-root .blog__card-date {
  font-family: var(--font-display);
  font-size: .75rem;
  color: #999;
  letter-spacing: .06em;
  margin-bottom: 6px;
}

.template-root .blog__card-name {
  font-size: .95rem;
  font-weight: 400;
  line-height: 1.6;
  transition: opacity .3s;
}

.template-root .blog__card:hover .blog__card-name {
  opacity: .6;
}

@media (max-width: 999px) {
  .template-root .header__inner {
    padding: 0 30px;
    height: 64px;
  }

  .template-root .header__nav {
    display: none;
  }

  .template-root .hamburger {
    display: block;
  }

  .template-root .hero__content {
    padding: 0 30px;
  }

  .template-root .about__inner {
    grid-template-columns: 1fr;
    gap: 48px;
    padding: 0 30px;
  }

  .template-root .about {
    padding: 100px 0;
  }

  .template-root .svc__inner {
    padding: 0 30px;
  }

  .template-root .svc__header {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .template-root .svc__grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .template-root .svc {
    padding: 100px 0;
  }

  .template-root .works__inner {
    padding: 0 30px;
  }

  .template-root .works__grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .template-root .works {
    padding: 100px 0;
  }

  .template-root .works__marquee-text {
    font-size: 5rem;
  }

  .template-root .news__inner {
    padding: 0 30px;
  }

  .template-root .news {
    padding: 100px 0;
  }

  .template-root .company__inner {
    padding: 0 30px;
  }

  .template-root .company {
    padding: 100px 0;
  }

  .template-root .features__inner {
    padding: 0 30px;
  }

  .template-root .features {
    padding: 100px 0;
  }

  .template-root .features__grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .template-root .blog__inner {
    padding: 0 30px;
  }

  .template-root .blog {
    padding: 100px 0;
  }

  .template-root .blog__grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .template-root .cta__inner {
    padding: 0 30px 100px;
  }

  .template-root .cta__grid {
    grid-template-columns: 1fr;
  }

  .template-root .footer__inner {
    padding: 0 30px;
  }

  .template-root .footer__grid {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 767px) {
  .template-root .header__inner {
    padding: 0 20px;
    height: 56px;
  }

  .template-root .hero {
    min-height: 500px;
  }

  .template-root .hero__content {
    padding: 0 20px;
  }

  .template-root .hero__label {
    font-size: .55rem;
  }

  .template-root .about__inner {
    padding: 0 20px;
  }

  .template-root .about {
    padding: 80px 0;
  }

  .template-root .about__img-wrap img {
    height: 300px;
  }

  .template-root .svc__inner {
    padding: 0 20px;
  }

  .template-root .svc {
    padding: 80px 0;
  }

  .template-root .svc__img-wrap img {
    height: 280px;
  }

  .template-root .works__inner {
    padding: 0 20px;
  }

  .template-root .works {
    padding: 80px 0;
  }

  .template-root .works__marquee-text {
    font-size: 3.5rem;
  }

  .template-root .news__inner {
    padding: 0 20px;
  }

  .template-root .news {
    padding: 80px 0;
  }

  .template-root .news__item {
    flex-wrap: wrap;
    gap: 8px 16px;
  }

  .template-root .company__inner {
    padding: 0 20px;
  }

  .template-root .company {
    padding: 80px 0;
  }

  .template-root .company__table th {
    display: block;
    width: 100%;
    padding-bottom: 4px;
  }

  .template-root .company__table td {
    display: block;
    padding-top: 0;
  }

  .template-root .cta__inner {
    padding: 0 20px 80px;
  }

  .template-root .cta__box {
    padding: 32px;
  }

  .template-root .footer__inner {
    padding: 0 20px;
  }

  .template-root .footer__grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
</style>

<!-- Loading Screen -->
<div class="loader" id="loader">
  <div class="loader__inner">
    <span class="loader__logo">NOIR</span>
    <div class="loader__bar"></div>
  </div>
</div>

<!-- Header -->
<header class="header" id="header">
  <div class="header__inner">
    <a href="#top" class="header__logo">
      <span class="header__logo-text">NOIR</span>
      <span class="header__logo-sub">Studio</span>
    </a>
    <nav class="header__nav">
      <ul class="header__nav-list" data-sync="site-pages">
        <li class="header__nav-item">
          <a href="#concept" class="header__nav-link nav-flip">
            <span>About</span><span>About</span>
          </a>
        </li>
        <li class="header__nav-item">
          <a href="#service" class="header__nav-link nav-flip">
            <span>Service</span><span>Service</span>
          </a>
        </li>
        <li class="header__nav-item">
          <a href="#works" class="header__nav-link nav-flip">
            <span>Works</span><span>Works</span>
          </a>
        </li>
        <li class="header__nav-item">
          <a href="#news" class="header__nav-link nav-flip">
            <span>News</span><span>News</span>
          </a>
        </li>
        <li class="header__nav-item">
          <a href="#company" class="header__nav-link nav-flip">
            <span>Company</span><span>Company</span>
          </a>
        </li>
      </ul>
      <a href="#contact" class="header__cta">Contact</a>
    </nav>
    <div class="hamburger" id="hamburger">
      <span></span><span></span><span></span>
    </div>
  </div>
</header>

<!-- Mobile Nav -->
<div class="mobile-nav" id="mobileNav">
  <ul class="mobile-nav__list">
    <li class="mobile-nav__item"><a href="#concept" class="mobile-nav__link">About</a></li>
    <li class="mobile-nav__item"><a href="#service" class="mobile-nav__link">Service</a></li>
    <li class="mobile-nav__item"><a href="#works" class="mobile-nav__link">Works</a></li>
    <li class="mobile-nav__item"><a href="#news" class="mobile-nav__link">News</a></li>
    <li class="mobile-nav__item"><a href="#company" class="mobile-nav__link">Company</a></li>
    <li class="mobile-nav__item"><a href="#contact" class="mobile-nav__link">Contact</a></li>
  </ul>
</div>

<!-- Hero -->
<section id="top" class="hero">
  <div class="hero__bg">
    <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000" alt="Hero Background">
  </div>
  <div class="hero__content">
    <p class="hero__label">デザイン / アートディレクション / ブランディング</p>
    <h1 class="hero__title">Making<br>Digital Beautiful</h1>
    <div class="hero__line"></div>
  </div>
  <div class="hero__scroll">
    <span>Scroll</span>
    <span class="hero__scroll-line"></span>
  </div>
</section>

<!-- About -->
<section id="concept" class="about">
  <svg class="svg-line-draw" viewBox="0 0 1400 600" preserveAspectRatio="none">
    <path id="aboutPath" d="M0,300 Q350,100 700,300 T1400,300" fill="none" stroke="rgba(200,22,29,0.08)" stroke-width="1"/>
  </svg>
  <div class="about__inner">
    <div data-anim="slide-left">
      <p class="about__label">私たちについて</p>
      <h2 class="about__title">削ぎ落として、<br>本質を残す。</h2>
      <div class="about__line"></div>
      <p class="about__text">
        本質を見極め、余分を削ぎ落とすことで、真に美しいデザインが生まれる。<br><br>
        私たちはミニマリズムの力を信じ、すべてのプロジェクトに洗練された美意識を注ぎ込みます。ブランドの核心を捉え、記憶に残る体験をデザインします。
      </p>
    </div>
    <div class="about__img-wrap" data-anim="img-reveal">
      <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800" alt="About">
    </div>
  </div>
</section>

<!-- Service -->
<section id="service" class="svc">
  <div class="svc__inner">
    <div class="svc__header">
      <div data-anim="fade">
        <p class="svc__label">事業内容</p>
        <h2 class="svc__title">私たちが<br>できること</h2>
      </div>
      <p class="svc__desc" data-anim="fade">
        戦略的思考とクリエイティブの融合。数値に裏打ちされたデザインで、ビジネスの成長を支えます。ロゴ、Web、印刷物まで一貫したブランド体験を構築します。
      </p>
    </div>
    <div class="svc__img-wrap" data-anim="img-reveal">
      <img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200" alt="Service">
    </div>
    <div class="svc__grid" data-anim="stagger">
      <div class="svc__card">
        <p class="svc__card-num">01</p>
        <h3 class="svc__card-title">ブランディング</h3>
        <p class="svc__card-text">ブランドの本質を捉え、ロゴ・VI・ガイドラインを策定。一貫した世界観を構築します。</p>
      </div>
      <div class="svc__card">
        <p class="svc__card-num">02</p>
        <h3 class="svc__card-title">Webデザイン・開発</h3>
        <p class="svc__card-text">美しさと機能性を両立したWebサイトを設計・開発。ユーザー体験を最大化します。</p>
      </div>
      <div class="svc__card">
        <p class="svc__card-num">03</p>
        <h3 class="svc__card-title">アートディレクション</h3>
        <p class="svc__card-text">撮影・映像・グラフィックのディレクション。ビジュアルコミュニケーションを統括します。</p>
      </div>
    </div>
  </div>
</section>

<!-- Works -->
<section id="works" class="works">
  <div class="works__inner">
    <div class="works__header" data-anim="fade">
      <div>
        <p class="works__label">実績紹介</p>
        <h2 class="works__title">制作<br>実績</h2>
      </div>
      <a href="/works" class="works__more">すべての実績を見る</a>
    </div>
    <div class="works__marquee">
      <div class="works__marquee-inner">
        <span class="works__marquee-text">WORKS WORKS WORKS WORKS&nbsp;</span>
        <span class="works__marquee-text">WORKS WORKS WORKS WORKS&nbsp;</span>
      </div>
    </div>
    <div class="works__grid" data-anim="stagger">
      <a href="/works/work-page" class="works__card">
        <div class="works__card-img" data-anim="img-reveal">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800" alt="Work 1">
        </div>
        <div class="works__card-info">
          <p class="works__card-cat">ブランディング</p>
          <h3 class="works__card-name">ブランドアイデンティティ設計</h3>
        </div>
      </a>
      <a href="/works/work-page" class="works__card">
        <div class="works__card-img" data-anim="img-reveal">
          <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=800" alt="Work 2">
        </div>
        <div class="works__card-info">
          <p class="works__card-cat">Webデザイン</p>
          <h3 class="works__card-name">コーポレートサイトリニューアル</h3>
        </div>
      </a>
      <a href="/works/work-page" class="works__card">
        <div class="works__card-img" data-anim="img-reveal">
          <img src="https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=800" alt="Work 3">
        </div>
        <div class="works__card-info">
          <p class="works__card-cat">アートディレクション</p>
          <h3 class="works__card-name">プロダクト撮影ディレクション</h3>
        </div>
      </a>
      <a href="/works/work-page" class="works__card">
        <div class="works__card-img" data-anim="img-reveal">
          <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=800" alt="Work 4">
        </div>
        <div class="works__card-info">
          <p class="works__card-cat">ブランディング</p>
          <h3 class="works__card-name">ビジュアルアイデンティティ構築</h3>
        </div>
      </a>
    </div>
  </div>
</section>

<!-- Features / Strengths -->
<section id="features" class="features">
  <div class="features__inner">
    <div class="features__header" data-anim="fade">
      <p class="features__label">私たちの強み</p>
      <h2 class="features__title">選ばれる<br>理由</h2>
    </div>
    <div class="features__grid" data-anim="stagger">
      <div class="features__card">
        <p class="features__card-num">01</p>
        <h3 class="features__card-title">戦略から実装まで一貫対応</h3>
        <p class="features__card-text">調査・分析に基づく戦略設計から、デザイン・コーディング・運用まで、ワンストップで対応します。</p>
      </div>
      <div class="features__card">
        <p class="features__card-num">02</p>
        <h3 class="features__card-title">品質へのこだわり</h3>
        <p class="features__card-text">細部まで妥協しないクラフトマンシップ。国内外のデザインアワードで評価される品質基準を維持しています。</p>
      </div>
      <div class="features__card">
        <p class="features__card-num">03</p>
        <h3 class="features__card-title">長期的なパートナーシップ</h3>
        <p class="features__card-text">制作して終わりではなく、公開後の改善・運用支援まで。お客様のビジネス成長に伴走します。</p>
      </div>
    </div>
  </div>
</section>

<!-- News -->
<section id="news" class="news">
  <div class="news__inner">
    <div class="news__header" data-anim="fade">
      <div>
        <p class="news__label">お知らせ</p>
        <h2 class="news__title">最新の<br>ニュース</h2>
      </div>
      <a href="/news" class="news__more">すべてのニュースを見る</a>
    </div>
    <div class="news__list" data-anim="fade">
      <a href="/news/news-page" class="news__item">
        <time class="news__date">2025.04.01</time>
        <span class="news__tag">Info</span>
        <span class="news__text">最新情報は公開投稿から自動生成されます。</span>
      </a>
      <a href="/news/news-page" class="news__item">
        <time class="news__date">2025.03.15</time>
        <span class="news__tag">Award</span>
        <span class="news__text">ニュース記事のタイトルがここに表示されます。</span>
      </a>
      <a href="/news/news-page" class="news__item">
        <time class="news__date">2025.03.01</time>
        <span class="news__tag">Press</span>
        <span class="news__text">メディア掲載のお知らせ。</span>
      </a>
    </div>
  </div>
</section>

<!-- Company -->
<section id="company" class="company">
  <div class="company__inner">
    <div class="company__header" data-anim="fade">
      <p class="company__label">会社情報</p>
      <h2 class="company__title">会社概要</h2>
    </div>
    <div data-anim="fade">
      <table class="company__table">
        <tr><th>会社名</th><td>株式会社サンプル</td></tr>
        <tr><th>設立</th><td>2020年4月</td></tr>
        <tr><th>所在地</th><td>〒000-0000 東京都渋谷区1-1-1</td></tr>
        <tr><th>代表</th><td>山田 太郎</td></tr>
        <tr><th>事業内容</th><td>ブランディング / Webデザイン・開発 / アートディレクション</td></tr>
      </table>
    </div>
  </div>
</section>

<!-- Blog -->
<section id="blog" class="blog">
  <div class="blog__inner">
    <div class="blog__header" data-anim="fade">
      <div>
        <p class="blog__label">ブログ</p>
        <h2 class="blog__title">最新の<br>記事</h2>
      </div>
      <a href="/blog" class="blog__more">すべての記事を見る</a>
    </div>
    <div class="blog__grid" data-anim="stagger">
      <a href="/blog/blog-page" class="blog__card">
        <div class="blog__card-img" data-anim="img-reveal">
          <img src="https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&q=80&w=800" alt="Blog 1">
        </div>
        <div class="blog__card-info">
          <p class="blog__card-date">2025.04.01</p>
          <h3 class="blog__card-name">ブログ記事は公開投稿から自動生成されます。</h3>
        </div>
      </a>
      <a href="/blog/blog-page" class="blog__card">
        <div class="blog__card-img" data-anim="img-reveal">
          <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=800" alt="Blog 2">
        </div>
        <div class="blog__card-info">
          <p class="blog__card-date">2025.03.15</p>
          <h3 class="blog__card-name">ブログ記事のタイトルがここに表示されます。</h3>
        </div>
      </a>
    </div>
  </div>
</section>

<!-- Contact CTA -->
<section id="contact" class="cta">
  <div class="cta__inner">
    <div class="cta__grid" data-anim="stagger">
      <a href="tel:000-0000-0000" class="cta__box cta__box--dark">
        <p class="cta__box-label">お電話</p>
        <p class="cta__box-value">000-0000-0000</p>
        <p class="cta__box-note">平日 10:00 - 19:00</p>
      </a>
      <a href="#" class="cta__box cta__box--outline">
        <p class="cta__box-label">お問い合わせ</p>
        <p class="cta__box-value">フォームから相談する</p>
        <p class="cta__box-note">お気軽にご連絡ください</p>
      </a>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="footer">
  <div class="footer__inner">
    <div class="footer__grid">
      <div>
        <p class="footer__logo">NOIR</p>
        <p class="footer__info">
          株式会社サンプル<br>
          〒000-0000<br>
          東京都渋谷区1-1-1<br>
          TEL: 000-0000-0000
        </p>
      </div>
      <div>
        <p class="footer__heading">事業内容</p>
        <ul class="footer__link-list">
          <li><a href="#">ブランディング</a></li>
          <li><a href="#">Webデザイン</a></li>
          <li><a href="#">アートディレクション</a></li>
        </ul>
      </div>
      <div>
        <p class="footer__heading">企業情報</p>
        <ul class="footer__link-list">
          <li><a href="#">会社概要</a></li>
          <li><a href="#">採用情報</a></li>
        </ul>
      </div>
      <div>
        <p class="footer__heading">コンテンツ</p>
        <ul class="footer__link-list">
          <li><a href="#">ニュース</a></li>
          <li><a href="#">ブログ</a></li>
          <li><a href="#">お問い合わせ</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <p class="footer__copy">&copy; NOIR STUDIO. ALL RIGHTS RESERVED.</p>
    </div>
  </div>
</footer>

<script>
(function() {
  var root = document.currentScript ? document.currentScript.closest('.template-root') : null;
  if (!root) {
    var scripts = document.querySelectorAll('script');
    var lastScript = scripts[scripts.length - 1];
    root = lastScript.closest('.template-root');
  }
  if (!root) return;

  /* ===== Loading Screen ===== */
  var loader = root.querySelector('#loader');
  if (loader) {
    setTimeout(function() {
      loader.classList.add('is-loaded');
    }, 2400);
  }

  /* ===== SmoothScroll Class ===== */
  var SmoothScroll = function(root) {
    this.root = root;
    this.links = root.querySelectorAll('a[href^="#"]');
    this.init();
  };

  SmoothScroll.prototype.init = function() {
    var self = this;
    this.links.forEach(function(link) {
      link.addEventListener('click', function(e) {
        var href = this.getAttribute('href');
        if (href === '#') return;
        var target = root.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var headerH = 80;
        var top = target.getBoundingClientRect().top + window.pageYOffset - headerH;
        window.scrollTo({ top: top, behavior: 'smooth' });

        /* Close mobile nav if open */
        var mobileNav = root.querySelector('#mobileNav');
        var hamburger = root.querySelector('#hamburger');
        if (mobileNav && mobileNav.classList.contains('is-open')) {
          mobileNav.classList.remove('is-open');
          if (hamburger) hamburger.classList.remove('is-active');
        }
      });
    });
  };

  new SmoothScroll(root);

  /* ===== Header Scroll State ===== */
  var header = root.querySelector('#header');
  var lastScroll = 0;

  if (header) {
    window.addEventListener('scroll', function() {
      var currentScroll = window.pageYOffset;

      if (currentScroll > 100) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }

      if (currentScroll > lastScroll && currentScroll > 300) {
        header.classList.add('is-hidden');
      } else {
        header.classList.remove('is-hidden');
      }

      lastScroll = currentScroll;
    });
  }

  /* ===== Hamburger Menu ===== */
  var hamburger = root.querySelector('#hamburger');
  var mobileNav = root.querySelector('#mobileNav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function() {
      this.classList.toggle('is-active');
      mobileNav.classList.toggle('is-open');
    });
  }

  /* ===== Scroll-Triggered Animations (IntersectionObserver) ===== */
  var animEls = root.querySelectorAll('[data-anim]');
  if (animEls.length > 0 && 'IntersectionObserver' in window) {
    var animObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px'
    });

    animEls.forEach(function(el) {
      animObserver.observe(el);
    });
  }

  /* ===== SVG Line Draw ===== */
  var svgPath = root.querySelector('#aboutPath');
  if (svgPath && 'IntersectionObserver' in window) {
    var svgObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          svgPath.classList.add('is-drawn');
        }
      });
    }, { threshold: 0.3 });

    svgObserver.observe(svgPath.closest('svg') || svgPath);
  }

  /* ===== Parallax Engine ===== */
  var heroSection = root.querySelector('#top');
  var heroImg = heroSection ? heroSection.querySelector('.hero__bg img') : null;
  var aboutSvg = root.querySelector('.svg-line-draw');
  var marqueeInner = root.querySelector('.works__marquee-inner');
  var svcImg = root.querySelector('.svc__img-wrap img');
  var ctaBoxes = root.querySelectorAll('.cta__box');

  function parallax() {
    var scrollY = window.pageYOffset;
    var winH = window.innerHeight;

    /* Hero parallax */
    if (heroImg) {
      var heroRect = heroSection.getBoundingClientRect();
      if (heroRect.bottom > 0) {
        heroImg.style.transform = 'scale(' + (1.1 - scrollY * 0.0001) + ') translateY(' + (scrollY * 0.3) + 'px)';
      }
    }

    /* About SVG path parallax */
    if (aboutSvg) {
      var svgRect = aboutSvg.getBoundingClientRect();
      if (svgRect.top < winH && svgRect.bottom > 0) {
        var progress = (winH - svgRect.top) / (winH + svgRect.height);
        aboutSvg.style.transform = 'translateY(' + (progress * 30 - 15) + 'px)';
      }
    }

    /* Works marquee parallax */
    if (marqueeInner) {
      var marqueeRect = marqueeInner.getBoundingClientRect();
      if (marqueeRect.top < winH && marqueeRect.bottom > 0) {
        var offset = (winH - marqueeRect.top) * 0.05;
        marqueeInner.style.animationDuration = Math.max(15, 30 - offset) + 's';
      }
    }

    /* Service image parallax */
    if (svcImg) {
      var svcRect = svcImg.getBoundingClientRect();
      if (svcRect.top < winH && svcRect.bottom > 0) {
        var svcProgress = (winH - svcRect.top) / (winH + svcRect.height);
        svcImg.style.transform = 'translateY(' + ((svcProgress - 0.5) * -30) + 'px)';
      }
    }

    /* CTA boxes subtle parallax */
    ctaBoxes.forEach(function(box, i) {
      var boxRect = box.getBoundingClientRect();
      if (boxRect.top < winH && boxRect.bottom > 0) {
        var boxProgress = (winH - boxRect.top) / (winH + boxRect.height);
        box.style.transform = 'translateY(' + ((boxProgress - 0.5) * (i === 0 ? -10 : 10)) + 'px)';
      }
    });

    requestAnimationFrame(parallax);
  }

  requestAnimationFrame(parallax);

  /* ===== Active Nav Link ===== */
  var sections = root.querySelectorAll('section[id]');
  var navLinks = root.querySelectorAll('.header__nav-link');

  function updateActiveNav() {
    var scrollPos = window.pageYOffset + 120;
    sections.forEach(function(section) {
      var top = section.offsetTop;
      var height = section.offsetHeight;
      var id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(function(link) {
          link.classList.remove('is-active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('is-active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav);
  updateActiveNav();

})();
</script>

</div>`,
  },
];
