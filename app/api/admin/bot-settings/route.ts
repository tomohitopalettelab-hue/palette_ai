import { NextResponse } from 'next/server';
import { palDbGet } from '../../_lib/pal-db-client';
import { listBotConfigPaletteIds } from '../../_lib/bot-store';
import { isPaletteAixPlanCode } from '../../_lib/palette-aix-access';

/**
 * GET /api/admin/bot-settings
 * 全顧客の一覧を取得（palette_crmから取得 + bot_configsがあるか + Palette AIX契約があるか）
 */
export async function GET() {
  try {
    const activeOn = new Date().toISOString().slice(0, 10);
    const [accountsRes, contractsRes, plansRes, configPaletteIds] = await Promise.all([
      palDbGet('/api/accounts'),
      palDbGet(`/api/contracts?activeOn=${encodeURIComponent(activeOn)}`),
      palDbGet('/api/plans?includeInactive=1'),
      listBotConfigPaletteIds(),
    ]);

    const accountsData = await accountsRes.json().catch(() => ({}));
    const contractsData = await contractsRes.json().catch(() => ({}));
    const plansData = await plansRes.json().catch(() => ({}));

    const accountsRaw: any[] = Array.isArray(accountsData)
      ? accountsData
      : Array.isArray(accountsData?.accounts)
        ? accountsData.accounts
        : [];
    const contracts: any[] = Array.isArray(contractsData?.contracts) ? contractsData.contracts : [];
    const plans: any[] = Array.isArray(plansData?.plans) ? plansData.plans : [];

    // Palette AIX契約のあるaccount IDセット
    const aixPlanIds = new Set(
      plans.filter((p: any) => isPaletteAixPlanCode(p?.code || '')).map((p: any) => String(p.id))
    );
    const aixAccountIds = new Set(
      contracts
        .filter((c: any) => aixPlanIds.has(String(c.planId || '')))
        .map((c: any) => String(c.accountId || ''))
    );

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
          hasAixPlan: aixAccountIds.has(String(a.id || '')),
        };
      });

    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    console.error('list bot-settings error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
