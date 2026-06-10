import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { palDbGet } from '../../_lib/pal-db-client';
import { listBotConfigPaletteIds, listSuspendedPaletteIds } from '../../_lib/bot-store';
import { hasPaletteAixPlan } from '../../_lib/palette-aix-access';
import { parseSessionValue, SESSION_COOKIE_NAME } from '../../../../lib/auth-session';

/**
 * GET /api/admin/bot-settings
 * 全顧客の一覧を取得（palette_crm から + bot_configs 有無 + Palette AIX 契約 + 停止状態）
 *
 * セッションが agency の場合は、その代理店の担当 paletteIds に絞り込んで返す。
 */
export async function GET() {
  try {
    // セッション解決（代理店スコープ判定のため）
    const cookieStore = await cookies();
    const session = await parseSessionValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);

    // agency なら担当 paletteIds を pal-db から取得
    let agencyPaletteIdSet: Set<string> | null = null;
    let agencyName: string | null = null;
    if (session?.role === 'agency' && session.agencyId) {
      try {
        const r = await palDbGet(`/api/crm/agencies/${encodeURIComponent(session.agencyId)}/palette-ids`);
        const data = await r.json().catch(() => ({}));
        if (r.ok && data?.success) {
          const ids: string[] = Array.isArray(data.paletteIds) ? data.paletteIds : [];
          agencyPaletteIdSet = new Set(ids.map((s: string) => String(s).toUpperCase()));
        } else {
          agencyPaletteIdSet = new Set();
        }
      } catch (err) {
        console.warn('agency palette-ids fetch error:', err);
        agencyPaletteIdSet = new Set();
      }
      agencyName = session.agencyName || '代理店';
    }

    const [accountsRes, configPaletteIds, suspendedIds] = await Promise.all([
      palDbGet('/api/accounts'),
      listBotConfigPaletteIds(),
      listSuspendedPaletteIds(),
    ]);
    const suspendedSet = new Set(suspendedIds.map((s) => s.toUpperCase()));

    const accountsData = await accountsRes.json().catch(() => ({}));

    const accountsRaw: any[] = Array.isArray(accountsData)
      ? accountsData
      : Array.isArray(accountsData?.accounts)
        ? accountsData.accounts
        : [];

    const configSet = new Set(configPaletteIds.map((s) => s.toUpperCase()));

    const accounts = await Promise.all(
      accountsRaw
        .filter((a: any) => /^[A-Z][0-9]{4}$/.test(String(a.paletteId || '').toUpperCase()))
        // agency スコープがあれば、その paletteIds のみに絞る
        .filter((a: any) => {
          if (!agencyPaletteIdSet) return true;
          return agencyPaletteIdSet.has(String(a.paletteId || '').toUpperCase());
        })
        .map(async (a: any) => {
          const pid = String(a.paletteId || '').toUpperCase();
          const hasAixPlan = await hasPaletteAixPlan(pid);
          return {
            paletteId: pid,
            name: a.name || '',
            industry: a.industry || '',
            botConfigured: configSet.has(pid),
            hasAixPlan,
            suspended: suspendedSet.has(pid),
          };
        })
    );

    return NextResponse.json({
      success: true,
      accounts,
      viewerRole: session?.role || null,
      agencyName,
    });
  } catch (error: any) {
    console.error('list bot-settings error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
