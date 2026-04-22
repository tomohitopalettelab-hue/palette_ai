import { NextResponse } from 'next/server';
import { getOpenAI, CHAT_MODEL } from '../../../../_lib/openai-client';
import {
  upsertBotConfig,
  upsertService,
  upsertFaq,
  listServices,
  listFaqs,
  DEFAULT_CONFIG,
} from '../../../../_lib/bot-store';

/**
 * POST /api/admin/bot-settings/[paletteId]/auto-setup
 * { url: string }
 *
 * HPを取得してAIで解析、botの初期設定を自動生成する。
 * - HTML fetch → テキスト抽出
 * - OpenAIで構造化JSON抽出
 * - bot_configs / bot_services / bot_faqs に書き込み
 */

const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3MB
const FETCH_TIMEOUT_MS = 15000;

// HTMLからテキストを抽出（script/styleを除外）
const stripHtml = (html: string): string => {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractTitle = (html: string): string => {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim() : '';
};

const extractMetaDescription = (html: string): string => {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  return m ? m[1].trim() : '';
};

const fetchHtml = async (url: string): Promise<{ title: string; metaDesc: string; text: string } | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PaletteBotAutoSetup/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) return null;
    const html = new TextDecoder('utf-8').decode(buf);

    const title = extractTitle(html);
    const metaDesc = extractMetaDescription(html);
    const text = stripHtml(html).slice(0, 12000); // AIに渡すのは最大12000文字

    return { title, metaDesc, text };
  } catch (err) {
    console.warn('fetchHtml error:', err);
    return null;
  }
};

type ExtractedData = {
  basic: {
    shopName?: string;
    industry?: string;
    catchphrase?: string;
    intro?: string;
    area?: string;
    businessHours?: string;
    closedDays?: string;
  };
  tone: {
    personality?: string;
    replyLength?: string;
    emoji?: string;
  };
  services: Array<{
    name: string;
    price?: string;
    duration?: string;
    description?: string;
    targetTags?: string[];
    problemTags?: string[];
    features?: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
    category?: string;
  }>;
  welcomeMessage: string;
};

