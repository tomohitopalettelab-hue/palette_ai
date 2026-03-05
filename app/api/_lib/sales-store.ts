import { sql } from '@vercel/postgres';

export type AccountRecord = {
  id: string;
  name: string;
  paletteCustomerId: string | null;
  contactEmail: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServicePlanRecord = {
  id: string;
  code: string;
  name: string;
  billingCycle: string;
  defaultPriceYen: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContractRecord = {
  id: string;
  accountId: string;
  planId: string;
  startDate: string;
  endDate: string | null;
  priceYen: number;
  status: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

let initialized = false;

type Row = Record<string, unknown>;

const toIso = (value: unknown, fallback = new Date()): string => {
  const date = value ? new Date(String(value)) : fallback;
  if (Number.isNaN(date.getTime())) return fallback.toISOString();
  return date.toISOString();
};

const toDateOnly = (value: unknown, fallback?: string): string => {
  if (!value && fallback) return fallback;
  const raw = String(value || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) {
    return fallback || new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

const generateId = (prefix: string): string => {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
};

const asString = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const asNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result ? result : null;
};

const asNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const asBoolean = (value: unknown): boolean => {
  return value === true || value === 'true' || value === 1 || value === '1';
};

const ensureTables = async () => {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      palette_customer_id TEXT UNIQUE,
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS service_plans (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      default_price_yen INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES service_plans(id),
      start_date DATE NOT NULL,
      end_date DATE,
      price_yen INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      memo TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS accounts_palette_customer_id_idx ON accounts (palette_customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS accounts_updated_at_idx ON accounts (updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS service_plans_is_active_idx ON service_plans (is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS contracts_account_id_idx ON contracts (account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts (status)`;
  await sql`CREATE INDEX IF NOT EXISTS contracts_start_end_idx ON contracts (start_date, end_date)`;

  initialized = true;
};

const normalizeAccount = (row: Row): AccountRecord => ({
  id: asString(row.id),
  name: asString(row.name),
  paletteCustomerId: asNullableString(row.palette_customer_id),
  contactEmail: asNullableString(row.contact_email),
  status: asString(row.status, 'active'),
  notes: asNullableString(row.notes),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const normalizePlan = (row: Row): ServicePlanRecord => ({
  id: asString(row.id),
  code: asString(row.code),
  name: asString(row.name),
  billingCycle: asString(row.billing_cycle, 'monthly'),
  defaultPriceYen: asNumber(row.default_price_yen),
  description: asNullableString(row.description),
  isActive: asBoolean(row.is_active),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const normalizeContract = (row: Row): ContractRecord => ({
  id: asString(row.id),
  accountId: asString(row.account_id),
  planId: asString(row.plan_id),
  startDate: toDateOnly(row.start_date),
  endDate: row.end_date ? toDateOnly(row.end_date) : null,
  priceYen: asNumber(row.price_yen),
  status: asString(row.status, 'active'),
  memo: asNullableString(row.memo),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

export const listAccounts = async (): Promise<AccountRecord[]> => {
  await ensureTables();
  const result = await sql`
    SELECT id, name, palette_customer_id, contact_email, status, notes, created_at, updated_at
    FROM accounts
    ORDER BY updated_at DESC
  `;
  return result.rows.map(normalizeAccount);
};

export const upsertAccount = async (input: Partial<AccountRecord>): Promise<AccountRecord> => {
  await ensureTables();

  const id = String(input.id || generateId('acc'));
  const name = String(input.name || '新規取引先');
  const paletteCustomerId = input.paletteCustomerId ? String(input.paletteCustomerId) : null;
  const contactEmail = input.contactEmail ? String(input.contactEmail) : null;
  const status = String(input.status || 'active');
  const notes = input.notes ? String(input.notes) : null;
  const updatedAt = toIso(input.updatedAt || new Date());

  const result = await sql`
    INSERT INTO accounts (id, name, palette_customer_id, contact_email, status, notes, updated_at)
    VALUES (${id}, ${name}, ${paletteCustomerId}, ${contactEmail}, ${status}, ${notes}, ${updatedAt}::timestamptz)
    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      palette_customer_id = EXCLUDED.palette_customer_id,
      contact_email = EXCLUDED.contact_email,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = EXCLUDED.updated_at
    RETURNING id, name, palette_customer_id, contact_email, status, notes, created_at, updated_at
  `;

  return normalizeAccount(result.rows[0]);
};

export const listServicePlans = async (includeInactive = false): Promise<ServicePlanRecord[]> => {
  await ensureTables();
  const result = includeInactive
    ? await sql`
        SELECT id, code, name, billing_cycle, default_price_yen, description, is_active, created_at, updated_at
        FROM service_plans
        ORDER BY is_active DESC, updated_at DESC
      `
    : await sql`
        SELECT id, code, name, billing_cycle, default_price_yen, description, is_active, created_at, updated_at
        FROM service_plans
        WHERE is_active = TRUE
        ORDER BY updated_at DESC
      `;

  return result.rows.map(normalizePlan);
};

export const upsertServicePlan = async (input: Partial<ServicePlanRecord>): Promise<ServicePlanRecord> => {
  await ensureTables();

  const id = String(input.id || generateId('plan'));
  const code = String(input.code || '').trim() || id;
  const name = String(input.name || '新規プラン');
  const billingCycle = String(input.billingCycle || 'monthly');
  const defaultPriceYen = Number(input.defaultPriceYen || 0);
  const description = input.description ? String(input.description) : null;
  const isActive = input.isActive ?? true;
  const updatedAt = toIso(input.updatedAt || new Date());

  const result = await sql`
    INSERT INTO service_plans (id, code, name, billing_cycle, default_price_yen, description, is_active, updated_at)
    VALUES (${id}, ${code}, ${name}, ${billingCycle}, ${defaultPriceYen}, ${description}, ${Boolean(isActive)}, ${updatedAt}::timestamptz)
    ON CONFLICT (id)
    DO UPDATE SET
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      billing_cycle = EXCLUDED.billing_cycle,
      default_price_yen = EXCLUDED.default_price_yen,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at
    RETURNING id, code, name, billing_cycle, default_price_yen, description, is_active, created_at, updated_at
  `;

  return normalizePlan(result.rows[0]);
};

export const listContracts = async (options?: {
  accountId?: string;
  paletteCustomerId?: string;
  activeOn?: string;
}): Promise<ContractRecord[]> => {
  await ensureTables();

  const accountId = options?.accountId?.trim();
  const paletteCustomerId = options?.paletteCustomerId?.trim();
  const activeOn = options?.activeOn?.trim();

  if (accountId) {
    const result = activeOn
      ? await sql`
          SELECT c.id, c.account_id, c.plan_id, c.start_date, c.end_date, c.price_yen, c.status, c.memo, c.created_at, c.updated_at
          FROM contracts c
          WHERE c.account_id = ${accountId}
            AND c.start_date <= ${activeOn}::date
            AND (c.end_date IS NULL OR c.end_date >= ${activeOn}::date)
          ORDER BY c.start_date DESC, c.updated_at DESC
        `
      : await sql`
          SELECT c.id, c.account_id, c.plan_id, c.start_date, c.end_date, c.price_yen, c.status, c.memo, c.created_at, c.updated_at
          FROM contracts c
          WHERE c.account_id = ${accountId}
          ORDER BY c.start_date DESC, c.updated_at DESC
        `;
    return result.rows.map(normalizeContract);
  }

  if (paletteCustomerId) {
    const result = activeOn
      ? await sql`
          SELECT c.id, c.account_id, c.plan_id, c.start_date, c.end_date, c.price_yen, c.status, c.memo, c.created_at, c.updated_at
          FROM contracts c
          INNER JOIN accounts a ON a.id = c.account_id
          WHERE a.palette_customer_id = ${paletteCustomerId}
            AND c.start_date <= ${activeOn}::date
            AND (c.end_date IS NULL OR c.end_date >= ${activeOn}::date)
          ORDER BY c.start_date DESC, c.updated_at DESC
        `
      : await sql`
          SELECT c.id, c.account_id, c.plan_id, c.start_date, c.end_date, c.price_yen, c.status, c.memo, c.created_at, c.updated_at
          FROM contracts c
          INNER JOIN accounts a ON a.id = c.account_id
          WHERE a.palette_customer_id = ${paletteCustomerId}
          ORDER BY c.start_date DESC, c.updated_at DESC
        `;
    return result.rows.map(normalizeContract);
  }

  const result = await sql`
    SELECT id, account_id, plan_id, start_date, end_date, price_yen, status, memo, created_at, updated_at
    FROM contracts
    ORDER BY start_date DESC, updated_at DESC
  `;
  return result.rows.map(normalizeContract);
};

export const upsertContract = async (input: Partial<ContractRecord>): Promise<ContractRecord> => {
  await ensureTables();

  const id = String(input.id || generateId('ctr'));
  const accountId = String(input.accountId || '').trim();
  const planId = String(input.planId || '').trim();
  if (!accountId) throw new Error('accountId is required');
  if (!planId) throw new Error('planId is required');

  const startDate = toDateOnly(input.startDate, new Date().toISOString().slice(0, 10));
  const endDate = input.endDate ? toDateOnly(input.endDate) : null;
  const priceYen = Number(input.priceYen || 0);
  const status = String(input.status || 'active');
  const memo = input.memo ? String(input.memo) : null;
  const updatedAt = toIso(input.updatedAt || new Date());

  const result = await sql`
    INSERT INTO contracts (id, account_id, plan_id, start_date, end_date, price_yen, status, memo, updated_at)
    VALUES (
      ${id},
      ${accountId},
      ${planId},
      ${startDate}::date,
      ${endDate},
      ${priceYen},
      ${status},
      ${memo},
      ${updatedAt}::timestamptz
    )
    ON CONFLICT (id)
    DO UPDATE SET
      account_id = EXCLUDED.account_id,
      plan_id = EXCLUDED.plan_id,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      price_yen = EXCLUDED.price_yen,
      status = EXCLUDED.status,
      memo = EXCLUDED.memo,
      updated_at = EXCLUDED.updated_at
    RETURNING id, account_id, plan_id, start_date, end_date, price_yen, status, memo, created_at, updated_at
  `;

  return normalizeContract(result.rows[0]);
};

export const getPaletteCustomerSummary = async (paletteCustomerId: string, activeOn?: string) => {
  await ensureTables();

  const accountRes = await sql`
    SELECT id, name, palette_customer_id, contact_email, status, notes, created_at, updated_at
    FROM accounts
    WHERE palette_customer_id = ${paletteCustomerId}
    LIMIT 1
  `;

  if (!accountRes.rows.length) return null;
  const account = normalizeAccount(accountRes.rows[0]);

  const contracts = await listContracts({
    accountId: account.id,
    activeOn: activeOn?.trim() || undefined,
  });

  if (!contracts.length) {
    return {
      account,
      contracts: [],
      plans: [],
    };
  }

  const planIds = Array.from(new Set(contracts.map((contract) => contract.planId)));
  const plansRes = await sql`
    SELECT id, code, name, billing_cycle, default_price_yen, description, is_active, created_at, updated_at
    FROM service_plans
  `;

  const planIdSet = new Set(planIds);
  const plans = plansRes.rows.map(normalizePlan).filter((plan) => planIdSet.has(plan.id));

  return {
    account,
    contracts,
    plans,
  };
};
