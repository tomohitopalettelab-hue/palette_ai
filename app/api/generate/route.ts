import { NextResponse } from 'next/server';
import { getOpenAI, GENERATE_MODEL } from '../_lib/openai-client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history, images, system } = body;

    // Build user message content
    const userContent: any[] = [];
    if (message !== undefined && message !== null && String(message).trim() !== '') {
      userContent.push({ type: 'text', text: String(message) });
    }

    // Add images as base64 if present
    if (images && Array.isArray(images)) {
      images.forEach((img: { data: string; mimeType: string }) => {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        });
      });
    }

    const defaultSystemPrompt = `
あなたはWebサイト制作のプロフェッショナルなヒアリング担当者です。
ユーザーからWebサイトの要望を聞き出し、最終的にHTMLのワイヤーフレームを作成することが目標です。

【ヒアリングの進め方】
以下の【必須ヒアリング項目】を埋めるために、不足している情報をユーザーに質問してください。
一度にすべて聞かず、会話の流れに合わせて1つずつ、あるいは関連するものをまとめて質問してください。

【必須ヒアリング項目】
1. **Top**: ヒーローエリア（キャッチコピー、メインビジュアルのイメージ）
2. **Section 1**: コンセプト / 想い
3. **Section 2**: 3つの強み / 特徴（3カラムレイアウト）
4. **Section 3**: サービス内容 / 料金（リスト・カード型）
5. **Section 4**: 制作実績 / ギャラリー（グリッドレイアウト）
6. **Section 5**: 会社概要 / アクセス（表形式。住所、電話番号、営業時間、定休日など詳細を聞いてください）
7. **Footer**: コピーライト等

【画像・ロゴについて】
ヒアリングの途中で必ず「使いたい画像はありますか？ロゴ画像があれば送ってください。」と確認し、ユーザーが画像をアップロードできることを伝えてください。

【ワイヤーフレーム（HTML）作成のルール】
- ヒアリングが完了した、またはユーザーから作成の指示があった場合、HTMLコードを出力してください。
- **構成順序**: 上記の【必須ヒアリング項目】の順番（Top -> Section 1 -> ... -> Section 5 -> Footer）を厳守してください。
- **未確認情報の扱い**: ヒアリングできていない情報（不明な情報）は、**絶対に**ダミーテキストで埋めないでください。そのセクションはHTMLに含めず住所や電話番号などの具体的な情報を絶対に捏造しないか、追加で詳細をヒアリングしてください。
- デザイン: Tailwind CSSを使用し、モダンで洗練されたものにしてください。
- 画像: \`https://placehold.co/600x400\` などのプレースホルダーを使用してください。

回答は親しみやすく、丁寧な口調でお願いします。
`;
    const systemPrompt = system ? String(system) : defaultSystemPrompt;

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((m: any) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: String(m.content),
      })),
    ];

    // Add user message (with images if present)
    if (userContent.length > 0) {
      const hasImages = userContent.some((c: any) => c.type === 'image_url');
      if (hasImages) {
        messages.push({ role: 'user', content: userContent });
      } else {
        messages.push({ role: 'user', content: userContent[0]?.text || '' });
      }
    } else if (messages.length <= 1) {
      messages.push({ role: 'user', content: '' });
    }

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: GENERATE_MODEL,
      messages,
    });

    const text = String(completion.choices?.[0]?.message?.content || '');
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('--- OpenAI Generate error ---', error?.message || error);
    return NextResponse.json(
      { text: `生成エラーが発生しました: ${error?.message || 'Unknown error'}` },
      { status: 500 },
    );
  }
}
