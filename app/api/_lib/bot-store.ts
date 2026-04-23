import { sql } from '@vercel/postgres';

if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
}

// ============================================================
// Types
// ============================================================

export type BotConfig = {
  paletteId: string;
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
    personality?: '親しみやすい' | '丁寧' | 'プロっぽい' | '癒し系' | '元気';
    honorific?: string;
    emoji?: '多め' | '少なめ' | 'なし';
    firstPerson?: string;
    keigoLevel?: '丁寧語' | '尊敬語' | 'タメ口寄り';
    replyLength?: '短め' | '普通' | '長め';
  };
  conversation: {
    welcomeMessage?: string;
    hearingMinTurns?: number;
    hearingMaxTurns?: number;
    cardCount?: number;
    cardSortBy?: 'match' | 'price_asc' | 'price_desc' | 'new';
    cardShow?: { price?: boolean; duration?: boolean; features?: boolean; testimonial?: boolean };
    closingIntensity?: number;
    closingMatrix?: Record<string, string[]>;
    preFlourish?: string;
    leadFields?: Array<{ key: string; label: string; required: boolean }>;
  };
  goals: {
    reservation?: { enabled: boolean; url?: string; label?: string };
    inquiry?: { enabled: boolean; url?: string; label?: string };
    phone?: { enabled: boolean; number?: string; label?: string };
    line?: { enabled: boolean; url?: string; label?: string };
    document?: { enabled: boolean; url?: string; label?: string };
    notify?: {
      enabled: boolean;
      label?: string;
      emailAddress?: string;
      lineChannelToken?: string;
      lineUserId?: string;
      webhookUrl?: string;
    };
    /**
     * 商談ゴール: ヒアリング → 提案 → 日時予約 までを AI にクロージングさせる
     * 例: WEBミーティング / 見積もり / 対面商談 / デモ / 体験 など
     */
    meeting?: {
      enabled: boolean;
      kind: 'web_mtg' | 'in_person' | 'estimate' | 'consultation' | 'demo' | 'trial' | 'custom';
      label?: string;
      /** AIが訪問者に提示する誘導文言のベース */
      invitationPrompt?: string;
      /** Google Calendar Appointment Schedule URL (https://calendar.app.google/...) */
      calendarUrl?: string;
      /** 日時選択ボタンのラベル */
      buttonLabel?: string;
      /** 訪問者が「もう少し考える」等で拒否したときのフォールバック先 */
      declineFallback?: 'nurture' | 'document' | 'line';
    };
  };
  nurture: {
    enabled?: boolean;
    mode?: 'hard' | 'soft';
    options?: Array<{ type: string; label: string; message?: string; url?: string; pdfUrl?: string }>;
  };
  appearance: {
    primaryColor?: string;
    gradientTo?: string;
    botIcon?: string;
    welcomeDelay?: number;
    showPages?: 'all' | 'top';
    botName?: string;
    templateId?: string;
    bubbleShape?: 'circle' | 'rounded' | 'square';
    iconStyle?: 'chat' | 'ai' | 'sparkle' | 'heart' | 'robot';
    bubblePosition?: 'right' | 'left';
    gradient?: boolean;
    bubbleSize?: 'small' | 'medium' | 'large';
    bubbleAnimation?: 'none' | 'pulse' | 'wobble' | 'bounce' | 'shimmer';
    bubbleTooltipText?: string;
    bubbleTooltipStyle?: 'speech' | 'pill' | 'card' | 'neon' | 'minimal';
  };
  ngRules: {
    forbiddenTopics?: string[];
    fallbackAction?: 'inquiry' | 'phone' | 'email';
  };
  updatedAt: string;
};

