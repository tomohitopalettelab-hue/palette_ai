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

    if (UNSUPPORTED_FEATURE_PATTERN.test(String(message || ''))) {
      return NextResponse.json({ text: UNSUPPORTED_FEATURE_MESSAGE });
    }

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
        - DB由来の情報は、許可された「契約カード（プラン名・期間・金額）」以外を出力しないでください。
        - フェーズ・ステータス・内部管理情報は、ユーザーが聞いても開示しないでください。
        - 契約/料金系の問い合わせは画面側でカード回答するため、通常のヒアリングに必要な質問だけを行ってください。
        0. 顧客への呼称に顧客ID（例: P1111）を使わず、常に「お客様」またはヒアリングで確定した屋号名を使ってください。
        1. 1問1答で進行し、質問は最大10問まで。必要情報が揃えば10問未満で完了してください。
        2. 屋号名（会社名・法人名）は必須です。未確認のままワイヤーフレーム作成に進まないでください。
        3. 屋号名を確認した直後、必ず次の質問で「業種・業態」を確認してください。
        4. 業種が確定したら、その業種に合わせて以降の質問文・選択肢を具体化してください（例: 飲食ならおすすめメニュー/アクセス、士業なら取扱業務/相談導線）。
        4.1. Pal Studio のヒアリングは「1ページのシンプルなHP制作」に必要な情報のみを対象にしてください。
        4.2. 質問順序は必ず「屋号名 → 業種・業態 → 業種に応じた必須項目 → 会社概要（複数選択） → 最終確認」を守ってください。
        4.3. 会社概要の質問は次の文面をそのまま使用してください。
             「最後に、お店の場所や連絡先など、『会社概要』について、どのような情報をお伝えしますか？ (複数選択) (選択肢: 住所、電話番号、営業時間、定休日、アクセス方法、その他)」
        4.4. ユーザーが選択した会社概要項目のみをワイヤーフレームへ反映し、未選択項目（例: 定休日・アクセス）を勝手に追加しないでください。
        5. ワイヤーフレームに含める要素に応じて追加ヒアリングを行ってください。
          - 会社概要/アクセス: 住所・電話・営業時間・定休日
          - お問い合わせフォーム: 必須項目・送信先メール・注意事項
          - 採用情報: 募集職種・雇用形態・勤務地・応募方法
          - 実績紹介: 実績ジャンル・件数感・見せ方
        5.5. 基本は「1ページのシンプルなHP」前提で進め、ユーザーが明示しない限り予約機能・ブログ投稿機能・会員機能などの拡張機能は質問しないでください。
        5.6. ユーザーがセクション構成を提示した場合は、その構成を最優先し、セクション外の追加要求はしないでください。
        5.7. 拡張機能（予約、ブログ、会員、EC等）を要望された場合は、実装可否を曖昧にせず「プランアップするか、Palette Labへお問い合わせください。」を案内してください。
        6. 不足情報はダミーで埋めず、必ず質問で回収してください。
        7. 選択式で答えられる問いは「(選択肢: A、B、C)」形式で提示し、複数回答を想定する場合は必ず「(複数選択)」を明記してください。「(2択)」や「(単一選択)」のタグは使わないでください。
        8. ワイヤーフレーム作成時は以下のスタイルガイド（${wireframeStyle}）を含め、グレー・白・黒・点線・実線のみで設計図として表現してください。
        9. 最後は必ず「こちらの構成でよろしいでしょうか？（OKであればその旨お伝えください）」と質問してください。
        10. ワイヤーフレームに含めるセクションは、ヒアリングで確定した項目だけに限定してください。ユーザーが指定していないセクション（例: ストーリー、お客様の声、採用情報）は自動追加しないでください。
        11. ただし footer セクション（コピーライト、屋号名、連絡先の簡易表記など）は必須です。ヒアリング項目に含まれなくても、必ずページ最下部に配置してください。
        12. 「ワイヤーフレームを作成します」「このまま進めます」と宣言する場合は、同じ回答内でHTMLコード（htmlコードブロック形式）まで必ず出力してください。案内文だけで終了しないでください。`;

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
    let usedModel = models[0] || 'gemini-2.5-flash-lite';
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
        usedModel = mdl;
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

    let text = String((response as any).text || '')
      .replace(/[（(]\s*(?:2択|二択|単一選択)\s*[）)]/gi, '')
      .replace(/\b[A-Z][0-9]{4}\s*様/g, 'お客様');

    const hasHtmlOutput = /```html[\s\S]*?```|<(?:!DOCTYPE|html|head|body|main|section|div|header|footer|article|nav|style)\b/i.test(text);
    const looksLikeWireframeFlow = /(ワイヤーフレーム|構成案|最終確認|作成いたします|作成します|進めさせていただきます|この構成を参考に制作させていただきます|3\s*[〜~\-]\s*5営業日|３\s*[〜~\-]\s*５営業日|楽しみにお待ちください)/.test(text);

    if (!isApproved && looksLikeWireframeFlow && !hasHtmlOutput) {
      try {
        const fallback = await ai.models.generateContent({
          model: usedModel,
          config: {
            systemInstruction: `${systemInstruction}\n\n追加ルール: この回答では必ずワイヤーフレームHTMLを返してください。\n- 返答は \`\`\`html ... \`\`\` 形式\n- footer を必ず含める\n- 説明文だけで終わらない`,
          },
          contents: [
            ...contentsBase,
            { role: 'user', parts: [{ text: '上記ヒアリング内容で、今すぐワイヤーフレームHTMLを出力してください。' }] },
          ],
        });

        const fallbackText = String((fallback as any).text || '').trim();
        if (fallbackText) {
          text = fallbackText
            .replace(/[（(]\s*(?:2択|二択|単一選択)\s*[）)]/gi, '')
            .replace(/\b[A-Z][0-9]{4}\s*様/g, 'お客様');
        }
      } catch (fallbackError) {
        console.warn('wireframe html fallback failed', fallbackError);
      }
    }

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("--- Gemini API 実行エラー ---");
    return NextResponse.json({ text: "現在AIが混み合っています。少し時間をおいてもう一度お試しください。" }, { status: 200 });
  }
}
