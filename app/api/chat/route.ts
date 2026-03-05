import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';
import { palDbGet } from '../_lib/pal-db-client';

const PALETTE_ID_PATTERN = /\b([A-Za-z][0-9]{4})\b/;
const SERVICE_QUERY_PATTERN = /(顧客ID|paletteid|サービス|契約|プラン|内容|案内|確認|照会|教えて)/i;

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

  return [
    `顧客ID ${paletteId}（${accountName}）のサービス内容です。`,
    ...lines,
  ].join('\n');
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
      return NextResponse.json({ text: "APIキーが設定されていません。" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const body = await req.json();
    const { message, history, system } = body;

    const serviceSummary = await tryFetchServiceSummary(String(message || ''));
    if (serviceSummary) {
      return NextResponse.json({ text: serviceSummary });
    }

    // --- 修正点1: 判定の厳格化 ---
    // 文中にOKが含まれるだけで反応しないよう、完全一致に近い判定に変更
    const isApproved = /^(OK|いいよ|進めて|お願い|完璧|確定|大丈夫です)$/i.test(message.trim());

    const wireframeStyle = `
      <style>
        .wf-container { font-family: 'Inter', sans-serif; color: #333; background: #fff; line-height: 1.6; }
        .wf-section { border: 2px dashed #ccc; margin: 20px 0; padding: 40px 20px; text-align: center; background: #f9f9f9; position: relative; }
        .wf-section::before { content: attr(data-label); position: absolute; top: 5px; left: 10px; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
        .wf-box { border: 1px solid #ddd; background: #eee; min-height: 100px; display: flex; align-items: center; justify-content: center; margin: 10px auto; }
        .wf-heading { font-size: 24px; font-weight: bold; border-bottom: 2px solid #333; display: inline-block; margin-bottom: 20px; padding-bottom: 5px; }
        .wf-text { color: #666; max-width: 600px; margin: 0 auto; }
        .wf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
        .wf-btn { border: 2px solid #333; padding: 10px 20px; display: inline-block; font-weight: bold; margin-top: 15px; }
      </style>
    `;

    // --- 修正点2: プロンプトの受け渡し ---
    // フロント側から届く message (systemContext) を AI への命令として優先的に組み込む
    const baseSystem = system && String(system).trim().length > 0
      ? String(system)
      : 'あなたはプロのWebデザイナーです。ユーザーの要望を丁寧にヒアリングし、必要に応じてHTMLワイヤーフレームを作成します。';

    const systemInstruction = isApproved 
      ? `あなたはディレクターです。以下の案内メッセージのみを、HTMLを含めずプレーンテキストで返してください。
          「ありがとうございます！ヒアリング内容をLabに保存しました。管理画面で確認できます。」`
      : `${baseSystem}

         あなたは超一流のWebディレクターです。構造的で美しいワイヤーフレームをHTMLで作成してください。
         【ルール】
        1. 1問1答で進行し、質問は最大10問まで。必要情報が揃えば10問未満で完了してください。
        2. 屋号名（会社名・法人名）は必須です。未確認のままワイヤーフレーム作成に進まないでください。
        3. 屋号名を確認した直後、必ず次の質問で「業種・業態」を確認してください。
        4. 業種が確定したら、その業種に合わせて以降の質問文・選択肢を具体化してください（例: 飲食ならメニュー/予約/アクセス、士業なら取扱業務/料金/相談導線）。
        5. ワイヤーフレームに含める要素に応じて追加ヒアリングを行ってください。
          - 会社概要/アクセス: 住所・電話・営業時間・定休日
          - お問い合わせフォーム: 必須項目・送信先メール・注意事項
          - 採用情報: 募集職種・雇用形態・勤務地・応募方法
          - 実績紹介: 実績ジャンル・件数感・見せ方
        6. 不足情報はダミーで埋めず、必ず質問で回収してください。
        7. 選択式で答えられる問いは「(選択肢: A、B、C)」形式で提示し、複数回答を想定する場合は必ず「(複数選択)」を明記してください。
        8. ワイヤーフレーム作成時は以下のスタイルガイド（${wireframeStyle}）を含め、グレー・白・黒・点線・実線のみで設計図として表現してください。
        9. 最後は必ず「こちらの構成でよろしいでしょうか？（OKであればその旨お伝えください）」と質問してください。`;

    // チャット専用モデルリスト（重い場合に自動で軽量モデルへフォールバック）
    const models = (
      process.env.CHAT_MODEL_LIST ||
      process.env.CHAT_MODEL ||
      "gemini-2.5-flash-lite,gemini-2.5-flash"
    )
      .split(",")
      .map(m => m.trim())
      .filter(Boolean);
    let response;
    let lastError: any = null;

    // テキスト送信内容を構築。OK承認時は履歴も元のメッセージも含めず、
    // シンプルな「お礼メッセージだけを返す」指示を確実に優先させる。
    const contentsBase: any[] = [];
    if (!isApproved) {
      contentsBase.push(
        ...(history || []).map((m: any) => ({
          role: m.role === 'ai' ? 'model' : 'user',
          parts: [{ text: String(m.content) }],
        })),
        { role: 'user', parts: [{ text: String(message || '') }] }
      );
    } else {
      contentsBase.push({ role: 'user', parts: [{ text: 'OK' }] });
    }

    // 複数モデルで順に試す（速度優先のため各モデル1回のみ）
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
        break; // success with this model
      } catch (err: any) {
        lastError = err;
        console.warn(`chat generate model ${mdl} failed`, err?.message || err);
      }
      if (!lastError) break; // succeeded
      // else try next model
    }
    if (lastError || !response) throw lastError || new Error("Unable to generate response from any model");

    const text = (response as any).text;
    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("--- Gemini API 実行エラー ---");
    return NextResponse.json({ text: "現在AIが混み合っています。少し時間をおいてもう一度お試しください。" }, { status: 200 });
  }
}
