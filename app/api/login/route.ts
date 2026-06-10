import { NextResponse } from 'next/server';
import { createSessionValue, SESSION_COOKIE_NAME, type SessionPayload } from '../../../lib/auth-session';
import { palDbPost } from '../_lib/pal-db-client';

type LoginBody = {
  role?: 'admin' | 'customer' | 'agency';
  id?: string;
  password?: string;
  next?: string;
};

const resolveNextPath = (next?: string, fallback: string = '/main') => {
  if (!next) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//')) return fallback;
  return next;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;
    const role = body.role;
    const id = String(body.id || '').trim();
    const password = String(body.password || '');

    if ((role !== 'admin' && role !== 'customer' && role !== 'agency') || !id || !password) {
      return NextResponse.json({ success: false, error: 'IDとパスワードを入力してください。' }, { status: 400 });
    }

    let session: SessionPayload | null = null;
    let redirectTo = '/admin';

    if (role === 'admin') {
      const adminUser = process.env.ADMIN_USERNAME?.trim() || process.env.ADMIN_USER?.trim();
      const adminPass = process.env.ADMIN_PASSWORD?.trim();
      if (!adminUser || !adminPass) {
        return NextResponse.json({ success: false, error: '管理者ログイン設定が未構成です。' }, { status: 500 });
      }
      if (id !== adminUser || password !== adminPass) {
        return NextResponse.json({ success: false, error: 'IDまたはパスワードが違います。' }, { status: 401 });
      }

      session = {
        role: 'admin',
        exp: Date.now() + 1000 * 60 * 60 * 12,
      };
      redirectTo = resolveNextPath(body.next, '/admin');
    }

    if (role === 'customer') {
      // palette_crm の chat-auth (chatLoginId/chatPassword) で認証
      const r = await palDbPost('/api/verify-chat-login', { id, password });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.success) {
        return NextResponse.json({ success: false, error: 'IDまたはパスワードが違います。' }, { status: 401 });
      }
      const paletteId = String(data.paletteId || '').toUpperCase();
      if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
        return NextResponse.json({ success: false, error: 'ご契約情報の取得に失敗しました。' }, { status: 500 });
      }
      session = {
        role: 'customer',
        customerId: String(data.accountId || ''),
        paletteId,
        exp: Date.now() + 1000 * 60 * 60 * 12,
      };
      redirectTo = resolveNextPath(body.next, '/main');
    }

    if (role === 'agency') {
      // pal-db の代理店ログイン endpoint で認証 + 代理店判定
      const r = await palDbPost('/api/crm/agency-login', { loginId: id, password });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.success) {
        const status = r.status === 403 ? 403 : 401;
        const msg = r.status === 403
          ? '代理店としての登録がありません。'
          : 'IDまたはパスワードが違います。';
        return NextResponse.json({ success: false, error: msg }, { status });
      }
      const agencyId = String(data.agencyId || '');
      if (!agencyId) {
        return NextResponse.json({ success: false, error: '代理店情報の取得に失敗しました。' }, { status: 500 });
      }
      session = {
        role: 'agency',
        agencyId,
        agencyName: String(data.agencyName || '代理店'),
        exp: Date.now() + 1000 * 60 * 60 * 12,
      };
      redirectTo = resolveNextPath(body.next, '/admin/bot-settings');
    }

    if (!session) {
      return NextResponse.json({ success: false, error: 'ログイン情報が不正です。' }, { status: 400 });
    }

    const res = NextResponse.json({ success: true, redirectTo });
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
