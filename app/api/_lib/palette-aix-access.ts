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
    const hasAix = contracts.some((contract) => {
      // End-date check
      if (contract.endDate && String(contract.endDate) < activeOn) return false;
      // Status check (active系のみ)
      const status = normalize(contract.status);
      if (status && !['active', 'in progress', '運用中', '本運用', '制作中', '納品済み', '納品済'].some((s) => status.includes(s))) {
        // 非稼働ステータスは除外
        if (['suspended', 'expired', 'cancelled', '停止', '解約'].some((s) => status.includes(s))) return false;
      }
      const plan = planMap.get(String(contract.planId));
      const code = plan?.code || '';
      return isPaletteAixPlanCode(code);
    });

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