const buildPrompt = (url: string, title: string, metaDesc: string, text: string): string => {
  return `あなたはWEBマーケティングのプロで、企業HPを解析して営業チャットBotの初期設定を作る専門家です。
以下のHP情報から、営業Bot設定のための構造化データをJSONで抽出してください。

## HP情報
URL: ${url}
タイトル: ${title}
メタディスクリプション: ${metaDesc}

## HP本文（抜粋）
${text}

## 抽出タスク
以下の形式でJSONのみ返してください（余計な文字列は一切不要）。不明な項目は空文字列または空配列で可。

{
  "basic": {
    "shopName": "屋号・会社名（確定分のみ）",
    "industry": "業種（例: 美容室、整体院、工務店、WEBマーケティング）",
    "catchphrase": "30文字以内のキャッチコピー",
    "intro": "どんなお店/会社か100文字以内で簡潔に",
    "area": "対応エリア（地名等）",
    "businessHours": "営業時間（例: 10:00-19:00）",
    "closedDays": "定休日（例: 月曜、日祝）"
  },
  "tone": {
    "personality": "親しみやすい | 丁寧 | プロっぽい | 癒し系 | 元気 のいずれか",
    "replyLength": "短め | 普通 | 長め のいずれか",
    "emoji": "多め | 少なめ | なし のいずれか"
  },
  "services": [
    {
      "name": "サービス名",
      "price": "価格（わかれば。未記載なら空文字）",
      "duration": "所要時間（わかれば）",
      "description": "サービス概要（80文字以内）",
      "targetTags": ["こんな方におすすめ", "タグ"],
      "problemTags": ["解決できる悩み", "タグ"],
      "features": "アピールポイント（80文字以内）"
    }
  ],
  "faqs": [
    {
      "question": "よくある質問1",
      "answer": "簡潔な回答（100文字以内）",
      "category": "料金 | 予約 | 施術内容 | アクセス など"
    }
  ],
  "welcomeMessage": "訪問者への最初の挨拶文（60文字以内、業種とトーンに合わせる）"
}

## 注意
- servicesは最大6個まで
- faqsは最大10個まで
- targetTags / problemTags は各サービスに3-5個つける
- HP本文にない情報は空文字で。勝手に作らないこと
- 価格・住所・電話番号など具体情報は明記されたもののみ使用`;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    let url = String(body?.url || '').trim();
    if (!url) {
      return NextResponse.json({ success: false, error: 'url is required' }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    // 1. HPをfetchしてテキスト抽出
    const fetched = await fetchHtml(url);
    if (!fetched) {
      return NextResponse.json({ success: false, error: 'HPの取得に失敗しました。URLを確認してください。' }, { status: 400 });
    }

    // 2. OpenAIで解析
    const prompt = buildPrompt(url, fetched.title, fetched.metaDesc, fetched.text);
    const openai = getOpenAI();

    let extracted: ExtractedData;
    try {
      const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: 'あなたはHPを解析してJSONで情報抽出する専門家です。必ずJSONのみを返してください。' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      });
      const rawText = String(completion.choices?.[0]?.message?.content || '{}');
      extracted = JSON.parse(rawText);
    } catch (err: any) {
      console.error('auto-setup AI error:', err?.message);
      return NextResponse.json({ success: false, error: 'AI解析に失敗しました。時間をおいて再度お試しください。' }, { status: 500 });
    }

    // 3. bot_configs に書き込み
    const configUpdate = {
      paletteId,
      basic: extracted.basic || {},
      tone: {
        ...DEFAULT_CONFIG.tone,
        personality: (extracted.tone?.personality as any) || DEFAULT_CONFIG.tone.personality,
        replyLength: (extracted.tone?.replyLength as any) || DEFAULT_CONFIG.tone.replyLength,
        emoji: (extracted.tone?.emoji as any) || DEFAULT_CONFIG.tone.emoji,
      },
      conversation: {
        ...DEFAULT_CONFIG.conversation,
        welcomeMessage: extracted.welcomeMessage || DEFAULT_CONFIG.conversation.welcomeMessage,
      },
      goals: DEFAULT_CONFIG.goals,
      nurture: DEFAULT_CONFIG.nurture,
      appearance: DEFAULT_CONFIG.appearance,
      ngRules: DEFAULT_CONFIG.ngRules,
    };
    await upsertBotConfig(configUpdate);

    // 4. bot_services を洗い替え（既存削除ではなく追加のみ、既存名との重複は避ける）
    const existingServices = await listServices(paletteId);
    const existingNames = new Set(existingServices.map((s) => s.name));
    let servicesCreated = 0;
    const services = Array.isArray(extracted.services) ? extracted.services.slice(0, 6) : [];
    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (!s.name || existingNames.has(s.name)) continue;
      await upsertService({
        paletteId,
        name: String(s.name),
        price: s.price || '',
        duration: s.duration || '',
        description: s.description || '',
        targetTags: Array.isArray(s.targetTags) ? s.targetTags.slice(0, 8) : [],
        problemTags: Array.isArray(s.problemTags) ? s.problemTags.slice(0, 8) : [],
        features: s.features || '',
        sortOrder: existingServices.length + i,
        active: true,
      });
      servicesCreated++;
    }

    // 5. bot_faqs を追加
    const existingFaqs = await listFaqs(paletteId);
    const existingQuestions = new Set(existingFaqs.map((f) => f.question));
    let faqsCreated = 0;
    const faqs = Array.isArray(extracted.faqs) ? extracted.faqs.slice(0, 10) : [];
    for (const f of faqs) {
      if (!f.question || !f.answer || existingQuestions.has(f.question)) continue;
      await upsertFaq({
        paletteId,
        question: String(f.question),
        answer: String(f.answer),
        category: f.category || '',
        priority: 3,
      });
      faqsCreated++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        url,
        basic: extracted.basic,
        servicesCreated,
        faqsCreated,
        totalServicesProposed: services.length,
        totalFaqsProposed: faqs.length,
      },
    });
  } catch (error: any) {
    console.error('auto-setup error:', error?.message || error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
