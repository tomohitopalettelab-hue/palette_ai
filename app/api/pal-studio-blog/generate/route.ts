import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const MODELS = (
  process.env.GENERATE_MODEL_LIST ||
  process.env.CHAT_MODEL_LIST ||
  'gemini-2.5-flash,gemini-2.5-flash-lite'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = String(body.topic || '').trim();
    const keywords = String(body.keywords || '').trim();
    const target = String(body.target || '一般').trim();
    const imageUrl = String(body.imageUrl || '').trim();
    const shopName = String(body.shopName || '').trim();

    if (!topic) {
      return NextResponse.json({ error: 'topic は必須です。' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_GENERATIVE_AI_API_KEY が未設定です。' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `あなたはSEO対策に精通したブログライターです。
以下の情報をもとに、読者に価値を提供するブログ記事を生成してください。

【テーマ】${topic}
【SEOキーワード】${keywords || 'なし'}
【ターゲット読者】${target}
【店舗・サービス名】${shopName || ''}

以下のJSON形式のみで出力してください（コードブロック不要）:
{
  "title": "記事タイトル（40文字以内、主要キーワードを含める）",
  "slug": "english-url-friendly-slug",
  "bodyHtml": "記事本文HTML（h2見出し2〜3個、pタグで段落、必要に応じulリスト、1000〜1500文字相当）",
  "excerpt": "記事概要（100文字以内）",
  "tags": ["タグ1", "タグ2", "タグ3"]
}

bodyHtmlはHTMLコードとして出力してください。マークダウン・コードブロック不可。`;

    let result: { text: string } | null = null;

    for (const model of MODELS) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' },
        });
        result = res as unknown as { text: string };
        break;
      } catch (err) {
        console.warn(`[pal-studio-blog/generate] model ${model} failed:`, err);
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'コンテンツ生成に失敗しました。' }, { status: 500 });
    }

    const raw = String((result as unknown as { text: string }).text || '');
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'レスポンスのパースに失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      title: String(parsed.title || ''),
      slug: String(parsed.slug || ''),
      bodyHtml: String(parsed.bodyHtml || ''),
      excerpt: String(parsed.excerpt || ''),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      imageUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
