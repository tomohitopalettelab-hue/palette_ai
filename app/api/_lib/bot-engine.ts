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
  | { type: 'lead_form'; fields: LeadAsk[]; context?: 'meeting' | null }
  | { type: 'nurture_options'; options: NurtureOption[] }
  | { type: 'meeting_proposal'; label: string; acceptLabel: string; declineLabel: string }
  | { type: 'meeting_calendar'; label: string; url: string; buttonLabel: string };

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
  ui_hint: 'text' | 'cards' | 'closing_cta' | 'lead_form' | 'nurture_options' | 'meeting_proposal' | 'meeting_lead_form' | 'meeting_calendar' | 'meeting_declined';
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
  if (g.notify?.enabled) parts.push('notify（ヒアリング内容を担当者に通知・最優先で検討）');
  if (g.meeting?.enabled) parts.push(`meeting（${g.meeting.label || 'ミーティング'}・最終ゴール）`);
  return parts.length ? parts.join(' / ') : '（未設定）';
};

const buildNgRulesBlock = (config: BotConfig): string => {
  const ng = config.ngRules || {};
  const lines: string[] = [];

  if (Array.isArray(ng.forbiddenTopics) && ng.forbiddenTopics.length > 0) {
    lines.push(`### 🚫 禁止トピック (絶対に触れない)\n- ${ng.forbiddenTopics.join('\n- ')}`);
  }
  if (Array.isArray(ng.forbiddenWords) && ng.forbiddenWords.length > 0) {
    lines.push(`### 🚫 禁止ワード (reply に絶対含めない)\n- ${ng.forbiddenWords.join('\n- ')}`);
  }
  if (Array.isArray(ng.mustSayPhrases) && ng.mustSayPhrases.length > 0) {
    lines.push(`### ✅ 必ず伝えるべき内容 (適切なタイミングで自然に盛り込む)\n- ${ng.mustSayPhrases.join('\n- ')}`);
  }
  if (Array.isArray(ng.avoidPhrases) && ng.avoidPhrases.length > 0) {
    lines.push(`### ⚠️ 使用を避ける表現\n- ${ng.avoidPhrases.join('\n- ')}`);
  }

  if (ng.competitorPolicy && ng.competitorPolicy !== 'no_comment') {
    const map: Record<string, string> = {
      neutral: '競合サービスの話題が出たら、批判せず中立的に対応。比較には踏み込まない。',
      redirect: '競合サービスの話題が出たら、自社サービスのメリットに話題を戻す。',
    };
    lines.push(`### 競合サービス対応\n${map[ng.competitorPolicy] || ''}`);
  } else if (ng.competitorPolicy === 'no_comment') {
    lines.push('### 競合サービス対応\n競合サービスについては一切コメントしない。聞かれたら「当サービスのことのみお答えできます」と返す。');
  }

  if (ng.priceDisclosure) {
    const map: Record<string, string> = {
      as_listed: '料金は登録されたサービスカタログ通りに正確に伝える。カタログにない料金は勝手に作らない。',
      estimate_only: '具体的な金額は伝えず、「担当者から見積もりをお出しします」と案内する。',
      ask_first: '料金を聞かれたら、まず用途・規模をヒアリングしてから登録データを元に回答。不明なら「見積もりをお出しします」。',
    };
    lines.push(`### 料金提示ルール\n${map[ng.priceDisclosure] || ''}`);
  }

  if (ng.businessHoursStart && ng.businessHoursEnd && ng.outOfHoursMessage) {
    lines.push(`### 営業時間外対応\n営業時間: ${ng.businessHoursStart} 〜 ${ng.businessHoursEnd}\n時間外の返答冒頭には次を添える: "${ng.outOfHoursMessage}"`);
  }

  if (ng.maxReplyLength && Number(ng.maxReplyLength) > 0) {
    lines.push(`### 返答文字数制限\n1ターンの reply は最大 ${ng.maxReplyLength} 文字以内に収める。`);
  }

  if (ng.customRules && String(ng.customRules).trim()) {
    lines.push(`### その他のルール\n${String(ng.customRules).trim()}`);
  }

  if (lines.length === 0) return '';
  return `## 🛑 運用ルール (最優先・必ず守る)\n${lines.join('\n\n')}\n`;
};

