import { getOpenAI, CHAT_MODEL } from './openai-client';
import {
  BotConfig,
  BotService,
  BotFaq,
  BotSession,
  BotMessage,
  getBotConfigOrDefault,
  listServices,
  listFaqs,
  createSession,
  getSession,
  updateSession,
} from './bot-store';

// ============================================================
// Types
// ============================================================

export type BotStage = 'hearing' | 'introduction' | 'closing' | 'nurture' | 'fallback' | 'closed';

export type ServiceCard = {
  serviceId: string;
  name: string;
  price: string;
  duration: string;
  features: string;
  description: string;
  testimonial?: string;
};

export type ClosingCta = {
  key: string;           // reservation|inquiry|phone|line|document
  label: string;
  url?: string;
  number?: string;
};

export type NurtureOption = {
  type: string;
  label: string;
  message?: string;
  url?: string;
};

export type LeadAsk = {
  field: string;         // name|phone|email|preferredTime
  label: string;
  required: boolean;
};

export type BotUiResponse =
  | { type: 'text' }
  | { type: 'cards'; cards: ServiceCard[] }
  | { type: 'closing_cta'; cta: ClosingCta; extraCta?: ClosingCta }
  | { type: 'lead_form'; fields: LeadAsk[] }
  | { type: 'nurture_options'; options: NurtureOption[] };

export type BotTurnResult = {
  sessionId: string;
  reply: string;
  stage: BotStage;
  buyIntentScore: number;
  ui: BotUiResponse;
};

// ============================================================
// AI response schema
// ============================================================

type AiResponse = {
  reply: string;
  next_stage: BotStage;
  buy_intent_score: number;        // 1-5
  matched_service_ids: string[];
  ui_hint: 'text' | 'cards' | 'closing_cta' | 'lead_form' | 'nurture_options';
  lead_ask: string | null;         // 'name' | 'phone' | 'email' | 'preferredTime'
  closing_cta_key: string | null;  // 'reservation' etc
  reasoning?: string;
};

// ============================================================
// System prompt builders
// ============================================================

const buildToneInstruction = (config: BotConfig): string => {
  const t = config.tone || {};
  return `
- 性格: ${t.personality || '親しみやすい'}
- 呼称: ${t.honorific || 'お客様'}
- 敬語レベル: ${t.keigoLevel || '丁寧語'}
- 一人称: ${t.firstPerson || '私'}
- 絵文字: ${t.emoji || '少なめ'}
- 返答の長さ: ${t.replyLength || '普通'}`.trim();
};

const buildServiceCatalog = (services: BotService[]): string => {
  if (!services.length) return '（未登録）';
  return services.map((s) => `
[id=${s.id}]
- サービス名: ${s.name}
- 価格: ${s.price || '要見積もり'}
- 所要時間: ${s.duration || '未定'}
- 概要: ${s.description || ''}
- おすすめタグ: ${(s.targetTags || []).join('、') || '（なし）'}
- 悩みタグ: ${(s.problemTags || []).join('、') || '（なし）'}
- アピール: ${s.features || ''}
`.trim()).join('\n\n');
};

const buildFaqBlock = (faqs: BotFaq[]): string => {
  if (!faqs.length) return '';
  return faqs.slice(0, 20).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
};

const buildGoalsBlock = (config: BotConfig): string => {
  const g = config.goals || {};
  const parts: string[] = [];
  if (g.reservation?.enabled) parts.push('reservation（予約）');
  if (g.inquiry?.enabled) parts.push('inquiry（問い合わせ）');
  if (g.phone?.enabled) parts.push('phone（電話）');
  if (g.line?.enabled) parts.push('line（LINE登録）');
  if (g.document?.enabled) parts.push('document（資料請求）');
  return parts.length ? parts.join(' / ') : '（未設定）';
};

