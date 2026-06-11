import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseSessionValue, isExpired, SESSION_COOKIE_NAME } from '../../../../lib/auth-session';

/**
 * GET /api/main/me
 * ログイン中の customer セッション情報 (paletteId) を返す。
 * /main/reports 系クライアントページが localStorage 認証の代わりに使う。
 */
export async function GET() {
  const store = await cookies();
  const session = await parseSessionValue(store.get(SESSION_COOKIE_NAME)?.value);
  if (!session || isExpired(session)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }
  const paletteId = String(session.paletteId || '').toUpperCase();
  if (!/^[A-Z][0-9]{4}$/.test(paletteId)) {
    return NextResponse.json({ success: false, error: 'no paletteId in session' }, { status: 403 });
  }
  return NextResponse.json({ success: true, role: session.role, paletteId });
}
