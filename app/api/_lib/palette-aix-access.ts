import { palDbGet } from './pal-db-client';

/**
 * Palette AIX（上位プラン）の契約チェック
 *
 * Palette AIX: palette_aiの全機能 + 営業Bot機能
 * Palette AI (従来): ヒアリングのみ
 *
 * palette_aix契約があれば:
 * - 営業Bot設定・Widget・Reports が使える
 * - palette_ai（ヒアリング）も使える（上位互換）
 */

const normalize = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

/** 商品名を code 形式に正規化 (例: "Palette AIX" → "palette_aix") */
const normalizeNameToCode = (name: string): string =>
  normalize(name).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/** plan code が palette_aix かどうか判定（palette_ai より先にチェック必要） */
export const isPaletteAixPlanCode = (code: string): boolean => {
  const normalized = normalize(code).replace(/-/g, '_');
  // palette_aix, palette_ai_x, palette_aix_basic, palette_aix_standard 等
  return (
    normalized.includes('palette_aix') ||
    normalized.includes('palette_ai_x') ||
    normalized === 'aix' ||
    normalized.startsWith('aix_')
  );
};

/**
 * 管理画面で独自追加した crm_products レコードから商品名を取得。
 * palette-summary の JOIN で service_plans とマッチしない prod-* IDの
 * 契約でも、商品名（例: "Palette AIX"）から AIX 判定できるようにする。
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

const todayYmd = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 簡易in-memoryキャッシュ（5分TTL）— widget.jsが頻繁に呼ぶので
const cache = new Map<string, { hasAix: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 指定paletteIdがPalette AIX契約を持っているか
 */
export const hasPaletteAixPlan = async (paletteId: string): Promise<boolean> => {
  const target = String(paletteId || '').trim().toUpperCase();
  if (!target || !/^[A-Z][0-9]{4}$/.test(target)) return false;

  // Cache check
  const cached = cache.get(target);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.hasAix;
  }

  try {
    const res = await palDbGet(`/api/palette-summary?paletteId=${encodeURIComponent(target)}`);
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));

    const contracts: any[] = Array.isArray(data?.contracts) ? data.contracts : [];
    const plans: any[] = Array.isArray(data?.plans) ? data.plans : [];
    const planMap = new Map<string, any>(plans.map((p: any) => [String(p.id), p]));

    const activeOn = todayYmd();
    const isActiveContract = (contract: any): boolean => {
      if (contract.endDate && String(contract.endDate) < activeOn) return false;
      const status = normalize(contract.status);
      if (status && ['suspended', 'expired', 'cancelled', '停止', '解約'].some((s) => status.includes(s))) return false;
      return true;
    };

    let hasAix = false;
    const prodFallbackIds: string[] = [];
    for (const contract of contracts) {
      if (!isActiveContract(contract)) continue;
      const plan = planMap.get(String(contract.planId));
      const code = plan?.code || '';
      if (isPaletteAixPlanCode(code)) { hasAix = true; break; }
      // contract.planName / contract.planCode 直接指定のケース（palette_crm修正後の経路）
      const planCodeFromContract = (contract as any).planCode ? String((contract as any).planCode) : '';
      if (planCodeFromContract && isPaletteAixPlanCode(planCodeFromContract)) { hasAix = true; break; }
      const planNameFromContract = (contract as any).planName ? String((contract as any).planName) : '';
      if (planNameFromContract && isPaletteAixPlanCode(normalizeNameToCode(planNameFromContract))) { hasAix = true; break; }
      // service_plans とJOINできなかった prod-* ID をフォールバック候補に
      if (!plan && contract.planId) prodFallbackIds.push(String(contract.planId));
    }

    // 応急フォールバック: crm_products API で商品名を取得してAIX判定
    if (!hasAix && prodFallbackIds.length > 0) {
      const names = await Promise.all(prodFallbackIds.map(fetchCrmProductName));
      hasAix = names.some((n) => !!n && isPaletteAixPlanCode(normalizeNameToCode(n)));
    }

    cache.set(target, { hasAix, expiresAt: Date.now() + CACHE_TTL_MS });
    return hasAix;
  } catch (err) {
    console.warn('hasPaletteAixPlan error:', err);
    return false;
  }
};

/** キャッシュをクリア（契約追加直後などに呼ぶ用。オプショナル） */
export const clearAixCache = (paletteId?: string) => {
  if (paletteId) {
    cache.delete(paletteId.toUpperCase());
  } else {
    cache.clear();
  }
};