const buildSystemPrompt = (
  config: BotConfig,
  services: BotService[],
  faqs: BotFaq[],
  session: BotSession,
): string => {
  const basic = config.basic || {};
  const conv = config.conversation || {};
  const ng = config.ngRules || {};
  const forbidden = Array.isArray(ng.forbiddenTopics) ? ng.forbiddenTopics.join(' / ') : '';

  return `あなたは ${basic.shopName || 'お店'} のウェブサイトに設置された営業アシスタントAIです。
業種: ${basic.industry || '未設定'}
キャッチコピー: ${basic.catchphrase || ''}
対応エリア: ${basic.area || '未設定'}
営業時間: ${basic.businessHours || '未設定'}

## 会話トーン
${buildToneInstruction(config)}

## 利用可能なサービス
${buildServiceCatalog(services)}

${faqs.length ? `## FAQ\n${buildFaqBlock(faqs)}\n` : ''}

## 利用可能なゴール（クロージング先）
${buildGoalsBlock(config)}

## 現在の会話状態
- stage: ${session.stage}
- buy_intent_score: ${session.buyIntentScore}
- 過去のメッセージ数: ${session.messages.length}
- 既にマッチしたサービス: ${(session.matchedServiceIds || []).join(', ') || 'なし'}
- 訪問者が選んだサービス: ${session.selectedServiceId || 'なし'}

## 会話フロー規則

### hearing（ヒアリング）
- 訪問者の悩みを深掘りする質問を1つ返す
- ${conv.hearingMinTurns || 2}往復は必ずヒアリング、${conv.hearingMaxTurns || 5}往復超えたらfallbackへ
- サービスの悩みタグ/おすすめタグが2つ以上マッチしたら next_stage='introduction'
- 訪問者が具体サービス名を出したら即 introduction
- matched_service_ids には候補サービスIDを詰める

### introduction（サービス提案）
- matched_service_ids から上位${conv.cardCount || 3}個を選ぶ
- replyは短く「おすすめがあります。気になるのを選んでくださいね。」程度
- ui_hint = 'cards'
- 押し売り禁止

### closing（クロージング）
- 訪問者が「気になる」「予約したい」等を言ったら発動
- closing_cta_key に 'reservation' など（有効なもの）を指定
- ui_hint = 'closing_cta' か 'lead_form'
- 興味が強ければ (score>=4) 即 closing_cta
- 興味が中 (score=3) の場合は先に不安解消質問してから

### nurture（追客）
- 「検討します」「考えます」「また今度」等を検知
- ui_hint = 'nurture_options'
- LINE登録や資料請求などで関係維持

### fallback（一般相談）
- マッチするサービスがない or ヒアリング過多
- 一般質問に答えつつ、最後に問い合わせ導線を提示

## 買う気度スコア（buy_intent_score）の付け方
1: 冷やかし・情報収集のみ
2: 少し興味
3: 比較検討中（質問が出てくる）
4: 前向き（「いいね」「やってみたい」）
5: 即決（「予約したい」「今すぐ」）

## 出力形式（必ずJSON）
{
  "reply": "訪問者への返答テキスト",
  "next_stage": "hearing|introduction|closing|nurture|fallback|closed",
  "buy_intent_score": 1-5の整数,
  "matched_service_ids": ["svc-xxx", ...],
  "ui_hint": "text|cards|closing_cta|lead_form|nurture_options",
  "lead_ask": null | "name" | "phone" | "email" | "preferredTime",
  "closing_cta_key": null | "reservation" | "inquiry" | "phone" | "line" | "document",
  "reasoning": "なぜこの判定か短く"
}

${forbidden ? `## 絶対に言わないこと\n${forbidden}` : ''}

## 重要な注意
- replyには具体的な価格・住所・電話番号を勝手に作らない（設定データに明記されたもののみ）
- HTMLやMarkdownは使わない（プレーンテキスト）
- 返答はJSONのみ、余計な文字列をつけない`;
};

// ============================================================
// Rule-based tag matcher
// ============================================================

const scoreServiceByTags = (service: BotService, userText: string): number => {
  const text = userText.toLowerCase();
  let score = 0;
  for (const tag of service.problemTags || []) {
    if (tag && text.includes(String(tag).toLowerCase())) score += 3;
  }
  for (const tag of service.targetTags || []) {
    if (tag && text.includes(String(tag).toLowerCase())) score += 2;
  }
  if (service.name && text.includes(service.name.toLowerCase())) score += 5;
  return score;
};

const findMatchingServices = (services: BotService[], userText: string): { id: string; score: number }[] => {
  return services
    .map((s) => ({ id: s.id, score: scoreServiceByTags(s, userText) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
};

// ============================================================
// Stage transition rules (hybrid)
// ============================================================

const applyRuleBasedTransition = (
  aiStage: BotStage,
  session: BotSession,
  allMatched: { id: string; score: number }[],
  config: BotConfig,
): { stage: BotStage; force: boolean; reason: string } => {
  const userTurns = session.messages.filter((m) => m.role === 'visitor').length;
  const minTurns = config.conversation?.hearingMinTurns ?? 2;
  const maxTurns = config.conversation?.hearingMaxTurns ?? 5;

  // 強制 introduction: マッチ2つ以上 & 最小ヒアリング済
  if (session.stage === 'hearing' && allMatched.length >= 2 && userTurns >= minTurns) {
    return { stage: 'introduction', force: true, reason: `タグマッチ${allMatched.length}件 & ${userTurns}ターン到達` };
  }

  // 強制 fallback: ヒアリングし過ぎ
  if (session.stage === 'hearing' && userTurns > maxTurns && allMatched.length === 0) {
    return { stage: 'fallback', force: true, reason: `${userTurns}ターンでマッチなし` };
  }

  // AI判定尊重
  return { stage: aiStage, force: false, reason: 'AI判定' };
};

// ============================================================
// Build UI response
// ============================================================

const buildServiceCard = (s: BotService): ServiceCard => ({
  serviceId: s.id,
  name: s.name,
  price: s.price || '',
  duration: s.duration || '',
  features: s.features || '',
  description: s.description || '',
  testimonial: s.testimonial || '',
});

const pickClosingCta = (config: BotConfig, score: number, preferredKey?: string | null): ClosingCta | null => {
  const matrix = config.conversation?.closingMatrix || {};
  const goals = config.goals || {};

  const scoreKeys = matrix[String(score)] || [];
  // preferredKey優先、なければmatrixから順に
  const tryKeys = [preferredKey, ...scoreKeys].filter(Boolean) as string[];

  for (const key of tryKeys) {
    const goal = (goals as any)[key];
    if (goal && goal.enabled) {
      if (key === 'phone') return { key, label: goal.label || '電話する', number: goal.number || '' };
      return { key, label: goal.label || key, url: goal.url || '' };
    }
  }
  return null;
};

const buildLeadFields = (config: BotConfig, onlyFields?: string[]): LeadAsk[] => {
  const fields = config.conversation?.leadFields || [];
  const filtered = onlyFields && onlyFields.length ? fields.filter((f) => onlyFields.includes(f.key)) : fields;
  return filtered.map((f) => ({ field: f.key, label: f.label, required: f.required }));
};

const buildNurtureOptions = (config: BotConfig): NurtureOption[] => {
  const opts = config.nurture?.options || [];
  return opts.map((o) => ({
    type: o.type,
    label: o.label || o.type,
    message: o.message || '',
    url: o.url || '',
  }));
};

const buildUiResponse = (
  aiResp: AiResponse,
  stage: BotStage,
  config: BotConfig,
  services: BotService[],
  session: BotSession,
): BotUiResponse => {
  // cards (introduction)
  if (stage === 'introduction' || aiResp.ui_hint === 'cards') {
    const cardCount = config.conversation?.cardCount ?? 3;
    const svcMap = new Map(services.map((s) => [s.id, s]));
    const picked: BotService[] = [];
    for (const id of aiResp.matched_service_ids || []) {
      const svc = svcMap.get(id);
      if (svc) picked.push(svc);
      if (picked.length >= cardCount) break;
    }
    // fallback: matchedが足りなければsession内から補完
    if (picked.length === 0) {
      for (const id of session.matchedServiceIds || []) {
        const svc = svcMap.get(id);
        if (svc) picked.push(svc);
        if (picked.length >= cardCount) break;
      }
    }
    if (picked.length > 0) {
      return { type: 'cards', cards: picked.map(buildServiceCard) };
    }
  }

  // closing_cta
  if (aiResp.ui_hint === 'closing_cta' || stage === 'closing') {
    const cta = pickClosingCta(config, aiResp.buy_intent_score, aiResp.closing_cta_key);
    if (cta) return { type: 'closing_cta', cta };
  }

  // lead_form
  if (aiResp.ui_hint === 'lead_form') {
    const fields = buildLeadFields(config);
    if (fields.length) return { type: 'lead_form', fields };
  }

  // nurture_options
  if (aiResp.ui_hint === 'nurture_options' || stage === 'nurture') {
    const options = buildNurtureOptions(config);
    if (options.length) return { type: 'nurture_options', options };
  }

  return { type: 'text' };
};

// ============================================================
// Main turn processor
// ============================================================

export const processBotTurn = async (params: {
  paletteId: string;
  sessionId?: string | null;
  message: string;
  visitorId: string;
  userAgent?: string;
  referrer?: string;
}): Promise<BotTurnResult> => {
  const paletteId = params.paletteId.toUpperCase();

  const [config, services, faqs] = await Promise.all([
    getBotConfigOrDefault(paletteId),
    listServices(paletteId, true),
    listFaqs(paletteId),
  ]);

  // Get or create session
  let session: BotSession | null = null;
  if (params.sessionId) {
    session = await getSession(params.sessionId);
  }
  if (!session || session.paletteId !== paletteId) {
    session = await createSession({
      paletteId,
      visitorId: params.visitorId,
      userAgent: params.userAgent,
      referrer: params.referrer,
    });
  }

  // Add visitor message
  const visitorMsg: BotMessage = {
    role: 'visitor',
    content: params.message,
    timestamp: new Date().toISOString(),
  };
  const newMessages: BotMessage[] = [...session.messages, visitorMsg];

  // Rule-based tag matching
  const fullUserText = newMessages
    .filter((m) => m.role === 'visitor')
    .map((m) => m.content)
    .join(' ');
  const matched = findMatchingServices(services, fullUserText);

  // Build AI prompt
  const systemPrompt = buildSystemPrompt(config, services, faqs, {
    ...session,
    messages: newMessages,
  });

  // Conversation history for OpenAI
  const history = newMessages
    .slice(-10)
    .map((m) => ({
      role: m.role === 'visitor' ? ('user' as const) : ('assistant' as const),
      content: String(m.content).slice(0, 800),
    }));

  // Call OpenAI with JSON mode
  let aiResp: AiResponse;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    const rawText = String(completion.choices?.[0]?.message?.content || '{}');
    aiResp = JSON.parse(rawText);
  } catch (error: any) {
    console.error('bot AI error:', error?.message || error);
    aiResp = {
      reply: '申し訳ありません、少し調子が悪いようです。もう一度お試しいただけますか？',
      next_stage: session.stage as BotStage,
      buy_intent_score: session.buyIntentScore,
      matched_service_ids: session.matchedServiceIds,
      ui_hint: 'text',
      lead_ask: null,
      closing_cta_key: null,
    };
  }

  // Apply rule-based override
  const { stage: finalStage, force, reason } = applyRuleBasedTransition(
    aiResp.next_stage,
    { ...session, messages: newMessages },
    matched,
    config,
  );

  if (force && process.env.NODE_ENV !== 'production') {
    console.log(`[bot-engine] rule override: ${aiResp.next_stage} -> ${finalStage} (${reason})`);
  }

  // Merge matched service IDs (AI + rule-based)
  const allMatchedIds = Array.from(new Set([
    ...(aiResp.matched_service_ids || []),
    ...matched.slice(0, 5).map((m) => m.id),
  ]));

  // Build UI response
  const ui = buildUiResponse(
    { ...aiResp, matched_service_ids: allMatchedIds },
    finalStage,
    config,
    services,
    { ...session, messages: newMessages, matchedServiceIds: allMatchedIds },
  );

  // Save bot message
  const botMsg: BotMessage = {
    role: 'bot',
    content: aiResp.reply,
    cards: ui.type === 'cards' ? ui.cards : undefined,
    actions: ui.type === 'closing_cta' ? [ui.cta] : ui.type === 'nurture_options' ? ui.options : undefined,
    timestamp: new Date().toISOString(),
  };
  const finalMessages = [...newMessages, botMsg];

  // Clamp score
  const score = Math.max(1, Math.min(5, Math.round(Number(aiResp.buy_intent_score || session.buyIntentScore))));

  // Update session
  await updateSession(session.id, {
    stage: finalStage,
    buyIntentScore: score,
    matchedServiceIds: allMatchedIds,
    messages: finalMessages,
  });

  return {
    sessionId: session.id,
    reply: aiResp.reply,
    stage: finalStage,
    buyIntentScore: score,
    ui,
  };
};
