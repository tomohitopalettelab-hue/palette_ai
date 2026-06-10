import { cookies } from 'next/headers';
import { parseSessionValue, SESSION_COOKIE_NAME } from '../../../lib/auth-session';
import { palDbGet } from './pal-db-client';

/**
 * /api/admin/bot-settings/[paletteId]/... 配下の各ハンドラで、
 * agency セッションの場合にその paletteId へのアクセス権を確認する。
 *
 * 戻り値:
 *  - { allowed: true }            → admin / customer 自分分 / agency 担当顧客
 *  - { allowed: false, reason }   → agency が他社の paletteId にアクセスしようとした
 *
 * admin / customer に対しては middleware が既にロール別に許可しているため、
 * このヘルパーは agency 時のみ追加チェックを実施する。
 */
export const assertAccessAllowed = async (paletteId: string): Promise<
  { allowed: true } | { allowed: false; status: number; error: string }
> => {
  const cookieStore = await cookies();
  const session = await parseSessionValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return { allowed: false, status: 401, error: 'unauthorized' };
  }
  if (session.role === 'admin') return { allowed: true };
  if (session.role === 'customer') return { allowed: true };
  if (session.role === 'agency') {
    if (!session.agencyId) {
      return { allowed: false, status: 403, error: 'agency session invalid' };
    }
    try {
      const r = await palDbGet(`/api/crm/agencies/${encodeURIComponent(session.agencyId)}/palette-ids`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.success) {
        return { allowed: false, status: 403, error: 'agency scope unavailable' };
      }
      const ids: string[] = Array.isArray(data.paletteIds) ? data.paletteIds : [];
      const target = String(paletteId || '').toUpperCase();
      if (ids.map((s) => String(s).toUpperCase()).includes(target)) {
        return { allowed: true };
      }
      return { allowed: false, status: 403, error: 'agency does not own this paletteId' };
    } catch {
      return { allowed: false, status: 403, error: 'agency scope check failed' };
    }
  }
  return { allowed: false, status: 403, error: 'forbidden' };
};
