import { NextRequest, NextResponse } from 'next/server';
import { isExpired, parseSessionValue, SESSION_COOKIE_NAME } from './lib/auth-session';

const redirectToLogin = (req: NextRequest, role?: 'admin' | 'customer' | 'agency') => {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  if (role) loginUrl.searchParams.set('role', role);
  loginUrl.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await parseSessionValue(cookieValue);

  const isApiAdmin = path.startsWith('/api/admin/');
  const isAdminPath = !isApiAdmin && (path.startsWith('/admin/') || path === '/admin');
  const isCustomerPath = path.startsWith('/main/bot-settings') || path.startsWith('/main/reports');

  // 代理店に許可する /admin と /api/admin の範囲
  const isAgencyAllowedAdminPath =
    path === '/admin/bot-settings' || path.startsWith('/admin/bot-settings/');
  const isAgencyAllowedApiAdmin =
    path === '/api/admin/bot-settings' ||
    /^\/api\/admin\/bot-settings\/[A-Z][0-9]{4}(\/|$)/i.test(path);
  // 代理店に許可しない破壊的操作（admin 専用：account の PATCH/DELETE）
  // GET（状態参照）は agency でも許可
  const method = (req.method || 'GET').toUpperCase();
  const isAgencyDestructiveApi =
    /^\/api\/admin\/bot-settings\/[A-Z][0-9]{4}\/account$/i.test(path) &&
    method !== 'GET';

  // 未認証 or 期限切れ
  if (!session || isExpired(session)) {
    if (isApiAdmin) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }
    const res = redirectToLogin(req, isAdminPath ? 'admin' : 'customer');
    res.cookies.set({ name: SESSION_COOKIE_NAME, value: '', path: '/', maxAge: 0 });
    return res;
  }

  // /api/admin/... は、admin 全許可 / customer 自分分のみ / agency は bot-settings 配下のみ（破壊系除く）
  if (isApiAdmin) {
    if (session.role === 'admin') return NextResponse.next();
    if (session.role === 'customer') {
      const m = path.match(/^\/api\/admin\/bot-settings\/([^/]+)/);
      const ownPaletteId = String(session.paletteId || '').toUpperCase();
      if (m && ownPaletteId && m[1].toUpperCase() === ownPaletteId) {
        return NextResponse.next();
      }
    }
    if (session.role === 'agency') {
      // 停止/削除は admin 専用
      if (isAgencyDestructiveApi) {
        return NextResponse.json({ success: false, error: 'forbidden (agency)' }, { status: 403 });
      }
      // 個別 paletteId のスコープチェックは各 API ハンドラ側で実施
      if (isAgencyAllowedApiAdmin) return NextResponse.next();
    }
    return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
  }

  // /admin/... UI: admin は全許可、agency は bot-settings 配下のみ
  if (isAdminPath) {
    if (session.role === 'admin') return NextResponse.next();
    if (session.role === 'agency' && isAgencyAllowedAdminPath) return NextResponse.next();
    return redirectToLogin(req, 'admin');
  }

  // /main/bot-settings, /main/reports は admin / customer のみ
  if (isCustomerPath && session.role !== 'admin' && session.role !== 'customer') {
    return redirectToLogin(req, 'customer');
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/main/bot-settings',
    '/main/bot-settings/:path*',
    '/main/reports',
    '/main/reports/:path*',
  ],
};
