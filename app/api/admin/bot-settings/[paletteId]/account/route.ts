import { NextResponse } from 'next/server';
import { setAccountSuspended, deleteBotAccount, isAccountSuspended } from '../../../../_lib/bot-store';
import { assertAccessAllowed } from '../../../../_lib/agency-scope';

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
