import { NextResponse } from 'next/server';
import { palDbPost, palDbGet } from '../_lib/pal-db-client';
import { getBotConfigOrDefault, upsertBotConfig } from '../_lib/bot-store';

/**
 * Palette AIX (営業AIチャットBot) の発注処理
 * 1. accounts 作成 (会社名 + 代表者名)
 * 2. contracts 作成 (planId=palette_aix, 初期費用/月額/支払方法)
 *    → contracts + crm_contracts + crm_deals + Square連動
 * 3. crm_productions 作成 (template_key='ai', hearing_data に固有項目)
 * 4. bot_configs 初期セットアップ: AI要約通知の email / LINE を反映
 * 5. メール通知 (代理店)
 * 6. LINE通知 (palette_crm の日報と同じチャネル)
 */

const PALETTE_AIX_CODE = 'palette_aix';

type SetupRequest = {
  agencyPaletteId?: string;
  shopName: string;
  representativeName: string;
  industry: string;
  loginId: string;
  loginPassword: string;
  contactEmail: string;
  priceInitial?: string;
  priceYen?: string;
  initialFeePaymentMethod?: 'square' | 'invoice';
  monthlyFeePaymentMethod?: 'square' | 'invoice';
  term?: string;
  dateContract?: string;
  dateDelivery?: string;
  initialFeeDueDate?: string;
  firstMonthlyDueDate?: string;
  targetSiteUrls: string;
  botPurpose: string;
  targetPersona: string;
  servicesSummary: string;
  faqContent?: string;
  notifyEmail: string;
  lineChannelToken?: string;
  lineUserId?: string;
  notes?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SetupRequest;

    if (
      !body.shopName || !body.representativeName || !body.industry ||
      !body.loginId || !body.loginPassword || !body.contactEmail ||
      !body.targetSiteUrls || !body.botPurpose || !body.targetPersona ||
      !body.servicesSummary || !body.notifyEmail
    ) {
      return NextResponse.json({ success: false, error: '必須項目が不足しています' }, { status: 400 });
    }

    // --- 0. ログインID重複チェック ---
    const checkRes = await palDbGet(`/api/chat-auth/check-id?loginId=${encodeURIComponent(body.loginId)}`);
    const checkData = await checkRes.json().catch(() => ({}));
    if (checkData?.exists) {
      return NextResponse.json({ success: false, error: `ログインID「${body.loginId}」は既に使われています。` }, { status: 400 });
    }

    // --- 0b. 代理店情報取得 ---
    let agencyAccountId: string | null = null;
    let agencyName = '';
    let agencyEmail = '';
    if (body.agencyPaletteId) {
      const agencyRes = await palDbGet(`/api/palette-summary?paletteId=${encodeURIComponent(body.agencyPaletteId)}`);
      const agencyData = await agencyRes.json().catch(() => ({}));
      if (agencyData?.account?.id) {
        agencyAccountId = agencyData.account.id;
        agencyName = agencyData.account.name || '';
        agencyEmail = agencyData.account.contactEmail || '';
      }
    }

    // --- 1. accounts 作成 ---
    const accountRes = await palDbPost('/api/accounts', {
      name: body.shopName,
      contactName: body.representativeName,
      contactEmail: body.contactEmail,
      industry: body.industry,
      chatLoginId: body.loginId,
      chatPassword: body.loginPassword,
      status: 'active',
      agencyId: agencyAccountId,
    });
    const accountData = await accountRes.json().catch(() => ({}));
    if (!accountRes.ok || !accountData?.account) {
      return NextResponse.json({ success: false, error: accountData?.error || '顧客アカウントの作成に失敗しました' }, { status: 500 });
    }
    const newPaletteId = (accountData.account.paletteId || accountData.account.palette_id || '').toUpperCase();
    const newAccountId = accountData.account.id;

    // --- 2. service_subscription 登録 ---
    const today = new Date().toISOString().split('T')[0];
    await palDbPost('/api/service-subscriptions', {
      accountId: newAccountId,
      serviceKey: 'palette_aix',
      status: 'active',
      startDate: today,
    });

    // --- 2b. plans から palette_aix を引いて契約作成 ---
    const plansRes = await palDbGet('/api/plans');
    const plansData = await plansRes.json().catch(() => ({ plans: [] }));
    const plans = Array.isArray(plansData?.plans) ? plansData.plans : Array.isArray(plansData) ? plansData : [];
    const aixPlan = plans.find((p: any) =>
      String(p.code || '').toLowerCase().replace(/-/g, '_') === PALETTE_AIX_CODE
    ) || plans.find((p: any) =>
      String(p.code || '').toLowerCase().replace(/-/g, '_').includes('palette_aix')
    );

    let dealId: string | null = null;
    if (aixPlan) {
      const contractRes = await palDbPost('/api/contracts', {
        accountId: newAccountId,
        planId: aixPlan.id,
        phase: 'active',
        status: 'active',
        priceInitial: body.priceInitial ? Number(body.priceInitial) : 0,
        priceYen: body.priceYen ? Number(body.priceYen) : 0,
        term: body.term || '',
        dateContract: body.dateContract || today,
        dateDelivery: body.dateDelivery || '',
        startDate: body.dateContract || today,
        initialFeeDueDate: body.initialFeeDueDate || '',
        firstMonthlyDueDate: body.firstMonthlyDueDate || '',
        initialFeePaymentMethod: body.initialFeePaymentMethod || 'square',
        monthlyFeePaymentMethod: body.monthlyFeePaymentMethod || 'square',
      });
      const contractData = await contractRes.json().catch(() => ({}));
      dealId = contractData?.contract?.id || null;
    }

    // --- 3. crm_productions 作成 (Palette AIX ヒアリング情報) ---
    const siteUrlList = String(body.targetSiteUrls || '')
      .split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const hearingData = {
      targetSiteUrls: siteUrlList,
      botPurpose: body.botPurpose,
      targetPersona: body.targetPersona,
      servicesSummary: body.servicesSummary,
      faqContent: body.faqContent || '',
      notifyEmail: body.notifyEmail,
      lineChannelToken: body.lineChannelToken || '',
      lineUserId: body.lineUserId || '',
      // 契約情報も参考用に
      priceInitial: body.priceInitial,
      priceYen: body.priceYen,
      term: body.term,
      initialFeePaymentMethod: body.initialFeePaymentMethod,
      monthlyFeePaymentMethod: body.monthlyFeePaymentMethod,
    };
    try {
      await palDbPost('/api/productions', {
        dealId,
        customerId: newAccountId,
        productId: aixPlan?.id || null,
        productName: 'Palette AIX',
        templateKey: 'ai',
        status: 'hearing',
        hearingData,
        notes: body.notes || '',
        desiredDeadline: body.dateDelivery || null,
        contactName: body.representativeName,
        contactEmail: body.contactEmail,
        agencyContactName: agencyName,
        agencyContactEmail: agencyEmail,
      });
    } catch (productionErr) {
      console.error('[productions insert]', productionErr);
    }

    // --- 4. Bot 初期設定: AI要約通知の宛先を反映 ---
    try {
      const cfg = await getBotConfigOrDefault(newPaletteId);
      const merged = {
        ...cfg,
        basic: {
          ...(cfg.basic || {}),
          shopName: body.shopName,
          industry: body.industry,
        },
        goals: {
          ...(cfg.goals || {}),
          notify: {
            ...(cfg.goals?.notify || {}),
            enabled: true,
            emailAddress: body.notifyEmail,
            lineChannelToken: body.lineChannelToken || '',
            lineUserId: body.lineUserId || '',
          },
        },
      };
      await upsertBotConfig({ ...merged, paletteId: newPaletteId });
    } catch (botCfgErr) {
      console.error('[bot config init]', botCfgErr);
    }

    // --- 5. メール通知 (代理店宛) ---
    try {
      const initialJp = body.initialFeePaymentMethod === 'invoice' ? '請求書払い' : 'スクエア';
      const monthlyJp = body.monthlyFeePaymentMethod === 'invoice' ? '請求書払い' : 'スクエア';
      const sitesHtml = siteUrlList.length
        ? siteUrlList.map((u) => `<li><a href="${u}">${u}</a></li>`).join('')
        : '<li>-</li>';
      const emailBody = `
<h2>Palette AIX 発注完了のお知らせ</h2>
<p>以下の内容で発注が完了しました。制作チームへも自動通知済みです。</p>
<table style="border-collapse:collapse;width:100%;max-width:640px;">
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">店舗名</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.shopName}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">代表者名</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.representativeName}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">業種</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.industry}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">顧客ID</td><td style="padding:8px;border:1px solid #e2e8f0;">${newPaletteId}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">ログインID</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.loginId}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">ログインPW</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.loginPassword}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">初期費用</td><td style="padding:8px;border:1px solid #e2e8f0;">¥${Number(body.priceInitial || 0).toLocaleString()}（${initialJp}）</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">月額費用</td><td style="padding:8px;border:1px solid #e2e8f0;">¥${Number(body.priceYen || 0).toLocaleString()}（${monthlyJp}）</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">契約期間</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.term || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">納品希望月</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.dateDelivery || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">設置先HP</td><td style="padding:8px;border:1px solid #e2e8f0;"><ul style="margin:0;padding-left:18px;">${sitesHtml}</ul></td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">Botの主目的</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.botPurpose}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">ターゲット顧客像</td><td style="padding:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${body.targetPersona}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">提案サービス概要</td><td style="padding:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${body.servicesSummary}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">よくあるQ&A</td><td style="padding:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${body.faqContent || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">AI要約通知メール</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.notifyEmail}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">LINE通知設定</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.lineChannelToken ? '設定済み' : '未設定'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">備考・要望</td><td style="padding:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${body.notes || '-'}</td></tr>
</table>
<p style="margin-top:16px;">
<strong>埋め込みコード:</strong><br>
<code>&lt;script src="https://ai.palette-lab.com/widget.js?id=${newPaletteId}" async&gt;&lt;/script&gt;</code>
</p>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">Palette Lab</p>
`;
      const canvasUrl = process.env.PAL_DB_BASE_URL?.replace('/api/pal-db', '') || 'https://palettecrm.vercel.app';
      if (agencyEmail) {
        await fetch(`${canvasUrl}/api/google/gmail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: agencyEmail,
            subject: `【Palette AIX】${body.shopName} の発注が完了しました`,
            body: emailBody,
          }),
        });
      }
    } catch (emailErr) {
      console.error('[Email notification]', emailErr);
    }

    // --- 6. LINE 通知 (指定文言) ---
    try {
      const canvasUrl = process.env.PAL_DB_BASE_URL?.replace('/api/pal-db', '') || 'https://palettecrm.vercel.app';
      const firstSite = siteUrlList[0] || '-';
      const lineText = [
        'Palette AIXの発注がありました！',
        `顧客名：${body.shopName}`,
        `代理店名：${agencyName || '-'}`,
        `設置先HP：${firstSite}${siteUrlList.length > 1 ? ` 他${siteUrlList.length - 1}件` : ''}`,
      ].join('\n');
      await fetch(`${canvasUrl}/api/line/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lineText }),
      });
    } catch (lineErr) {
      console.error('[LINE notification]', lineErr);
    }

    return NextResponse.json({
      success: true,
      paletteId: newPaletteId,
      accountId: newAccountId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    console.error('[palette-aix-setup]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
