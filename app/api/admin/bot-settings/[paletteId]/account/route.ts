import { NextResponse } from 'next/server';
import { setAccountSuspended, deleteBotAccount, isAccountSuspended } from '../../../../_lib/bot-store';
import { cookies } from 'next/headers';
import { assertAccessAllowed } from '../../../../_lib/agency-scope';
import { parseSessionValue, SESSION_COOKIE_NAME } from '../../../../../../lib/auth-session';

/** 停止/再開・削除は Palette Lab 管理者だけ（顧客・代理店は不可） */
const isAdminSession = async (): Promise<boolean> => {
  const store = await cookies();
  const session = await parseSessionValue(store.get(SESSION_COOKIE_NAME)?.value);
  return session?.role === 'admin';
};

const validate = (raw: string): string | null => {
  const pid = String(raw || '').trim().toUpperCase();
  return /^[A-Z][0-9]{4}$/.test(pid) ? pid : null;
};

/**
 * GET /api/admin/bot-settings/[paletteId]/account
 * 現在の停止状態を返す
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = validate(raw);
    if (!paletteId) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const suspended = await isAccountSuspended(paletteId);
    return NextResponse.json({ success: true, paletteId, suspended });
  } catch (error: any) {
    console.error('account status get error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/bot-settings/[paletteId]/account
 * body: { suspended: boolean }
 * 停止（URL停止）/ 再開
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }
    const { paletteId: raw } = await params;
    const paletteId = validate(raw);
    if (!paletteId) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    if (typeof body?.suspended !== 'boolean') {
      return NextResponse.json({ success: false, error: 'suspended (boolean) is required' }, { status: 400 });
    }
    await setAccountSuspended(paletteId, body.suspended);
    return NextResponse.json({ success: true, paletteId, suspended: body.suspended });
  } catch (error: any) {
    console.error('account status patch error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/bot-settings/[paletteId]/account
 * Bot データ（config/services/faqs/sessions/停止フラグ）を完全削除。
 * pal-db 側の契約には触れない。
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }
    const { paletteId: raw } = await params;
    const paletteId = validate(raw);
    if (!paletteId) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400 });
    }
    await deleteBotAccount(paletteId);
    return NextResponse.json({ success: true, paletteId, deleted: true });
  } catch (error: any) {
    console.error('account delete error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
