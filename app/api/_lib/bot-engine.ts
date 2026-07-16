import { getOpenAI, CHAT_MODEL } from './openai-client';
import {
  BotConfig,
  BotService,
  BotFaq,
  BotSession,
  BotMessage,
  HearingStep,
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
  | { type: 'lead_form'; fields: LeadAsk[]; context?: 'meeting' | 'inquiry' | 'reservation' | null }
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
  /** Phase 2-B: hearingFlow manual モードで、分岐先ステップの id。マッチなしなら null */
  next_branch_id?: string | null;
  /** Phase 2-A拡張: 現在ステップを意味的に「答え済み」と判定し、reply を次ステップ向けに書いた場合 true */
  skip_current_step?: boolean;
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
  if (g.inquiry?.enabled) {
    parts.push(g.inquiry.url
      ? 'inquiry（問い合わせ・外部フォーム遷移）'
      : 'inquiry（問い合わせ・Bot内で完結。lead_form で情報収集→自動要約通知）');
  }
  if (g.phone?.enabled) parts.push('phone（電話）');
  if (g.line?.enabled) parts.push('line（LINE登録）');
  if (g.document?.enabled) parts.push('document（資料請求）');
  if (g.meeting?.enabled) parts.push(`meeting（${g.meeting.label || 'ミーティング'}・最終ゴール）`);
  // notify は CTA ではなくバックグラウンド自動通知なのでここには含めない
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

/**
 * ステップの skipIf 条件を評価。訪問者が既に該当話題を出していれば skip。
 * Phase 2-A: skipIf.type='already_answered' のみ対応。matchKeys の単純部分一致。
 */
const shouldSkipStep = (step: HearingStep, visitorText: string): boolean => {
  const skip = step.skipIf;
  if (!skip) return false;
  if (skip.type !== 'already_answered') return false;
  const matchKeys = (skip.matchKeys || []).map((k) => String(k || '').trim()).filter(Boolean);
  if (matchKeys.length === 0) return false;
  const hay = String(visitorText || '').toLowerCase();
  return matchKeys.some((k) => hay.includes(k.toLowerCase()));
};

/**
 * manual モードで、hearingStepIndex から skipIf にマッチするステップを飛ばし、
 * 最初にマッチしないステップの index を返す。全部 skip されたら steps.length を返す。
 */
const advanceSkippedSteps = (
  steps: HearingStep[],
  startIdx: number,
  visitorText: string,
): number => {
  let idx = startIdx;
  while (idx < steps.length && shouldSkipStep(steps[idx], visitorText)) {
    idx++;
  }
  return idx;
};

/**
 * ウェルカム step 0 の解決。
 * 初回ターン (visitor 発言数=1 && session.hearingStepIndex=0) かつ welcomeBranches があれば、
 * 最初の発言を評価して該当 step.id へジャンプする。
 *
 * welcomeAsksFirstQuestion トグルは index には影響しない（AI プロンプトの文脈にのみ影響）。
 *  → トグル ON でもステップ 1 (manualSteps[0]) は飛ばさない。AI はウェルカムへの回答を
 *    踏まえつつ Step 1 の質問を投げる、という自然な流れになる。
 */
const resolveWelcomeStep = (
  config: BotConfig,
  manualSteps: HearingStep[],
  newMessages: BotMessage[],
  storedIdx: number,
  visitorMessage: string,
): number => {
  const visitorCount = newMessages.filter((m) => m.role === 'visitor').length;
  if (visitorCount > 1 || storedIdx !== 0) return storedIdx;

  const flow = config.conversation?.hearingFlow;
  if (!flow || flow.mode !== 'manual') return storedIdx;
  const welcomeBranches = Array.isArray(flow.welcomeBranches) ? flow.welcomeBranches : [];
  if (welcomeBranches.length === 0) return 0;

  const stepIdToIndex = new Map(manualSteps.map((s, i) => [s.id, i]));
  const msgLower = String(visitorMessage || '').toLowerCase();

  for (const br of welcomeBranches) {
    if (br.condition.type === 'keyword') {
      const kws = (br.condition.value || []).map((k) => String(k || '').trim().toLowerCase()).filter(Boolean);
      if (kws.length === 0) continue;
      if (kws.some((k) => msgLower.includes(k))) {
        const idx = stepIdToIndex.get(br.goToStepId);
        if (idx !== undefined) return idx;
      }
    }
  }
  const def = welcomeBranches.find((b) => b.condition.type === 'default');
  if (def) {
    const idx = stepIdToIndex.get(def.goToStepId);
    if (idx !== undefined) return idx;
  }
  // どの分岐にもマッチしなかった → ステップ 1 から開始
  return 0;
};

/**
 * hearingFlow.mode='manual' のとき、現在のステップ情報を system prompt に挿入する。
 * - AI がステップの prompt の趣旨を汲んで自然に言い換えて OK
 * - 明確な購入意思を検出したら残りステップを飛ばして closing に遷移してよい
 */
const buildHearingFlowBlock = (config: BotConfig, session: BotSession): string => {
  const flow = config.conversation?.hearingFlow;
  if (!flow || flow.mode !== 'manual') return '';
  const steps: HearingStep[] = Array.isArray(flow.steps) ? flow.steps : [];
  if (steps.length === 0) return '';
  // skipIf を考慮して effective index を取得（既に回答済みのステップを飛ばす）
  const visitorText = session.messages
    .filter((m) => m.role === 'visitor')
    .map((m) => String(m.content || ''))
    .join(' ');
  const idx = advanceSkippedSteps(steps, session.hearingStepIndex ?? 0, visitorText);
  if (idx >= steps.length) return '';
  const current = steps[idx];

  // 初回ターンで welcome が質問を含む場合、訪問者の最初の発言は welcome への回答である旨を AI に伝える
  const visitorCount = session.messages.filter((m) => m.role === 'visitor').length;
  const welcomeAsks = flow.welcomeAsksFirstQuestion === true;
  const welcomeBranches = Array.isArray(flow.welcomeBranches) ? flow.welcomeBranches : [];
  const welcomeMsg = (config.conversation?.welcomeMessage || '').trim();
  let welcomeContextBlock = '';
  if (visitorCount === 1 && (welcomeAsks || welcomeBranches.length > 0) && welcomeMsg) {
    welcomeContextBlock = `
### 👋 ウェルカム文脈（重要）
訪問者には事前にウェルカムメッセージとして「${welcomeMsg}」を提示済みです。
訪問者の最初の発言はこのウェルカムに対する回答として扱い、その内容を踏まえて現在ステップに応答してください。
`;
  }

  const typeLabels: Record<HearingStep['type'], string> = {
    ask: '💬 質問する',
    show_cards: '🎴 サービスカードを提示',
    proposal_meeting: '🎯 商談誘導',
    show_closing: '✅ クロージング',
  };

  let instruction = '';
  if (current.type === 'ask') {
    const prompt = (current.prompt || '').trim();
    instruction = prompt
      ? `- 次に尋ねたい内容（趣旨）: 「${prompt}」\n- この**趣旨を汲んで**、訪問者の直前の発言の文脈に合わせて**自然に言い換えて** reply に含めてください。機械的なコピペはNG。\n- ui_hint='text', next_stage='hearing' を基本とします`
      : `- 深掘り質問を1つ返してください。\n- ui_hint='text', next_stage='hearing'`;
  } else if (current.type === 'show_cards') {
    instruction = `- 質問は含めず、短い遷移文（例: 「${config.conversation?.preFlourish || 'それならおすすめがあります。'}気になるものを選んでくださいね。」）を reply に入れてください。\n- next_stage='introduction', ui_hint='cards' を返してください。`;
  } else if (current.type === 'proposal_meeting') {
    instruction = `- 「最終ゴール」ブロックの誘導文言を使って reply を作り、ui_hint='meeting_proposal' を返してください。`;
  } else if (current.type === 'show_closing') {
    instruction = `- next_stage='closing' に遷移し、買う気度に応じた closing_cta_key を選んでください（または ui_hint='lead_form'）。`;
  }

  // Phase 2-A 拡張: AI 意味判定スキップ
  // 現在ステップに skipIf があり、次のステップが存在するなら、AI に意味的同等チェックを促す
  const skipKeys = (current.skipIf?.matchKeys || []).map((k) => String(k || '').trim()).filter(Boolean);
  const nextStep: HearingStep | null = idx + 1 < steps.length ? steps[idx + 1] : null;
  let smartSkipBlock = '';
  if (skipKeys.length > 0 && nextStep) {
    let nextDesc = `${idx + 2}/${steps.length} ステップ目: ${typeLabels[nextStep.type]}`;
    if (nextStep.type === 'ask' && nextStep.prompt) {
      nextDesc += `\n  趣旨: 「${(nextStep.prompt || '').trim()}」`;
    }
    smartSkipBlock = `
### 🔎 意味スキップ判定（重要）
このステップには「すでに回答済みなら飛ばす」設定があります。
スキップを促す意図キーワード: ${skipKeys.join(' / ')}

訪問者の過去発言（特に直近）から、上記キーワードと**意味的に同等**（言い換え・婉曲・否定表現を含む）の意思表示が既にあれば:
- \`skip_current_step: true\` を返す
- そして **reply は現在ステップではなく次のステップに対する応答** にすること
  → 次のステップ: ${nextDesc}

例: キーワード「いらない」に対して、訪問者が「別に必要ないです」「興味ありません」「結構です」のような発言をしていた場合は、現在ステップをスキップしてよい。
判断材料が弱い・曖昧な場合は \`skip_current_step: false\` のまま、現在ステップに対する応答にすること。
`;
  }

  // Phase 2-B: 分岐条件をプロンプトに挿入
  const branches = Array.isArray(current.branches) ? current.branches : [];
  const stepIdToIndex = new Map<string, number>();
  steps.forEach((s, i) => stepIdToIndex.set(s.id, i));
  let branchBlock = '';
  if (branches.length > 0) {
    const lines: string[] = [];
    branches.forEach((br, i) => {
      const targetIdx = stepIdToIndex.get(br.goToStepId);
      if (targetIdx === undefined) return; // ステップが削除されていたら無視
      const targetLabel = `ステップ ${targetIdx + 1}（${typeLabels[steps[targetIdx].type]}）`;
      if (br.condition.type === 'keyword') {
        const kws = (br.condition.value || []).filter(Boolean);
        if (kws.length === 0) return;
        lines.push(`${i + 1}. キーワード [${kws.join(' / ')}] にマッチ → 次は ${targetLabel} (id=${br.goToStepId})`);
      } else if (br.condition.type === 'sentiment') {
        const sent = br.condition.sentiment || 'positive';
        lines.push(`${i + 1}. 感情が「${sent}」 → 次は ${targetLabel} (id=${br.goToStepId})`);
      } else if (br.condition.type === 'default') {
        lines.push(`${i + 1}. 上記にマッチしない場合（デフォルト）→ 次は ${targetLabel} (id=${br.goToStepId})`);
      }
    });
    if (lines.length > 0) {
      branchBlock = `
### 分岐条件（訪問者の回答次第で次のステップを選ぶ）
${lines.join('\n')}

訪問者の今回の回答をこれらの条件で評価し、マッチしたら \`next_branch_id\` にその分岐の goToStepId を設定してください。どれにもマッチしなければ \`next_branch_id: null\`（次のステップへ順次進行）。`;
    }
  }

  return `
## 🧭 ヒアリング台本（管理者設定・最優先）
管理者が会話の流れを設計しています。以下のステップに沿って会話を進めてください。
現在 **${idx + 1}/${steps.length} ステップ目**: ${typeLabels[current.type]}
${welcomeContextBlock}
${instruction}
${smartSkipBlock}
${branchBlock}

### 台本運用の重要ルール
- ステップの趣旨は守りつつ、訪問者の文脈に合わせて**自然に言い換えて** reply に含める
- 訪問者が「予約したい / 買います / お願いします / 申し込みます / 契約します」等の**明確な購入意思** を示し、かつ buy_intent_score が 4 以上なら、残りステップを飛ばして next_stage='closing' に遷移してかまいません
- ステップ末尾まで到達したら、通常のルール（AI判断）に戻ります
`;
};

const buildMeetingGoalBlock = (config: BotConfig): string => {
  const m = config.goals?.meeting;
  if (!m || !m.enabled) return '';
  const label = m.label || 'ミーティング';
  const prompt = m.invitationPrompt || `一度、担当と30分の${label}で詳しくお聞かせいただけませんか？`;
  const collectLead = m.collectLead !== false;

  const acceptFlow = collectLead
    ? `2. 訪問者が「はい」「ぜひ」「お願いします」等の承諾 → reply に「ありがとうございます！日程調整のため、お名前とご連絡先を教えてください」を入れ、ui_hint='meeting_lead_form' を返す
3. lead が送信された後の次のターン → reply に「ありがとうございます。下のボタンからお進みください」を入れ、ui_hint='meeting_calendar' を返す`
    : `2. 訪問者が「はい」「ぜひ」「お願いします」等の承諾 → reply に「ありがとうございます。下のボタンからお進みください」を入れ、ui_hint='meeting_calendar' を返す（リード収集はスキップ）`;

  return `
## 🎯 最終ゴール: ${label}
このBotの最終ゴールは「${label}」への誘導です。
ヒアリングが十分進んだら（2-3ターン以降、またはサービスが明確にマッチしたら）、以下の趣旨で訪問者を誘導してください：

> ${prompt}

### 誘導フロー
1. ヒアリングが進んだら → reply に上記の誘導文言を自然な日本語で入れ、ui_hint='meeting_proposal' を返す
${acceptFlow}
4. 訪問者が「もう少し考える」「検討します」等の拒否 → ui_hint='meeting_declined' を返す（後で自動で fallback に振り分けられる）

### ルール
- 一度 meeting_proposal を出したら、訪問者の返答を待たずに何度も meeting_proposal を繰り返さない
- meeting_calendar を出した後は、closed 状態にして追加の営業は控える
- ヒアリング不足のまま proposal を急がない（最低1-2ターンは深掘りヒアリング）
${collectLead ? '' : '- リード収集はスキップ設定のため、承諾後すぐに meeting_calendar へ進む'}
`;
};

/**
 * manual モードのヒアリング台本がアクティブかどうか
 * （mode='manual' かつ steps が1件以上、かつ現在 index がまだ末尾未満）
 */
const isManualHearingActive = (config: BotConfig, session: BotSession): boolean => {
  const flow = config.conversation?.hearingFlow;
  if (!flow || flow.mode !== 'manual') return false;
  const steps = Array.isArray(flow.steps) ? flow.steps : [];
  if (steps.length === 0) return false;
  const idx = session.hearingStepIndex ?? 0;
  return idx < steps.length;
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
  const manualActive = isManualHearingActive(config, session);

  // manual モード時は hearing の最小/最大ターンルールを「台本に従う」と置き換える
  const hearingRulesBlock = manualActive
    ? `### hearing（ヒアリング）
- **🧭 ヒアリング台本セクションが最優先**。下記のターン数・タグマッチによる自動遷移ルールは適用されない。
- 台本のステップ末尾まで到達したら通常ルールに戻る。`
    : `### hearing（ヒアリング）
- 訪問者の悩みを深掘りする質問を1つ返す
- ${conv.hearingMinTurns || 2}往復は必ずヒアリング、${conv.hearingMaxTurns || 5}往復超えたらfallbackへ
- サービスの悩みタグ/おすすめタグが2つ以上マッチしたら next_stage='introduction'
- 訪問者が具体サービス名を出したら即 introduction
- matched_service_ids には候補サービスIDを詰める`;

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

${buildHearingFlowBlock(config, session)}

## 現在の会話状態
- stage: ${session.stage}
- buy_intent_score: ${session.buyIntentScore}
- 過去のメッセージ数: ${session.messages.length}
- 既にマッチしたサービス: ${(session.matchedServiceIds || []).join(', ') || 'なし'}
- 訪問者が選んだサービス: ${session.selectedServiceId || 'なし'}

## 会話フロー規則

${hearingRulesBlock}

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
  "next_branch_id": null | "<goToStepId>",
  "skip_current_step": false,
  "reasoning": "なぜこの判定か短く"
}

${ngBlock}

## 重要な注意
- replyには具体的な価格・住所・電話番号を勝手に作らない（設定データに明記されたもののみ）
- HTMLやMarkdownは使わない（プレーンテキスト）
- 返答はJSONのみ、余計な文字列をつけない
- **ウェルカムメッセージはチャット画面で訪問者に既に表示済み**。reply で「こんにちは」「ようこそ」等の挨拶を繰り返さない。ウェルカムが質問を含んでいた場合、訪問者の最初の発言はそれへの回答。同じ質問を再度投げ返さない。

## 会話フロー厳守ルール
- 訪問者が具体サービス名や「気になる/お願いしたい/詳しく/見積もり/予約/相談」等を言ったら、next_stage='closing' へ
- 一度 introduction でカードを出した後は、もう一度 introduction に戻らない（カードを繰り返さない）
- closing 中は、不安解消の質問→リードフォーム提出（ui_hint='lead_form' or 'closing_cta'）へ流れる
- ヒアリングの深掘りが必要な場合でも、stageは closing のまま、ヒアリングの質問内容だけを reply に含める

## クロージング先キー選択ルール（closing_cta_key）
- meeting が有効な場合は最終ゴールとして meeting_proposal/lead_form/calendar の流れ（最終ゴール ブロック参照）
- meeting が無効なら: reservation (予約) / inquiry (問い合わせ) / line / document / phone から選ぶ
- inquiry は url が空のとき Bot 内で lead_form を出して完結する（外部遷移しない）
- 買う気度が低い（1-2）場合は line（LINE登録）で関係維持
- notify は AI要約通知として**バックグラウンドで自動送信**されるため、closing_cta_key としては選ばない`;
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

  // notify は CTA ではなくバックグラウンド通知なので選択肢から除外
  let scoreKeys = (Array.isArray(matrix[String(score)]) ? [...matrix[String(score)]] : [])
    .filter((k) => k !== 'notify');

  const isValidGoal = (key: string): boolean => {
    const goal = (goals as any)[key];
    return !!(goal && goal.enabled);
  };
  const buildCta = (key: string): ClosingCta | null => {
    if (key === 'notify') return null;
    const goal = (goals as any)[key];
    if (!goal || !goal.enabled) return null;
    if (key === 'phone') return { key, label: goal.label || '電話する', number: goal.number || '' };
    return { key, label: goal.label || key, url: goal.url || '' };
  };

  // ユーザー設定(closingMatrix)を最優先
  if (scoreKeys.length > 0) {
    if (preferredKey && preferredKey !== 'notify' && scoreKeys.includes(preferredKey)) {
      scoreKeys = [preferredKey, ...scoreKeys.filter((k) => k !== preferredKey)];
    }
    for (const key of scoreKeys) {
      const cta = buildCta(key);
      if (cta) return cta;
    }
  } else if (preferredKey && preferredKey !== 'notify' && isValidGoal(preferredKey)) {
    const cta = buildCta(preferredKey);
    if (cta) return cta;
  }

  // 最終フォールバック（notify は除外）
  const fallbackOrder = ['reservation', 'inquiry', 'line', 'document', 'phone'];
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
 * meeting のデフォルト リードフィールド: 名前・メール・電話 全て必須
 */
const buildMeetingDefaultLeadFields = (): LeadAsk[] => [
  { field: 'name', label: 'お名前', required: true },
  { field: 'email', label: 'メールアドレス', required: true },
  { field: 'phone', label: '電話番号', required: true },
];

/**
 * goal ごとの lead_form フィールドを解決
 * - goal.leadFields が設定されていればそれを優先
 * - 未設定なら meeting はデフォルト3項目、他は conversation.leadFields
 */
const buildGoalLeadFields = (config: BotConfig, goalKey: 'inquiry' | 'reservation' | 'meeting'): LeadAsk[] => {
  const goal = (config.goals as any)?.[goalKey];
  if (goal?.leadFields && Array.isArray(goal.leadFields) && goal.leadFields.length > 0) {
    return goal.leadFields.map((f: any) => ({ field: String(f.key), label: String(f.label || f.key), required: !!f.required }));
  }
  if (goalKey === 'meeting') return buildMeetingDefaultLeadFields();
  // inquiry/reservation はグローバル conversation.leadFields を継承
  return buildLeadFields(config);
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

  // meeting_lead_form: goal.leadFields があればそれを、なければ名前・メール・電話のデフォルト
  // ただし collectLead=false の場合はスキップして最終アクションを直接返す
  if (aiResp.ui_hint === 'meeting_lead_form' && meeting && meeting.enabled) {
    if (meeting.collectLead === false) {
      // lead_form をスキップして直接最終アクション（meeting_calendar 相当の結果）を返す
      let action = meeting.action || 'reservation';
      if (action === ('calendar' as any)) action = 'reservation';
      if (action !== 'lead_only') {
        const targetGoal = (config.goals as any)[action];
        const fallbackUrl =
          action === 'reservation' && (!targetGoal?.url) && meeting.calendarUrl
            ? meeting.calendarUrl
            : null;
        if (targetGoal && targetGoal.enabled) {
          const buttonLabel = meeting.buttonLabel || targetGoal.label || action;
          const cta: ClosingCta = action === 'phone'
            ? { key: 'phone', label: buttonLabel, number: targetGoal.number || '' }
            : { key: action, label: buttonLabel, url: targetGoal.url || fallbackUrl || '' };
          return { type: 'closing_cta', cta };
        }
      }
      // lead_only / 設定未完: テキストのみ
      return { type: 'text' };
    }
    const fields = buildGoalLeadFields(config, 'meeting');
    return { type: 'lead_form', fields, context: 'meeting' };
  }

  // meeting_calendar: 承諾後の最終アクション
  //  - action='reservation'|'inquiry'|'phone'|'line'|'document' → ③で設定したgoalへ
  //  - action='lead_only' → 遷移なし (text, AI要約通知のみ)
  //  - action='calendar' (旧) → reservation に読み替え (互換)
  if (aiResp.ui_hint === 'meeting_calendar' && meeting && meeting.enabled) {
    let action = meeting.action || 'reservation';
    // 旧 action='calendar' 互換: reservation に読み替え
    if (action === ('calendar' as any)) action = 'reservation';
    if (action !== 'lead_only') {
      const targetGoal = (config.goals as any)[action];
      // 旧 meeting.calendarUrl が残っている & reservation.url が空なら calendarUrl を流用（互換）
      const fallbackUrl =
        action === 'reservation' && (!targetGoal?.url) && meeting.calendarUrl
          ? meeting.calendarUrl
          : null;
      if (targetGoal && targetGoal.enabled) {
        const buttonLabel = meeting.buttonLabel || targetGoal.label || action;
        const cta: ClosingCta = action === 'phone'
          ? { key: 'phone', label: buttonLabel, number: targetGoal.number || '' }
          : { key: action, label: buttonLabel, url: targetGoal.url || fallbackUrl || '' };
        return { type: 'closing_cta', cta };
      }
    }
    // lead_only / URL未設定時: 完了のみ (AI要約通知は自動発動)
    return { type: 'text' };
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
    // inquiry / reservation は mode に応じて lead_form へ切替
    //   mode='bot_form' → Bot 内 lead_form
    //   mode='url' → 外部URL (通常CTA)
    //   mode 未設定 → url の有無で自動判定 (互換)
    const resolveMode = (key: 'inquiry' | 'reservation'): 'url' | 'bot_form' => {
      const goal = (config.goals as any)?.[key];
      if (goal?.mode === 'bot_form') return 'bot_form';
      if (goal?.mode === 'url') return 'url';
      return goal?.url ? 'url' : 'bot_form';
    };
    if (cta && (cta.key === 'inquiry' || cta.key === 'reservation')) {
      const mode = resolveMode(cta.key as 'inquiry' | 'reservation');
      if (mode === 'bot_form') {
        const fields = buildGoalLeadFields(config, cta.key as 'inquiry' | 'reservation');
        if (fields.length) return { type: 'lead_form', fields, context: cta.key as 'inquiry' | 'reservation' };
      }
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
  isDemo?: boolean;
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
      isDemo: params.isDemo,
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

  // ── manual モード: ウェルカム + skipIf 解決を AI 呼び出し前に行う ─────────
  // (buildSystemPrompt と後段の processBotTurn 両方で同じ effective step を参照する)
  const hearingFlow = config.conversation?.hearingFlow;
  const manualSteps: HearingStep[] = (hearingFlow?.mode === 'manual' && Array.isArray(hearingFlow.steps))
    ? hearingFlow.steps
    : [];
  const manualActive = manualSteps.length > 0;
  // 初回ターン: ウェルカム step 0 を解決 (welcomeBranches / welcomeAsksFirstQuestion)
  const baseIdx = manualActive
    ? resolveWelcomeStep(config, manualSteps, newMessages, session.hearingStepIndex ?? 0, params.message)
    : (session.hearingStepIndex ?? 0);

  // Build AI prompt
  // hearingStepIndex はウェルカム解決後の baseIdx を渡す。buildHearingFlowBlock 内で
  // さらに skipIf advance が走り、processBotTurn と同じ effective step に到達する。
  const systemPrompt = buildSystemPrompt(config, services, faqs, {
    ...session,
    messages: newMessages,
    hearingStepIndex: manualActive ? baseIdx : (session.hearingStepIndex ?? 0),
  });

  // Conversation history for OpenAI
  // 初回ターン (session.messages に bot 発言なし) のとき、widget で静的表示している
  // ウェルカムを assistant メッセージとして先頭に注入する。
  // → AI が「自分が既にウェルカムで挨拶した」と認識でき、二重挨拶や同じ質問の繰り返しを防ぐ
  const isFirstTurn = session.messages.length === 0;
  const welcomeForHistory = (config.conversation?.welcomeMessage || '').trim();
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (isFirstTurn && welcomeForHistory) {
    history.push({ role: 'assistant', content: welcomeForHistory.slice(0, 800) });
  }
  for (const m of newMessages.slice(-10)) {
    history.push({
      role: m.role === 'visitor' ? 'user' : 'assistant',
      content: String(m.content).slice(0, 800),
    });
  }

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

  // ── ヒアリング台本 (manual) によるステップ進行 ─────────────
  // skipIf を考慮した effective index (回答済みステップを飛ばす)
  const visitorTextAll = newMessages
    .filter((m) => m.role === 'visitor')
    .map((m) => String(m.content || ''))
    .join(' ');
  const currentStepIdx = manualActive
    ? advanceSkippedSteps(manualSteps, baseIdx, visitorTextAll)
    : baseIdx;

  let manualForceStage: BotStage | null = null;
  let manualForceUiHint: AiResponse['ui_hint'] | null = null;
  let nextStepIdx = currentStepIdx;

  if (manualActive) {
    // 早期クロージング: buy_intent_score >= 4 かつ明確な購入意思キーワード検出
    const buyIntentRegex = /予約したい|予約します|予約お願い|お願いします|やります|申し込み|申込|買います|購入します|契約したい|契約します|やってもらいたい|お願いしたい/;
    const aiScore = Number(aiResp.buy_intent_score || 0);
    const earlyBuy = aiScore >= 4 && buyIntentRegex.test(params.message);

    if (earlyBuy && session.stage !== 'closed') {
      manualForceStage = 'closing';
      nextStepIdx = manualSteps.length; // 残りステップを飛ばす
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[bot-engine] manual: 早期クロージング発動 (score=${aiScore}, msg=${String(params.message).slice(0, 40)})`);
      }
    } else if (currentStepIdx < manualSteps.length) {
      // AI 意味判定スキップ: skip_current_step=true && skipIf 設定あり && 次ステップが存在
      // → reply は次ステップ向けに書かれているはずなので、effective を次ステップに進める
      const rawStep = manualSteps[currentStepIdx];
      const aiWantsSkip = aiResp.skip_current_step === true
        && !!rawStep.skipIf
        && (rawStep.skipIf.matchKeys || []).filter(Boolean).length > 0
        && currentStepIdx + 1 < manualSteps.length;

      const effectiveStepIdx = aiWantsSkip ? currentStepIdx + 1 : currentStepIdx;
      const effectiveStep = manualSteps[effectiveStepIdx];

      if (aiWantsSkip && process.env.NODE_ENV !== 'production') {
        console.log(`[bot-engine] AI 意味スキップ: step ${currentStepIdx} -> ${effectiveStepIdx}`);
      }

      if (effectiveStep.type === 'show_cards') {
        manualForceStage = 'introduction';
        manualForceUiHint = 'cards';
      } else if (effectiveStep.type === 'proposal_meeting') {
        manualForceUiHint = 'meeting_proposal';
      } else if (effectiveStep.type === 'show_closing') {
        manualForceStage = 'closing';
      }
      // 'ask' は stage/ui_hint 上書きなし、index のみ進める

      // Phase 2-B: 分岐条件の解決（effectiveStep の branches を使う）
      const branches = Array.isArray(effectiveStep.branches) ? effectiveStep.branches : [];
      const branchById = new Map(branches.map((b) => [b.goToStepId, b]));
      const stepIdToIndex = new Map(manualSteps.map((s, i) => [s.id, i]));

      let branchTargetIdx: number | null = null;
      // 1) AI が返した next_branch_id を優先 (skip 時は次ステップの branches に対する評価とみなす)
      const aiBranchId = (aiResp as any).next_branch_id;
      if (aiBranchId && typeof aiBranchId === 'string' && branchById.has(aiBranchId)) {
        const idx = stepIdToIndex.get(aiBranchId);
        if (idx !== undefined) branchTargetIdx = idx;
      }
      // 2) AI が返さなかったら、サーバー側でキーワード判定
      if (branchTargetIdx === null && branches.length > 0) {
        const msgLower = String(params.message || '').toLowerCase();
        for (const br of branches) {
          if (br.condition.type !== 'keyword') continue;
          const kws = (br.condition.value || []).map((k) => String(k || '').trim().toLowerCase()).filter(Boolean);
          if (kws.length === 0) continue;
          if (kws.some((k) => msgLower.includes(k))) {
            const idx = stepIdToIndex.get(br.goToStepId);
            if (idx !== undefined) { branchTargetIdx = idx; break; }
          }
        }
        // 3) キーワードにマッチしなければ default 分岐
        if (branchTargetIdx === null) {
          const def = branches.find((b) => b.condition.type === 'default');
          if (def) {
            const idx = stepIdToIndex.get(def.goToStepId);
            if (idx !== undefined) branchTargetIdx = idx;
          }
        }
      }

      if (branchTargetIdx !== null) {
        nextStepIdx = branchTargetIdx;
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[bot-engine] manual branch: step ${effectiveStepIdx} -> ${branchTargetIdx}`);
        }
      } else {
        // 次ターンの skipIf 判定があるので effective からさらに +1 で進める
        nextStepIdx = effectiveStepIdx + 1;
      }
    }

    // ui_hint の上書きは buildUiResponse 前に反映
    if (manualForceUiHint) aiResp.ui_hint = manualForceUiHint;
  }

  // Apply rule-based override
  // manual モードがアクティブ (steps が残っている) なら rule-based を完全に停止
  // → 強制 introduction / 退行禁止 / 強制 fallback などが ask ステップ中に干渉するのを防ぐ
  let finalStage: BotStage;
  let force = false;
  const manualStillActive = manualActive && currentStepIdx < manualSteps.length;
  if (manualForceStage) {
    finalStage = manualForceStage;
    force = true;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[bot-engine] manual override: ${aiResp.next_stage} -> ${finalStage} (step=${currentStepIdx})`);
    }
  } else if (manualStillActive) {
    // 'ask' ステップ実行中: stage='hearing' を維持 (AI が introduction 等に飛ぼうとしても無視)
    finalStage = 'hearing';
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[bot-engine] manual ask: stage 維持 hearing (step=${currentStepIdx}/${manualSteps.length})`);
    }
  } else {
    const rb = applyRuleBasedTransition(
      aiResp.next_stage,
      { ...session, messages: newMessages },
      matched,
      config,
    );
    finalStage = rb.stage;
    force = rb.force;
    if (rb.force && process.env.NODE_ENV !== 'production') {
      console.log(`[bot-engine] rule override: ${aiResp.next_stage} -> ${finalStage} (${rb.reason})`);
    }
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

  // manual モードの show_cards で何も拾えていない場合、登録済みサービスの先頭から補完
  // → 設計者は「ここでカードを出す」と意図しているので、タグマッチが弱くても必ず出す
  if (manualForceUiHint === 'cards' && allMatchedIds.length === 0 && services.length > 0) {
    const cardCount = config.conversation?.cardCount ?? 3;
    for (const svc of services) {
      allMatchedIds.push(svc.id);
      if (allMatchedIds.length >= cardCount) break;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[bot-engine] manual show_cards: タグマッチなし → 登録順 ${allMatchedIds.length} 件で補完`);
    }
  }

  // Build UI response
  const ui = buildUiResponse(
    { ...aiResp, matched_service_ids: allMatchedIds },
    finalStage,
    config,
    services,
    { ...session, messages: newMessages, matchedServiceIds: allMatchedIds },
  );

  // リードフォームを出すとき（notify経由の場合など）は、案内文に上書き
  // 管理画面（会話設計）で編集可能。未設定なら既定文。
  if (ui.type === 'lead_form') {
    aiResp.reply = (config.conversation?.leadFormMessage || '').trim()
      || 'ありがとうございます！担当者からご連絡させていただきますので、お客様情報を数点だけ教えてください。';
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
    hearingStepIndex: nextStepIdx,
  });

  return {
    sessionId: session.id,
    reply: aiResp.reply,
    stage: finalStage,
    buyIntentScore: score,
    ui,
  };
};
