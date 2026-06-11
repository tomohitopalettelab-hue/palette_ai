import { NextResponse } from 'next/server';
import { createSessionValue, SESSION_COOKIE_NAME, type SessionPayload } from '../../../lib/auth-session';
import { palDbPost } from '../_lib/pal-db-client';

type LoginBody = {
  id?: string;
  password?: string;
  next?: string;
  /** 旧クライアント互換 (現在は無視して自動判定) */
  role?: string;
};

const resolveNextPath = (next: string | undefined, fallback: string, allowPrefix: string): string => {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  // ロールに合わないパスへの next は無視 (ログインループ防止)
  if (!next.startsWith(allowPrefix)) return fallback;
  return next;
};

/**
 * POST /api/login
 * ID / パスワードのみ受け取り、ロールを自動判定する:
 *  1. ADMIN_USERNAME / ADMIN_PASSWORD に一致 → admin
 *  2. pal-db /api/crm/agency-login が成功 → agency (代理店)
 *  3. pal-db /api/verify-chat-login が成功 → customer (顧客)
 *  4. すべて失敗 → 401
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;
    const id = String(body.id || '').trim();
    const password = String(body.password || '');

    if (!id || !password) {
      return NextResponse.json({ success: false, error: 'IDとパスワードを入力してください。' }, { status: 400 });
    }

    let session: SessionPayload | null = null;
    let redirectTo = '/main/bot-settings';
    const exp = Date.now() + 1000 * 60 * 60 * 12;

    // 1. 管理者
    const adminUser = process.env.ADMIN_USERNAME?.trim() || process.env.ADMIN_USER?.trim();
    const adminPass = process.env.ADMIN_PASSWORD?.trim();
    if (adminUser && adminPass && id === adminUser && password === adminPass) {
      session = { role: 'admin', exp };
      redirectTo = resolveNextPath(body.next, '/admin/bot-settings', '/');
    }

    // 2. 代理店
    if (!session) {
      const r = await palDbPost('/api/crm/agency-login', { loginId: id, password });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data?.success && data.agencyId) {
        session = {
          role: 'agency',
          agencyId: String(data.agencyId),
          agencyName: String(data.agencyName || '代理店'),
          exp,
        };
        redirectTo = resolveNextPath(body.next, '/admin/bot-settings', '/admin');
      }
      // r.status 403 = 認証は通ったが代理店ではない → 顧客として続行
      // r.status 401 = 認証失敗 → 顧客判定も試す (ID 空間が異なるため)
    }

    // 3. 顧客
    if (!session) {
      const r = await palDbPost('/api/verify-chat-login', { id, password });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data?.success) {
        const paletteId = String(data.paletteId || '').toUpperCase();
        if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
          return NextResponse.json({ success: false, error: 'ご契約情報の取得に失敗しました。' }, { status: 500 });
        }
        session = {
          role: 'customer',
          customerId: String(data.accountId || ''),
          paletteId,
          exp,
        };
        redirectTo = resolveNextPath(body.next, '/main/bot-settings', '/main');
      }
    }

    if (!session) {
      return NextResponse.json({ success: false, error: 'IDまたはパスワードが違います。' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, redirectTo, role: session.role });
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: await createSessionValue(session),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'ログインに失敗しました。' }, { status: 500 });
  }
}