export type BotService = {
  id: string;
  paletteId: string;
  name: string;
  price?: string;
  duration?: string;
  description?: string;
  targetTags: string[];
  problemTags: string[];
  features?: string;
  testimonial?: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BotFaq = {
  id: string;
  paletteId: string;
  question: string;
  answer: string;
  category?: string;
  priority: number;
  createdAt: string;
};

export type BotMessage = {
  role: 'visitor' | 'bot';
  content: string;
  cards?: any[];
  actions?: any[];
  timestamp: string;
};

export type BotSession = {
  id: string;
  paletteId: string;
  visitorId: string;
  stage: 'hearing' | 'introduction' | 'closing' | 'nurture' | 'fallback' | 'closed';
  buyIntentScore: number;
  matchedServiceIds: string[];
  selectedServiceId: string | null;
  messages: BotMessage[];
  lead: Record<string, any> | null;
  closedAction: string | null;
  closed: boolean;
  userAgent: string | null;
  referrer: string | null;
  syncedToCrm: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================
// Default config
// ============================================================

export const DEFAULT_CONFIG: Omit<BotConfig, 'paletteId' | 'updatedAt'> = {
  basic: {},
  tone: {
    personality: '親しみやすい',
    honorific: 'お客様',
    emoji: '少なめ',
    firstPerson: '私',
    keigoLevel: '丁寧語',
    replyLength: '普通',
  },
  conversation: {
    welcomeMessage: 'こんにちは！何かお困りですか？お気軽にご質問ください。',
    hearingMinTurns: 2,
    hearingMaxTurns: 5,
    cardCount: 3,
    cardSortBy: 'match',
    cardShow: { price: true, duration: true, features: true, testimonial: false },
    closingIntensity: 3,
    closingMatrix: {
      '5': ['reservation', 'phone'],
      '4': ['reservation', 'inquiry'],
      '3': ['inquiry', 'line'],
      '2': ['line', 'document'],
      '1': ['line'],
    },
    preFlourish: 'なるほど、それならおすすめがあります。',
    leadFields: [
      { key: 'name', label: 'お名前', required: true },
      { key: 'phone', label: 'お電話番号', required: false },
      { key: 'email', label: 'メールアドレス', required: false },
      { key: 'preferredTime', label: 'ご希望日時', required: false },
    ],
  },
  goals: {
    reservation: { enabled: false, url: '', label: '予約する' },
    inquiry: { enabled: true, url: '', label: '問い合わせる' },
    phone: { enabled: false, number: '', label: '電話する' },
    line: { enabled: false, url: '', label: 'LINE友だち追加' },
    document: { enabled: false, url: '', label: '資料請求' },
    notify: {
      enabled: false,
      label: 'ご相談内容を送信',
      emailAddress: '',
      lineChannelToken: '',
      lineUserId: '',
      webhookUrl: '',
    },
    meeting: {
      enabled: false,
      kind: 'web_mtg',
      label: 'WEBミーティング',
      invitationPrompt: 'ヒアリング内容的に、御社のお悩みにぴったりの解決策がありそうです。一度、担当と30分のWEBミーティングで詳しくお聞かせいただけませんか？',
      calendarUrl: '',
      buttonLabel: '日時を選ぶ',
      declineFallback: 'nurture',
    },
  },
  nurture: {
    enabled: true,
    mode: 'soft',
    options: [],
  },
  appearance: {
    primaryColor: '#6366f1',
    gradientTo: '#d946ef',
    botIcon: '',
    welcomeDelay: 0,
    showPages: 'all',
    botName: 'AIアシスタント',
    templateId: 'indigo',
    bubbleShape: 'circle',
    iconStyle: 'chat',
    bubblePosition: 'right',
    gradient: true,
    bubbleSize: 'medium',
    bubbleAnimation: 'none',
    bubbleTooltipText: 'AIに相談する',
    bubbleTooltipStyle: 'speech',
  },
  ngRules: {
    forbiddenTopics: [],
    fallbackAction: 'inquiry',
  },
};

// ============================================================
// Table initialization
// ============================================================

let initialized = false;
let initPromise: Promise<void> | null = null;

const tryIgnoreDup = async (fn: () => Promise<any>): Promise<void> => {
  try {
    await fn();
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    // Tolerate race conditions on CREATE INDEX/TABLE IF NOT EXISTS (pg_class races on Neon)
    if (msg.includes('duplicate key') || msg.includes('already exists') || msg.includes('pg_class')) {
      return;
    }
    throw err;
  }
};

const ensureTablesOnce = async (): Promise<void> => {
  await tryIgnoreDup(() => sql`
    CREATE TABLE IF NOT EXISTS bot_configs (
      palette_id TEXT PRIMARY KEY,
      basic JSONB NOT NULL DEFAULT '{}'::jsonb,
      tone JSONB NOT NULL DEFAULT '{}'::jsonb,
      conversation JSONB NOT NULL DEFAULT '{}'::jsonb,
      goals JSONB NOT NULL DEFAULT '{}'::jsonb,
      nurture JSONB NOT NULL DEFAULT '{}'::jsonb,
      appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
      ng_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await tryIgnoreDup(() => sql`
    CREATE TABLE IF NOT EXISTS bot_services (
      id TEXT PRIMARY KEY,
      palette_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price TEXT,
      duration TEXT,
      description TEXT,
      target_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      problem_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      features TEXT,
      testimonial TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await tryIgnoreDup(() => sql`CREATE INDEX IF NOT EXISTS bot_services_palette_idx ON bot_services (palette_id, sort_order)`);

  await tryIgnoreDup(() => sql`
    CREATE TABLE IF NOT EXISTS bot_faqs (
      id TEXT PRIMARY KEY,
      palette_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      priority INT NOT NULL DEFAULT 3,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await tryIgnoreDup(() => sql`CREATE INDEX IF NOT EXISTS bot_faqs_palette_idx ON bot_faqs (palette_id, priority)`);

  await tryIgnoreDup(() => sql`
    CREATE TABLE IF NOT EXISTS bot_sessions (
      id TEXT PRIMARY KEY,
      palette_id TEXT NOT NULL,
      visitor_id TEXT,
      stage TEXT NOT NULL DEFAULT 'hearing',
      buy_intent_score INT NOT NULL DEFAULT 1,
      matched_service_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      selected_service_id TEXT,
      messages JSONB NOT NULL DEFAULT '[]'::jsonb,
      lead JSONB,
      closed_action TEXT,
      closed BOOLEAN NOT NULL DEFAULT false,
      user_agent TEXT,
      referrer TEXT,
      synced_to_crm BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await tryIgnoreDup(() => sql`CREATE INDEX IF NOT EXISTS bot_sessions_palette_idx ON bot_sessions (palette_id, updated_at DESC)`);
  await tryIgnoreDup(() => sql`CREATE INDEX IF NOT EXISTS bot_sessions_score_idx ON bot_sessions (palette_id, buy_intent_score DESC)`);
};

const ensureTables = async (): Promise<void> => {
  if (initialized) return;
  if (!initPromise) {
    initPromise = ensureTablesOnce()
      .then(() => { initialized = true; })
      .catch((err) => { initPromise = null; throw err; });
  }
  return initPromise;
};

// ============================================================
// Helpers
// ============================================================

const genId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const asJson = <T>(v: any, fallback: T): T => {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T; } catch { return fallback; }
  }
  return v as T;
};

const asArray = <T>(v: any): T[] => (Array.isArray(v) ? v : []);

const rowToConfig = (row: any): BotConfig => ({
  paletteId: row.palette_id,
  basic: asJson(row.basic, {}),
  tone: asJson(row.tone, {}),
  conversation: asJson(row.conversation, {}),
  goals: asJson(row.goals, {}),
  nurture: asJson(row.nurture, {}),
  appearance: asJson(row.appearance, {}),
  ngRules: asJson(row.ng_rules, {}),
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ''),
});

const rowToService = (row: any): BotService => ({
  id: row.id,
  paletteId: row.palette_id,
  name: row.name,
  price: row.price || '',
  duration: row.duration || '',
  description: row.description || '',
  targetTags: asArray<string>(asJson(row.target_tags, [])),
  problemTags: asArray<string>(asJson(row.problem_tags, [])),
  features: row.features || '',
  testimonial: row.testimonial || '',
  sortOrder: Number(row.sort_order || 0),
  active: Boolean(row.active ?? true),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ''),
});

const rowToFaq = (row: any): BotFaq => ({
  id: row.id,
  paletteId: row.palette_id,
  question: row.question,
  answer: row.answer,
  category: row.category || '',
  priority: Number(row.priority || 3),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
});

const rowToSession = (row: any): BotSession => ({
  id: row.id,
  paletteId: row.palette_id,
  visitorId: row.visitor_id || '',
  stage: row.stage || 'hearing',
  buyIntentScore: Number(row.buy_intent_score || 1),
  matchedServiceIds: asArray<string>(asJson(row.matched_service_ids, [])),
  selectedServiceId: row.selected_service_id || null,
  messages: asArray<BotMessage>(asJson(row.messages, [])),
  lead: asJson(row.lead, null),
  closedAction: row.closed_action || null,
  closed: Boolean(row.closed),
  userAgent: row.user_agent || null,
  referrer: row.referrer || null,
  syncedToCrm: Boolean(row.synced_to_crm),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ''),
});

// ============================================================
// bot_configs CRUD
// ============================================================

export const getBotConfig = async (paletteId: string): Promise<BotConfig | null> => {
  await ensureTables();
  const result = await sql`SELECT * FROM bot_configs WHERE palette_id = ${paletteId} LIMIT 1`;
  if (!result.rows.length) return null;
  return rowToConfig(result.rows[0]);
};

export const upsertBotConfig = async (config: Partial<BotConfig> & { paletteId: string }): Promise<BotConfig> => {
  await ensureTables();

  const paletteId = config.paletteId;
  const basic = JSON.stringify(config.basic ?? DEFAULT_CONFIG.basic);
  const tone = JSON.stringify(config.tone ?? DEFAULT_CONFIG.tone);
  const conversation = JSON.stringify(config.conversation ?? DEFAULT_CONFIG.conversation);
  const goals = JSON.stringify(config.goals ?? DEFAULT_CONFIG.goals);
  const nurture = JSON.stringify(config.nurture ?? DEFAULT_CONFIG.nurture);
  const appearance = JSON.stringify(config.appearance ?? DEFAULT_CONFIG.appearance);
  const ngRules = JSON.stringify(config.ngRules ?? DEFAULT_CONFIG.ngRules);

  const result = await sql`
    INSERT INTO bot_configs (palette_id, basic, tone, conversation, goals, nurture, appearance, ng_rules, updated_at)
    VALUES (${paletteId}, ${basic}::jsonb, ${tone}::jsonb, ${conversation}::jsonb, ${goals}::jsonb, ${nurture}::jsonb, ${appearance}::jsonb, ${ngRules}::jsonb, NOW())
    ON CONFLICT (palette_id) DO UPDATE SET
      basic = EXCLUDED.basic,
      tone = EXCLUDED.tone,
      conversation = EXCLUDED.conversation,
      goals = EXCLUDED.goals,
      nurture = EXCLUDED.nurture,
      appearance = EXCLUDED.appearance,
      ng_rules = EXCLUDED.ng_rules,
      updated_at = NOW()
    RETURNING *
  `;
  return rowToConfig(result.rows[0]);
};

export const getBotConfigOrDefault = async (paletteId: string): Promise<BotConfig> => {
  const existing = await getBotConfig(paletteId);
  if (existing) return existing;
  return {
    paletteId,
    ...DEFAULT_CONFIG,
    updatedAt: new Date().toISOString(),
  };
};

export const listBotConfigPaletteIds = async (): Promise<string[]> => {
  await ensureTables();
  const result = await sql`SELECT palette_id FROM bot_configs ORDER BY updated_at DESC`;
  return result.rows.map((r: any) => String(r.palette_id));
};

// ============================================================
// bot_services CRUD
// ============================================================

export const listServices = async (paletteId: string, activeOnly = false): Promise<BotService[]> => {
  await ensureTables();
  const result = activeOnly
    ? await sql`SELECT * FROM bot_services WHERE palette_id = ${paletteId} AND active = true ORDER BY sort_order ASC, created_at ASC`
    : await sql`SELECT * FROM bot_services WHERE palette_id = ${paletteId} ORDER BY sort_order ASC, created_at ASC`;
  return result.rows.map(rowToService);
};

export const getService = async (id: string): Promise<BotService | null> => {
  await ensureTables();
  const result = await sql`SELECT * FROM bot_services WHERE id = ${id} LIMIT 1`;
  if (!result.rows.length) return null;
  return rowToService(result.rows[0]);
};

export const upsertService = async (service: Partial<BotService> & { paletteId: string; name: string }): Promise<BotService> => {
  await ensureTables();
  const id = service.id || genId('svc');
  const targetTags = JSON.stringify(service.targetTags || []);
  const problemTags = JSON.stringify(service.problemTags || []);

  const result = await sql`
    INSERT INTO bot_services (id, palette_id, name, price, duration, description, target_tags, problem_tags, features, testimonial, sort_order, active, created_at, updated_at)
    VALUES (
      ${id}, ${service.paletteId}, ${service.name},
      ${service.price || null}, ${service.duration || null}, ${service.description || null},
      ${targetTags}::jsonb, ${problemTags}::jsonb,
      ${service.features || null}, ${service.testimonial || null},
      ${service.sortOrder ?? 0}, ${service.active ?? true},
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      duration = EXCLUDED.duration,
      description = EXCLUDED.description,
      target_tags = EXCLUDED.target_tags,
      problem_tags = EXCLUDED.problem_tags,
      features = EXCLUDED.features,
      testimonial = EXCLUDED.testimonial,
      sort_order = EXCLUDED.sort_order,
      active = EXCLUDED.active,
      updated_at = NOW()
    RETURNING *
  `;
  return rowToService(result.rows[0]);
};

export const deleteService = async (id: string): Promise<void> => {
  await ensureTables();
  await sql`DELETE FROM bot_services WHERE id = ${id}`;
};

// ============================================================
// bot_faqs CRUD
// ============================================================

export const listFaqs = async (paletteId: string): Promise<BotFaq[]> => {
  await ensureTables();
  const result = await sql`SELECT * FROM bot_faqs WHERE palette_id = ${paletteId} ORDER BY priority ASC, created_at ASC`;
  return result.rows.map(rowToFaq);
};

export const upsertFaq = async (faq: Partial<BotFaq> & { paletteId: string; question: string; answer: string }): Promise<BotFaq> => {
  await ensureTables();
  const id = faq.id || genId('faq');

  const result = await sql`
    INSERT INTO bot_faqs (id, palette_id, question, answer, category, priority, created_at)
    VALUES (${id}, ${faq.paletteId}, ${faq.question}, ${faq.answer}, ${faq.category || null}, ${faq.priority ?? 3}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      question = EXCLUDED.question,
      answer = EXCLUDED.answer,
      category = EXCLUDED.category,
      priority = EXCLUDED.priority
    RETURNING *
  `;
  return rowToFaq(result.rows[0]);
};

export const deleteFaq = async (id: string): Promise<void> => {
  await ensureTables();
  await sql`DELETE FROM bot_faqs WHERE id = ${id}`;
};

// ============================================================
// bot_sessions CRUD
// ============================================================

export const createSession = async (params: {
  paletteId: string;
  visitorId: string;
  userAgent?: string;
  referrer?: string;
}): Promise<BotSession> => {
  await ensureTables();
  const id = genId('sess');
  const result = await sql`
    INSERT INTO bot_sessions (id, palette_id, visitor_id, stage, buy_intent_score, matched_service_ids, messages, user_agent, referrer, created_at, updated_at)
    VALUES (${id}, ${params.paletteId}, ${params.visitorId}, 'hearing', 1, '[]'::jsonb, '[]'::jsonb, ${params.userAgent || null}, ${params.referrer || null}, NOW(), NOW())
    RETURNING *
  `;
  return rowToSession(result.rows[0]);
};

export const getSession = async (id: string): Promise<BotSession | null> => {
  await ensureTables();
  const result = await sql`SELECT * FROM bot_sessions WHERE id = ${id} LIMIT 1`;
  if (!result.rows.length) return null;
  return rowToSession(result.rows[0]);
};

export const updateSession = async (id: string, patch: Partial<BotSession>): Promise<BotSession | null> => {
  await ensureTables();

  const current = await getSession(id);
  if (!current) return null;

  const next = {
    stage: patch.stage ?? current.stage,
    buyIntentScore: patch.buyIntentScore ?? current.buyIntentScore,
    matchedServiceIds: patch.matchedServiceIds ?? current.matchedServiceIds,
    selectedServiceId: patch.selectedServiceId !== undefined ? patch.selectedServiceId : current.selectedServiceId,
    messages: patch.messages ?? current.messages,
    lead: patch.lead !== undefined ? patch.lead : current.lead,
    closedAction: patch.closedAction !== undefined ? patch.closedAction : current.closedAction,
    closed: patch.closed ?? current.closed,
    syncedToCrm: patch.syncedToCrm ?? current.syncedToCrm,
  };

  const result = await sql`
    UPDATE bot_sessions SET
      stage = ${next.stage},
      buy_intent_score = ${next.buyIntentScore},
      matched_service_ids = ${JSON.stringify(next.matchedServiceIds)}::jsonb,
      selected_service_id = ${next.selectedServiceId},
      messages = ${JSON.stringify(next.messages)}::jsonb,
      lead = ${next.lead ? JSON.stringify(next.lead) : null}::jsonb,
      closed_action = ${next.closedAction},
      closed = ${next.closed},
      synced_to_crm = ${next.syncedToCrm},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result.rows.length ? rowToSession(result.rows[0]) : null;
};

export const listSessions = async (
  paletteId: string,
  options: { limit?: number; minScore?: number; closedOnly?: boolean } = {},
): Promise<BotSession[]> => {
  await ensureTables();
  const limit = options.limit ?? 100;
  const minScore = options.minScore ?? 0;

  const result = options.closedOnly
    ? await sql`
        SELECT * FROM bot_sessions
        WHERE palette_id = ${paletteId} AND closed = true AND buy_intent_score >= ${minScore}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT * FROM bot_sessions
        WHERE palette_id = ${paletteId} AND buy_intent_score >= ${minScore}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
  return result.rows.map(rowToSession);
};

export const getSessionStats = async (paletteId: string): Promise<{
  total: number;
  todayCount: number;
  weekCount: number;
  closed: number;
  scoreDistribution: Record<string, number>;
}> => {
  await ensureTables();

  const totalRes = await sql`SELECT COUNT(*)::int AS n FROM bot_sessions WHERE palette_id = ${paletteId}`;
  const todayRes = await sql`SELECT COUNT(*)::int AS n FROM bot_sessions WHERE palette_id = ${paletteId} AND created_at >= NOW() - INTERVAL '1 day'`;
  const weekRes = await sql`SELECT COUNT(*)::int AS n FROM bot_sessions WHERE palette_id = ${paletteId} AND created_at >= NOW() - INTERVAL '7 days'`;
  const closedRes = await sql`SELECT COUNT(*)::int AS n FROM bot_sessions WHERE palette_id = ${paletteId} AND closed = true`;
  const distRes = await sql`
    SELECT buy_intent_score::text AS score, COUNT(*)::int AS n
    FROM bot_sessions WHERE palette_id = ${paletteId}
    GROUP BY buy_intent_score
  `;

  const scoreDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  distRes.rows.forEach((r: any) => {
    scoreDistribution[String(r.score)] = Number(r.n);
  });

  return {
    total: Number(totalRes.rows[0]?.n || 0),
    todayCount: Number(todayRes.rows[0]?.n || 0),
    weekCount: Number(weekRes.rows[0]?.n || 0),
    closed: Number(closedRes.rows[0]?.n || 0),
    scoreDistribution,
  };
};
