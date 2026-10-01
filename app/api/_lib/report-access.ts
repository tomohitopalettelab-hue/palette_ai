import { cookies } from 'next/headers';
import { isExpired, parseSessionValue, SESSION_COOKIE_NAME } from '../../../lib/auth-session';
import { assertAccessAllowed } from './agency-scope';

/**
 * /api/main/reports/* 用のアクセス確認。
 * middleware の対象外なので、各ハンドラでセッションと paletteId の対応を必ず確認する。
 *  - admin: 全許可
 *  - customer: 自分の paletteId のみ
 *  - agency: 担当顧客のみ（assertAccessAllowed）
 */
export const assertReportAccess = async (paletteId: string): Promise<
  { allowed: true } | { allowed: false; status: number; error: string }
> => {
  const store = await cookies();
  const session = await parseSessionValue(store.get(SESSION_COOKIE_NAME)?.value);
  if (!session || isExpired(session)) return { allowed: false, status: 401, error: 'unauthorized' };
  if (session.role === 'admin') return { allowed: true };
  if (session.role === 'customer') {
    const own = String(session.paletteId || '').toUpperCase();
    if (own && own === paletteId) return { allowed: true };
    return { allowed: false, status: 403, error: 'forbidden' };
  }
  if (session.role === 'agency') return assertAccessAllowed(paletteId);
  return { allowed: false, status: 403, error: 'forbidden' };
};
