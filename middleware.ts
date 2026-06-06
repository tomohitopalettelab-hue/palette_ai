import { NextRequest, NextResponse } from 'next/server';
import { isExpired, parseSessionValue, SESSION_COOKIE_NAME } from './lib/auth-session';

const redirectToLogin = (req: NextRequest, role?: 'admin' | 'customer') => {
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

  // 未認証 or 期限切れ
  if (!session || isExpired(session)) {
    if (isApiAdmin) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }
    const res = redirectToLogin(req, isAdminPath ? 'admin' : 'customer');
    res.cookies.set({ name: SESSION_COOKIE_NAME, value: '', path: '/', maxAge: 0 });
    return res;
  }

  // /api/admin/... は、admin なら全許可、customer は /api/admin/bot-settings/[paletteId]/... の自分分のみ
  if (isApiAdmin) {
    if (session.role === 'admin') return NextResponse.next();
    if (session.role === 'customer') {
      const m = path.match(/^\/api\/admin\/bot-settings\/([^/]+)/);
      const ownPaletteId = String(session.paletteId || '').toUpperCase();
      if (m && ownPaletteId && m[1].toUpperCase() === ownPaletteId) {
        return NextResponse.next();
      }
    }
    return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
  }

  // /admin/... UIは admin のみ
  if (isAdminPath && session.role !== 'admin') {
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
