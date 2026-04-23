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

const normalize = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

const normalizeNameToCode = (name: string): string =>
  normalize(name).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const isPaletteAiPlanCode = (code: string): boolean => {
  const normalized = normalize(code).replace(/-/g, '_');
  // palette_ai または palette_aix（上位プラン）どちらでも許可
  return (
    normalized.includes('palette_ai') ||  // palette_ai / palette_aix 両方にマッチ
    normalized.includes('palette_ai_x') ||
    normalized === 'ai' ||
    normalized === 'aix' ||
    normalized.startsWith('ai_') ||
    normalized.startsWith('aix_')
  );
};

const todayYmd = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * crm_products API から商品名を取得 (palette-summary が planCode を解決できなかった
 * prod-* ID の契約でフォールバック判定するため)
 */
const fetchCrmProductName = async (productId: string): Promise<string | null> => {
  try {
    const base = String(process.env.PAL_DB_BASE_URL || '').trim().replace(/\/$/, '');
    if (!base) return null;
    const res = await fetch(`${base}/api/crm/products/${encodeURIComponent(productId)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    const name = body?.data?.name;
    return name ? String(name) : null;
  } catch {
    return null;
  }
};

const isActiveContract = (contract: any): boolean => {
  const activeOn = todayYmd();
  if (contract.endDate && String(contract.endDate) < activeOn) return false;
  const status = normalize(contract.status);
  if (status && ['suspended', 'expired', 'cancelled', '停止', '解約'].some((s) => status.includes(s))) return false;
  return true;
};

/**
 * palette-summary を使って paletteId の Palette AI 契約を判定
 * (palette_ai / palette_aix どちらでも可、crm_products 経由の契約も解決)
 */
export const hasPaletteAiService = async (paletteId: string): Promise<boolean> => {
  const target = String(paletteId || '').trim().toUpperCase();
  if (!target || !/^[A-Z][0-9]{4}$/.test(target)) return false;
  try {
    const res = await palDbGet(`/api/palette-summary?paletteId=${encodeURIComponent(target)}`);
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    const contracts: any[] = Array.isArray(data?.contracts) ? data.contracts : [];
    const plans: any[] = Array.isArray(data?.plans) ? data.plans : [];
    const planMap = new Map<string, any>(plans.map((p: any) => [String(p.id), p]));

    const prodFallbackIds: string[] = [];
    for (const contract of contracts) {
      if (!isActiveContract(contract)) continue;
      const plan = planMap.get(String(contract.planId));
      const code = plan?.code || (contract as any).planCode || '';
      if (code && isPaletteAiPlanCode(code)) return true;
      const planName = (contract as any).planName ? String((contract as any).planName) : '';
      if (planName && isPaletteAiPlanCode(normalizeNameToCode(planName))) return true;
      if (!plan && contract.planId) prodFallbackIds.push(String(contract.planId));
    }
    // crm_products 経由フォールバック
    if (prodFallbackIds.length > 0) {
      const names = await Promise.all(prodFallbackIds.map(fetchCrmProductName));
      if (names.some((n) => !!n && isPaletteAiPlanCode(normalizeNameToCode(n)))) return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Palette AI 契約がある全顧客のリスト
 * (旧 /api/contracts + /api/plans だと crm_contracts の prod-* 契約を
 * 拾えないため、/api/accounts 全件に hasPaletteAiService を並列適用)
 */
export const listPaletteAiAccountsFromPalDb = async (): Promise<PalDbAccount[]> => {
  const accountsRes = await palDbGet('/api/accounts');
  if (!accountsRes.ok) {
    throw new Error('pal_db の顧客一覧取得に失敗しました');
  }
  const accountsBody = await accountsRes.json().catch(() => ({}));
  const accounts: PalDbAccount[] = Array.isArray(accountsBody?.accounts) ? accountsBody.accounts : [];

  const flags = await Promise.all(
    accounts.map((a) => hasPaletteAiService(String(a.paletteId || ''))),
  );
  return accounts.filter((_, i) => flags[i]);
};