const buildMeetingGoalBlock = (config: BotConfig): string => {
  const m = config.goals?.meeting;
  if (!m || !m.enabled) return '';
  const label = m.label || 'ミーティング';
  const prompt = m.invitationPrompt || `一度、担当と30分の${label}で詳しくお聞かせいただけませんか？`;
  return `
## 🎯 最終ゴール: ${label}
このBotの最終ゴールは「${label}」への誘導です。
ヒアリングが十分進んだら（2-3ターン以降、またはサービスが明確にマッチしたら）、以下の趣旨で訪問者を誘導してください：

> ${prompt}

### 誘導フロー
1. ヒアリングが進んだら → reply に上記の誘導文言を自然な日本語で入れ、ui_hint='meeting_proposal' を返す
2. 訪問者が「はい」「ぜひ」「お願いします」「予約します」等の承諾 → reply に「ありがとうございます！日程調整のため、お名前とご連絡先を教えてください」を入れ、ui_hint='meeting_lead_form' を返す
3. lead が送信された後の次のターン → reply に「ありがとうございます。下のボタンから日時をお選びください」を入れ、ui_hint='meeting_calendar' を返す
4. 訪問者が「もう少し考える」「検討します」等の拒否 → ui_hint='meeting_declined' を返す（後で自動で fallback に振り分けられる）

### ルール
- 一度 meeting_proposal を出したら、訪問者の返答を待たずに何度も meeting_proposal を繰り返さない
- meeting_calendar を出した後は、closed 状態にして追加の営業は控える
- ヒアリング不足のまま proposal を急がない（最低1-2ターンは深掘りヒアリング）
`;
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
  const ngBlock = buildNgRulesBlock(config);

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

${buildMeetingGoalBlock(config)}

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
- **replyは質問を含めない**。「おすすめがあります。気になるのを選んでくださいね。」のような短い遷移文のみ
- 質問したい場合はまだヒアリングすべき → next_stage='hearing' にする（introductionには進まない）
- ui_hint = 'cards'
- 押し売り禁止
- **既に一度 introduction を出した後は、絶対に introduction に戻らない**（同じカードを繰り返し出さない）

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
  "ui_hint": "text|cards|closing_cta|lead_form|nurture_options|meeting_proposal|meeting_lead_form|meeting_calendar|meeting_declined",
  "lead_ask": null | "name" | "phone" | "email" | "preferredTime",
  "closing_cta_key": null | "reservation" | "inquiry" | "phone" | "line" | "document" | "notify" | "meeting",
  "reasoning": "なぜこの判定か短く"
}

${ngBlock}

## 重要な注意
- replyには具体的な価格・住所・電話番号を勝手に作らない（設定データに明記されたもののみ）
- HTMLやMarkdownは使わない（プレーンテキスト）
- 返答はJSONのみ、余計な文字列をつけない

## 会話フロー厳守ルール
- 訪問者が具体サービス名や「気になる/お願いしたい/詳しく/見積もり/予約/相談」等を言ったら、next_stage='closing' へ
- 一度 introduction でカードを出した後は、もう一度 introduction に戻らない（カードを繰り返さない）
- closing 中は、不安解消の質問→リードフォーム提出（ui_hint='lead_form' or 'closing_cta'）へ流れる
- ヒアリングの深掘りが必要な場合でも、stageは closing のまま、ヒアリングの質問内容だけを reply に含める

