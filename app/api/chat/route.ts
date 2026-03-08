import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';
import { palDbGet } from '../_lib/pal-db-client';

const PALETTE_ID_PATTERN = /\b([A-Za-z][0-9]{4})\b/;
const SERVICE_QUERY_PATTERN = /(顧客ID|paletteid|サービス|契約|プラン|内容|案内|確認|照会|教えて)/i;
const UNSUPPORTED_FEATURE_PATTERN = /(ブログ投稿|ブログ機能|投稿機能|ニュース投稿|予約機能|予約フォーム|会員機能|マイページ|EC機能|決済機能|チャットボット実装|LINE連携|在庫管理)/i;
const UNSUPPORTED_FEATURE_MESSAGE = 'ブログとか投稿系とか予約機能とか、いま提示した条件いがいのことは、現在のプランでは実装できないので、プランアップするか、Palette Labへお問い合わせください。';

const formatDate = (raw?: string | null): string => {
  if (!raw) return '未設定';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString('ja-JP');
};

const buildServiceSummaryText = (summary: any, paletteId: string): string => {
  const accountName = summary?.account?.name || '顧客名未設定';
  const contracts: any[] = Array.isArray(summary?.contracts) ? summary.contracts : [];
  const plans: any[] = Array.isArray(summary?.plans) ? summary.plans : [];

  if (!contracts.length) {
    return `顧客ID ${paletteId}（${accountName}）の有効なサービス情報は現在登録されていません。`;
  }

  const planMap = new Map<string, any>(plans.map((plan) => [String(plan.id), plan]));
  const lines = contracts.map((contract, index) => {
    const plan = planMap.get(String(contract.planId));
    const planName = plan?.name || '不明なプラン';
    const phase = contract?.phase || '未設定';
    const status = contract?.status || '未設定';
    const startDate = formatDate(contract?.startDate);
    const endDate = contract?.endDate ? formatDate(contract.endDate) : '継続中';
    const price = Number(contract?.priceYen || 0).toLocaleString('ja-JP');
    return `${index + 1}. ${planName} / フェーズ: ${phase} / ステータス: ${status} / 期間: ${startDate}〜${endDate} / 月額: ¥${price}`;
  });

  return [`顧客ID ${paletteId}（${accountName}）のサービス内容です。`, ...lines].join('\n');
};

const tryFetchServiceSummary = async (message: string): Promise<string | null> => {
  if (!SERVICE_QUERY_PATTERN.test(message)) return null;

  const match = String(message || '').match(PALETTE_ID_PATTERN);
  if (!match) return null;

  const paletteId = match[1].toUpperCase();
  const params = new URLSearchParams();
  params.set('paletteId', paletteId);

  try {
    const response = await palDbGet(`/api/palette-summary?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      return `顧客ID ${paletteId} のサービス情報が見つかりませんでした。IDをご確認ください。`;
    }

    return buildServiceSummaryText(data, paletteId);
  } catch (error) {
    console.error('service summary fetch error:', error);
    return 'サービス情報の取得中にエラーが発生しました。時間をおいて再度お試しください。';
  }
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ text: 'APIキーが設定されていません。' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const body = await req.json();
    const { message, history, system } = body;

    if (UNSUPPORTED_FEATURE_PATTERN.test(String(message || ''))) {
      return NextResponse.json({ text: UNSUPPORTED_FEATURE_MESSAGE });
    }

    const serviceSummary = await tryFetchServiceSummary(String(message || ''));
    if (serviceSummary) {
      return NextResponse.json({ text: serviceSummary });
    }

    const baseSystem = system && String(system).trim().length > 0
      ? String(system)
      : 'あなたはプロのWebディレクターです。Web制作のヒアリングを1問1答で丁寧に進めます。';

    const systemInstruction = `${baseSystem}

あなたはヒアリング担当です。次の制約を守ってください。
- 回答は常に「次に確認すべき1つの質問」のみを返す。
- HTMLコード、コードブロックは出力しない。
- 回答完了メッセージ（ありがとうございました等）で会話を終了しない。
- 顧客IDで呼ばず「お客様」または確定した屋号名で呼ぶ。`;

    const models = (
      process.env.CHAT_MODEL_LIST ||
      process.env.CHAT_MODEL ||
      'gemini-2.5-flash-lite'
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    let response: any = null;
    let lastError: any = null;

    const contentsBase: any[] = [
      ...(history || []).map((m: any) => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      })),
      { role: 'user', parts: [{ text: String(message || '') }] },
    ];

    for (const mdl of models) {
      try {
        response = await ai.models.generateContent({
          model: mdl,
          config: {
            systemInstruction,
          },
          contents: contentsBase,
        });
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`chat generate model ${mdl} failed`, err?.message || err);
      }
    }

    if (lastError || !response) {
      throw lastError || new Error('Unable to generate response from any model');
    }

    const text = String((response as any).text || '')
      .replace(/[（(]\s*(?:2択|二択|単一選択)\s*[）)]/gi, '')
      .replace(/\b[A-Z][0-9]{4}\s*様/g, 'お客様');

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('--- Gemini API 実行エラー ---');
    return NextResponse.json({ text: '現在AIが混み合っています。少し時間をおいてもう一度お試しください。' }, { status: 200 });
  }
}
