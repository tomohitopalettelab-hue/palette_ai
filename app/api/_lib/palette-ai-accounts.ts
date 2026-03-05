import { palDbGet } from './pal-db-client';

type PalDbAccount = {
  id: string;
  paletteId: string;
  name: string;
  status: string;
  chatLoginId: string | null;
  chatPasswordSet: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ContractItem = {
  accountId: string;
  planId: string;
};

type PlanItem = {
  id: string;
  code: string;
};

const normalize = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

const isPaletteAiPlanCode = (code: string): boolean => {
  const normalized = normalize(code).replace(/-/g, '_');
  return normalized.includes('palette_ai') || normalized === 'ai' || normalized.startsWith('ai_');
};

const todayYmd = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const listPaletteAiAccountsFromPalDb = async (): Promise<PalDbAccount[]> => {
  const activeOn = todayYmd();
  const [accountsRes, contractsRes, plansRes] = await Promise.all([
    palDbGet('/api/accounts'),
    palDbGet(`/api/contracts?activeOn=${encodeURIComponent(activeOn)}`),
    palDbGet('/api/plans?includeInactive=1'),
  ]);

  if (!accountsRes.ok) {
    throw new Error('pal_db の顧客一覧取得に失敗しました');
  }
  if (!contractsRes.ok) {
    throw new Error('pal_db の契約一覧取得に失敗しました');
  }
  if (!plansRes.ok) {
    throw new Error('pal_db のプラン一覧取得に失敗しました');
  }

  const accountsBody = await accountsRes.json().catch(() => ({}));
  const contractsBody = await contractsRes.json().catch(() => ({}));
  const plansBody = await plansRes.json().catch(() => ({}));

  const accounts: PalDbAccount[] = Array.isArray(accountsBody?.accounts) ? accountsBody.accounts : [];
  const contracts: ContractItem[] = Array.isArray(contractsBody?.contracts) ? contractsBody.contracts : [];
  const plans: PlanItem[] = Array.isArray(plansBody?.plans) ? plansBody.plans : [];

  const targetPlanIds = new Set(
    plans
      .filter((plan) => isPaletteAiPlanCode(plan.code))
      .map((plan) => String(plan.id || '').trim())
      .filter(Boolean),
  );

  const targetAccountIds = new Set(
    contracts
      .filter((item) => targetPlanIds.has(String(item.planId || '').trim()))
      .map((item) => String(item.accountId || '').trim())
      .filter(Boolean),
  );

  return accounts.filter((account) => targetAccountIds.has(String(account.id || '').trim()));
};

export const hasPaletteAiService = async (paletteId: string): Promise<boolean> => {
  const target = String(paletteId || '').trim().toUpperCase();
  if (!target) return false;
  const accounts = await listPaletteAiAccountsFromPalDb();
  return accounts.some((account) => String(account.paletteId || '').trim().toUpperCase() === target);
};
