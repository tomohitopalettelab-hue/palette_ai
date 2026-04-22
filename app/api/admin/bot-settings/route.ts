import { NextResponse } from 'next/server';
import { palDbGet } from '../../_lib/pal-db-client';
import { listBotConfigPaletteIds } from '../../_lib/bot-store';

/**
 * GET /api/admin/bot-settings
 * 全顧客の一覧を取得（palette_crmから取得 + bot_configsがあるかフラグ付き）
 */
export async function GET() {
  try {
    const [accountsRes, configPaletteIds] = await Promise.all([
      palDbGet('/api/accounts'),
      listBotConfigPaletteIds(),
    ]);

    const accountsData = await accountsRes.json().catch(() => ({}));
    const accountsRaw: any[] = Array.isArray(accountsData)
      ? accountsData
      : Array.isArray(accountsData?.accounts)
        ? accountsData.accounts
        : [];

    const configSet = new Set(configPaletteIds.map((s) => s.toUpperCase()));

    const accounts = accountsRaw
      .filter((a: any) => /^[A-Z][0-9]{4}$/.test(String(a.paletteId || '').toUpperCase()))
      .map((a: any) => {
        const pid = String(a.paletteId || '').toUpperCase();
        return {
          paletteId: pid,
          name: a.name || '',
          industry: a.industry || '',
          botConfigured: configSet.has(pid),
        };
      });

    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    console.error('list bot-settings error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
