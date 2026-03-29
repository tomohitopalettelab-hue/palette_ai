import { NextResponse } from 'next/server';
import { palDbGet } from '../_lib/pal-db-client';
import { SERVICE_URLS } from '../_lib/service-ports';
import { getOpenAI, CHAT_MODEL } from '../_lib/openai-client';

/**
 * WEBマーケティング相談API
 *
 * 顧客の業種・契約サービス・未契約サービスをもとに、
 * AIがWEBマーケターとしてアドバイスする。
 * 契約サービスで「今できること」を伝えつつ、
 * 未契約サービスを自然に提案する。
 */

type ServiceInfo = {
  key: string;
  name: string;
  description: string;
  features: string[];
  contracted: boolean;
  planName?: string;
  planTier?: string;
};

const SERVICE_CATALOG: Record<string, { name: string; description: string; features: string[] }> = {
  pal_studio: {
    name: 'Pal Studio',
    description: 'ホームページ・LP制作',
    features: [
      'プロ品質の1ページHP/LPを制作',
      'スマホ対応レスポンシブデザイン',
      'ブログ・ニュース記事の投稿・管理',
      'SEOに強い構造で集客力アップ',
    ],
  },
  pal_video: {
    name: 'Pal Video',
    description: '動画コンテンツ制作',
    features: [
      'SNS向けプロモーション動画を制作',
      'Instagram/TikTok/YouTube対応',
      'テンプレートから短時間で制作',
      '動画広告やリール・ストーリーズ用にも対応',
    ],
  },
  pal_trust: {
    name: 'Pal Trust',
    description: '口コミ・レビュー管理',
    features: [
      'Googleビジネスプロフィールの口コミを一元管理',
      'AIが口コミへの返信案を自動生成',
      '満足度アンケートで顧客の声を収集',
      '口コミからSNS投稿素材を自動生成',
    ],
  },
  pal_opt: {
    name: 'Pal Opt',
    description: 'SNS・コンテンツ運用代行',
    features: [
      'Instagram/ブログ/Googleビジネスプロフィールへ投稿代行',
      'AIが投稿コンテンツ（テキスト+画像）を自動生成',
      '投稿スケジュール管理',
      '複数プラットフォームに一括投稿',
    ],
  },
  pal_base: {
    name: 'Pal Base',
    description: 'マーケティング素材制作',
    features: [
      'バナー・チラシ・クーポンをAI生成',
      'LINEリッチメニューの作成・配信',
      'キャンペーン素材をすぐに用意',
      'Pal Optと連携してSNSにそのまま投稿可能',
    ],
  },
  pal_ad: {
    name: 'Pal Ad',
    description: '広告運用',
    features: [
      'Google広告・Instagram広告などの運用支援',
      'AIが広告コピーを自動生成',
      'ターゲティング設定のサポート',
      '効果測定・KPI管理',
    ],
  },
};

const planCodeToServiceKey = (code: string): string | null => {
  const c = String(code || '').toLowerCase();
  if (c.startsWith('pal_studio')) return 'pal_studio';
  if (c.startsWith('pal_video')) return 'pal_video';
  if (c.startsWith('pal_trust')) return 'pal_trust';
  if (c.startsWith('pal_opt')) return 'pal_opt';
  if (c.startsWith('pal_base')) return 'pal_base';
  if (c.startsWith('pal_ad')) return 'pal_ad';
  if (c.includes('palette_ai') || c.startsWith('ai_')) return 'palette_ai';
  return null;
};

const extractTier = (code: string): string => {
  const c = String(code || '').toLowerCase();
  if (c.includes('pro')) return 'Pro';
  if (c.includes('standard')) return 'Standard';
  if (c.includes('lite')) return 'Lite';
  return '';
};

const fetchKpiSafe = async (serviceKey: string, paletteId: string): Promise<any | null> => {
  const baseUrl = SERVICE_URLS[serviceKey];
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}/api/kpi?cid=${encodeURIComponent(paletteId)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
};