## クロージング先キー選択ルール（closing_cta_key）
- notify が有効なら、買う気度3以上の場合は **notify を最優先**（ヒアリング内容を担当者に通知する仕組みが最も成約率が高い）
- notifyは訪問者からすると「ご相談内容を送信する」ボタンとして表示される
- 次点: reservation（予約可能な場合）、inquiry（一般問い合わせ）、line（気軽に相談）
- 買う気度が低い（1-2）の場合は line（LINE登録）で関係維持`;
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

const STAGE_ORDER: Record<BotStage, number> = {
  hearing: 0,
  introduction: 1,
  nurture: 1,
  closing: 2,
  fallback: 2,
  closed: 3,
};

const applyRuleBasedTransition = (
  aiStage: BotStage,
  session: BotSession,
  allMatched: { id: string; score: number }[],
  config: BotConfig,
): { stage: BotStage; force: boolean; reason: string } => {
  const userTurns = session.messages.filter((m) => m.role === 'visitor').length;
  const minTurns = config.conversation?.hearingMinTurns ?? 2;
  const maxTurns = config.conversation?.hearingMaxTurns ?? 5;

  // 既にcardsを提示した履歴があるか
  const alreadyShownCards = session.messages.some(
    (m) => m.role === 'bot' && Array.isArray(m.cards) && m.cards.length > 0,
  );

  // 強制 closing: cards提示済み かつ 直近ユーザー発言がサービス選択/興味表明
  const lastVisitor = [...session.messages].reverse().find((m) => m.role === 'visitor');
  const lastText = String(lastVisitor?.content || '');
  const isServicePickSignal = /気になります|これ|お願いしたい|検討|詳しく|知りたい|教えて|見積|予約|相談|申し込み|興味/.test(lastText);
  if (alreadyShownCards && isServicePickSignal && session.stage !== 'closed') {
    return { stage: 'closing', force: true, reason: 'カード提示済 + 選択シグナル検出' };
  }

  // 退行禁止: 既に introduction 以上のstageなら、introduction/hearing への戻りを禁止
  if (STAGE_ORDER[session.stage] >= STAGE_ORDER.introduction) {
    if (aiStage === 'hearing' || aiStage === 'introduction') {
      // 既にカード提示済みなら closing へ
      if (alreadyShownCards) {
        return { stage: 'closing', force: true, reason: '退行禁止: カード提示済のためclosing維持' };
      }
      // まだカード未提示なら現stage維持
      return { stage: session.stage, force: true, reason: '退行禁止: 現stage維持' };
    }
  }

  // 強制 introduction: マッチ2つ以上 & 最小ヒアリング済 & まだcards未提示
  if (session.stage === 'hearing' && allMatched.length >= 2 && userTurns >= minTurns && !alreadyShownCards) {
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

  let scoreKeys = Array.isArray(matrix[String(score)]) ? [...matrix[String(score)]] : [];

  // notifyが有効でmatrixに全く含まれていない場合、スコア3以上で先頭に自動追加
  // （ユーザーがmatrixをカスタマイズしていない場合のフォールバック）
  const notifyEnabled = goals.notify?.enabled;
  const matrixHasNotify = Object.values(matrix).some(
    (arr: any) => Array.isArray(arr) && arr.includes('notify'),
  );
  if (notifyEnabled && !matrixHasNotify && score >= 3) {
    scoreKeys = ['notify', ...scoreKeys];
  }

  const isValidGoal = (key: string): boolean => {
    const goal = (goals as any)[key];
    return !!(goal && goal.enabled);
  };
  const buildCta = (key: string): ClosingCta | null => {
    const goal = (goals as any)[key];
    if (!goal || !goal.enabled) return null;
    if (key === 'phone') return { key, label: goal.label || '電話する', number: goal.number || '' };
    if (key === 'notify') return { key, label: goal.label || 'ご相談内容を送信する' };
    return { key, label: goal.label || key, url: goal.url || '' };
  };

  // ユーザー設定(closingMatrix)を最優先。matrix に有効なkeyがあれば必ずそこから選ぶ。
  // preferredKey (AIの提案) は matrix 内にあれば位置を前に上げる、matrix が空のときだけ単独で使う。
  if (scoreKeys.length > 0) {
    // preferredKey が matrix に含まれていれば先頭に持ってくる、含まれていなければ無視
    if (preferredKey && scoreKeys.includes(preferredKey)) {
      scoreKeys = [preferredKey, ...scoreKeys.filter((k) => k !== preferredKey)];
    }
    for (const key of scoreKeys) {
      const cta = buildCta(key);
      if (cta) return cta;
    }
  } else if (preferredKey && isValidGoal(preferredKey)) {
    // matrix 未設定時のみ AI の提案に従う
    const cta = buildCta(preferredKey);
    if (cta) return cta;
  }

  // 最終フォールバック: enabled なgoalから1つ選ぶ（優先順位: notify > reservation > inquiry > line > document > phone）
  const fallbackOrder = ['notify', 'reservation', 'inquiry', 'line', 'document', 'phone'];
  for (const key of fallbackOrder) {
    const cta = buildCta(key);
    if (cta) return cta;
  }
  return null;
};

const buildLeadFields = (config: BotConfig, onlyFields?: string[]): LeadAsk[] => {
  const fields = config.conversation?.leadFields || [];
  const filtered = onlyFields && onlyFields.length ? fields.filter((f) => onlyFields.includes(f.key)) : fields;
  return filtered.map((f) => ({ field: f.key, label: f.label, required: f.required }));
};

/**
 * meeting 用のリードフィールド: 名前・メール・電話を必ず含める（全て必須）
 * 既存 conversation.leadFields にそれらが無い場合は補完
 */
const buildMeetingLeadFields = (config: BotConfig): LeadAsk[] => {
  const baseFields = config.conversation?.leadFields || [];
  const byKey = new Map(baseFields.map((f) => [f.key, f]));
  const required = ['name', 'email', 'phone'];
  const result: LeadAsk[] = [];
  // 必須3項目 (既存のlabelがあれば流用、無ければデフォルト)
  const defaultLabels: Record<string, string> = {
    name: 'お名前',
    email: 'メールアドレス',
    phone: '電話番号',
  };
  for (const key of required) {
    const f = byKey.get(key);
    result.push({ field: key, label: f?.label || defaultLabels[key], required: true });
  }
  // 任意項目: name/email/phone以外の既存項目をそのまま追加
  for (const f of baseFields) {
    if (required.includes(f.key)) continue;
    result.push({ field: f.key, label: f.label, required: f.required });
  }
  return result;
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
  const meeting = config.goals?.meeting;

  // meeting_proposal: AI誘導メッセージ + 承諾/検討ボタン
  if (aiResp.ui_hint === 'meeting_proposal' && meeting && meeting.enabled) {
    return {
      type: 'meeting_proposal',
      label: meeting.label || 'ミーティング',
      acceptLabel: 'はい、お願いします',
      declineLabel: 'もう少し考える',
    };
  }

  // meeting_lead_form: 名前・メール・電話のフォーム
  if (aiResp.ui_hint === 'meeting_lead_form' && meeting && meeting.enabled) {
    const fields = buildMeetingLeadFields(config);
    return { type: 'lead_form', fields, context: 'meeting' };
  }

  // meeting_calendar: Google Calendar URL へ遷移するボタン
  if (aiResp.ui_hint === 'meeting_calendar' && meeting && meeting.enabled) {
    return {
      type: 'meeting_calendar',
      label: meeting.label || 'ミーティング',
      url: meeting.calendarUrl || '',
      buttonLabel: meeting.buttonLabel || '日時を選ぶ',
    };
  }

  // meeting_declined: 拒否された → declineFallback に沿って振り分け
  if (aiResp.ui_hint === 'meeting_declined' && meeting && meeting.enabled) {
    const fb = meeting.declineFallback || 'nurture';
    if (fb === 'nurture') {
      const options = buildNurtureOptions(config);
      if (options.length) return { type: 'nurture_options', options };
    }
    const goal = (config.goals as any)[fb];
    if (goal && goal.enabled) {
      const cta: ClosingCta = { key: fb, label: goal.label || fb, url: goal.url || '' };
      return { type: 'closing_cta', cta };
    }
  }

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
    // 'notify' CTAの場合は、URL遷移ではなくインラインでリードフォームを表示して通知送信
    if (cta && cta.key === 'notify') {
      const fields = buildLeadFields(config);
      if (fields.length) return { type: 'lead_form', fields };
    }
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

  // ルールがintroductionを強制した場合、AIのreply（質問文の可能性）を簡潔な遷移文に上書き
  // → 質問とカードが同時に出ることを防ぐ
  if (force && finalStage === 'introduction') {
    const flourish = config.conversation?.preFlourish || 'なるほど、それならおすすめがあります。';
    aiResp.reply = `${flourish}気になるものを選んでくださいね。`;
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

  // リードフォームを出すとき（notify経由の場合など）は、親しみやすい案内文に上書き
  if (ui.type === 'lead_form') {
    aiResp.reply = 'ありがとうございます！担当者からご連絡させていただきますので、お客様情報を数点だけ教えてください。';
  }

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