const buildSystemPrompt = (
  customerName: string,
  industry: string,
  contractedServices: ServiceInfo[],
  uncontractedServices: ServiceInfo[],
  kpiSummaries: string[],
  userMessage: string,
): string => {
  const contractedBlock = contractedServices.length
    ? contractedServices
        .map((s) => `  - ${s.name}（${s.planTier || ''}プラン）: ${s.features.join(' / ')}`)
        .join('\n')
    : '  （現在契約サービスなし）';

  const uncontractedBlock = uncontractedServices.length
    ? uncontractedServices
        .map((s) => `  - ${s.name}: ${s.description} → ${s.features.slice(0, 2).join(' / ')}`)
        .join('\n')
    : '';

  const kpiBlock = kpiSummaries.length
    ? `\n## 現在のサービス利用状況\n${kpiSummaries.join('\n')}`
    : '';

  return `あなたはPalette Labの敏腕WEBマーケティングコンサルタントです。
顧客の相談に対し、実践的なWEBマーケティングのアドバイスをしてください。

## 顧客情報
- 顧客名: ${customerName}
- 業種: ${industry || '不明'}

## 契約中のサービス（この範囲で「今すぐできること」を提案）
${contractedBlock}
${kpiBlock}

## 未契約のサービス（自然に紹介する候補）
${uncontractedBlock || '  （すべて契約済み）'}

## あなたの行動指針
1. まずWEBマーケターとして相談に親身に答える。これが最優先。
2. 契約中サービスで今すぐできる施策を具体的に提案する。
3. 話の流れで自然に未契約サービスに触れる。ただし：
   - 「営業」「売り込み」感を絶対に出さない
   - 「〇〇もできたら効果的ですよね」くらいの温度感
   - 相談内容と関係ない未契約サービスには触れない
   - 1回の回答で紹介する未契約サービスは最大1つ
4. 具体的な数字や事例を交えてアドバイスする。
5. 回答は300文字程度。長すぎない。
6. 顧客を「${customerName}様」と呼ぶ。
7. HTMLやコードブロックは出力しない。
8. 番号付きリスト（1. 2. 3.）は使わない。段落や「・」で区切る。
9. 質問形式（？で終わる文）は1つまで。複数の質問を一度に聞かない。

## 顧客の相談内容
${userMessage}`;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paletteId = String(body?.paletteId || '').trim().toUpperCase();
    const message = String(body?.message || '').trim();
    const history: any[] = Array.isArray(body?.history) ? body.history : [];

    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'paletteId is required' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 });
    }

    // 1. Get customer info + contracted services
    let summaryData: any = {};
    try {
      const summaryRes = await palDbGet(`/api/palette-summary?paletteId=${encodeURIComponent(paletteId)}`);
      summaryData = await summaryRes.json().catch(() => ({}));
    } catch (err: any) {
      console.error('marketing-advisor: palette-summary fetch failed:', err?.message);
    }
    const customerName = summaryData?.account?.name || 'お客様';
    const industry = summaryData?.account?.industry || '';

    const contracts: any[] = Array.isArray(summaryData?.contracts) ? summaryData.contracts : [];
    const plans: any[] = Array.isArray(summaryData?.plans) ? summaryData.plans : [];
    const planMap = new Map(plans.map((p: any) => [String(p.id), p]));

    // Build contracted service info
    const contractedKeys = new Set<string>();
    const contractedServices: ServiceInfo[] = [];
    for (const contract of contracts) {
      const plan = planMap.get(String(contract.planId));
      const code = plan?.code || '';
      const key = planCodeToServiceKey(code);
      if (!key || key === 'palette_ai' || contractedKeys.has(key)) continue;
      contractedKeys.add(key);
      const catalog = SERVICE_CATALOG[key];
      if (catalog) {
        contractedServices.push({
          key,
          name: catalog.name,
          description: catalog.description,
          features: catalog.features,
          contracted: true,
          planName: plan?.name || '',
          planTier: extractTier(code),
        });
      }
    }

    // Build uncontracted service info
    const uncontractedServices: ServiceInfo[] = [];
    for (const [key, catalog] of Object.entries(SERVICE_CATALOG)) {
      if (!contractedKeys.has(key)) {
        uncontractedServices.push({
          key,
          name: catalog.name,
          description: catalog.description,
          features: catalog.features,
          contracted: false,
        });
      }
    }

    // 2. Fetch KPIs for contracted services
    const kpiPromises = contractedServices.map(async (s) => {
      const data = await fetchKpiSafe(s.key, paletteId);
      if (!data) return null;
      return { service: s.name, kpi: data?.kpi, health: data?.health };
    });
    const kpiResults = (await Promise.all(kpiPromises)).filter(Boolean);
    const kpiSummaries = kpiResults.map((r: any) => {
      const health = r.health === 'red' ? '要改善' : r.health === 'yellow' ? '注意' : '良好';
      return `- ${r.service}: ${health} / ${JSON.stringify(r.kpi || {})}`;
    });

    // 3. Generate AI response
    const systemPrompt = buildSystemPrompt(
      customerName, industry,
      contractedServices, uncontractedServices,
      kpiSummaries, message,
    );

    const chatMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(history.slice(-6).map((m: any) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: String(m.content).slice(0, 500),
      }))),
      { role: 'user', content: message },
    ];

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: chatMessages,
    });

    const text = String(completion.choices?.[0]?.message?.content || '')
      .replace(/\b[A-Z][0-9]{4}\s*様/g, `${customerName}様`)
      .trim();

    return NextResponse.json({
      success: true,
      text,
      contractedServices: contractedServices.map((s) => ({
        key: s.key,
        name: s.name,
        description: s.description,
      })),
      uncontractedServices: uncontractedServices.map((s) => ({
        key: s.key,
        name: s.name,
        description: s.description,
        features: s.features,
      })),
    });
  } catch (error: any) {
    console.error('marketing-advisor error:', error);
    return NextResponse.json(
      { success: false, error: 'マーケティング相談中にエラーが発生しました。' },
      { status: 500 },
    );
  }
}
