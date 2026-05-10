import { NextResponse } from 'next/server';
import { palDbPost, palDbGet } from '../_lib/pal-db-client';

/**
 * Pal Studio (AIホームページ制作) の発注処理
 * 1. accounts 作成 (会社名 + 代表者名)
 * 2. contracts 作成 (planId=pal_studio_standard)
 *    → contracts + crm_contracts + crm_deals + 請求書/Square自動発行
 * 3. 素材ファイルを media/upload に転送して URL リスト取得
 * 4. crm_productions 作成 (template_key='studio', hearing_data に固有項目)
 * 5. メール通知 (代理店へ)
 * 6. LINE通知 (palette_crm の日報と同じチャネルへ)
 */

const PAL_STUDIO_STANDARD_CODE = 'pal_studio_standard';

const getStr = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const agencyPaletteId = getStr(form, 'agencyPaletteId');
    const shopName = getStr(form, 'shopName');
    const representativeName = getStr(form, 'representativeName');
    const industry = getStr(form, 'industry');
    const loginId = getStr(form, 'loginId');
    const loginPassword = getStr(form, 'loginPassword');
    const contactEmail = getStr(form, 'contactEmail');

    if (!shopName || !representativeName || !industry || !loginId || !loginPassword || !contactEmail) {
      return NextResponse.json({ success: false, error: '必須項目が不足しています' }, { status: 400 });
    }

    const priceInitial = getStr(form, 'priceInitial');
    const priceYen = getStr(form, 'priceYen');
    const initialFeePaymentMethod = (getStr(form, 'initialFeePaymentMethod') || 'square') as 'square' | 'invoice';
    const monthlyFeePaymentMethod = (getStr(form, 'monthlyFeePaymentMethod') || 'square') as 'square' | 'invoice';
    const term = getStr(form, 'term');
    const dateContract = getStr(form, 'dateContract');
    const dateDelivery = getStr(form, 'dateDelivery');
    const initialFeeDueDate = getStr(form, 'initialFeeDueDate');
    const firstMonthlyDueDate = getStr(form, 'firstMonthlyDueDate');

    // Pal Studio 固有項目
    const sitePurpose = getStr(form, 'sitePurpose');
    const existingHpUrl = getStr(form, 'existingHpUrl');
    const referenceHps = getStr(form, 'referenceHps');
    const mainColor = getStr(form, 'mainColor');
    const designTaste = getStr(form, 'designTaste');
    const domainPreference = getStr(form, 'domainPreference');
    const domainName = getStr(form, 'domainName');
    const desiredDeliveryDate = getStr(form, 'desiredDeliveryDate');
    const sitemap = getStr(form, 'sitemap');
    const expectedPageCount = getStr(form, 'expectedPageCount');
    const requiredFeatures = getStr(form, 'requiredFeatures');

    // --- 0. ログインID重複チェック ---
    const checkRes = await palDbGet(`/api/chat-auth/check-id?loginId=${encodeURIComponent(loginId)}`);
    const checkData = await checkRes.json().catch(() => ({}));
    if (checkData?.exists) {
      return NextResponse.json({ success: false, error: `ログインID「${loginId}」は既に使われています。` }, { status: 400 });
    }

    // --- 0b. 代理店アカウントID + 代理店名取得 ---
    let agencyAccountId: string | null = null;
    let agencyName = '';
    let agencyEmail = '';
    if (agencyPaletteId) {
      const agencyRes = await palDbGet(`/api/palette-summary?paletteId=${encodeURIComponent(agencyPaletteId)}`);
      const agencyData = await agencyRes.json().catch(() => ({}));
      if (agencyData?.account?.id) {
        agencyAccountId = agencyData.account.id;
        agencyName = agencyData.account.name || '';
        agencyEmail = agencyData.account.contactEmail || '';
      }
    }

    // --- 1. accounts 作成 ---
    const accountRes = await palDbPost('/api/accounts', {
      name: shopName,
      contactName: representativeName,
      contactEmail,
      industry,
      chatLoginId: loginId,
      chatPassword: loginPassword,
      status: 'active',
      agencyId: agencyAccountId,
    });
    const accountData = await accountRes.json().catch(() => ({}));
    if (!accountRes.ok || !accountData?.account) {
      return NextResponse.json({ success: false, error: accountData?.error || '顧客アカウントの作成に失敗しました' }, { status: 500 });
    }
    const newPaletteId = accountData.account.paletteId || accountData.account.palette_id;
    const newAccountId = accountData.account.id;

    // --- 2. service_subscription 登録 ---
    const today = new Date().toISOString().split('T')[0];
    await palDbPost('/api/service-subscriptions', {
      accountId: newAccountId,
      serviceKey: 'pal_studio',
      status: 'active',
      startDate: today,
    });

    // --- 2b. plans から pal_studio_standard を引く ---
    const plansRes = await palDbGet('/api/plans');
    const plansData = await plansRes.json().catch(() => ({ plans: [] }));
    const plans = Array.isArray(plansData?.plans) ? plansData.plans : Array.isArray(plansData) ? plansData : [];
    const palStudioPlan = plans.find((p: any) =>
      String(p.code || '').toLowerCase().replace(/-/g, '_') === PAL_STUDIO_STANDARD_CODE
    ) || plans.find((p: any) =>
      String(p.code || '').toLowerCase().replace(/-/g, '_').includes('pal_studio')
    );

    let dealId: string | null = null;
    if (palStudioPlan) {
      const contractRes = await palDbPost('/api/contracts', {
        accountId: newAccountId,
        planId: palStudioPlan.id,
        phase: 'active',
        status: 'active',
        priceInitial: priceInitial ? Number(priceInitial) : 0,
        priceYen: priceYen ? Number(priceYen) : 0,
        term,
        dateContract: dateContract || today,
        dateDelivery,
        startDate: dateContract || today,
        initialFeeDueDate,
        firstMonthlyDueDate,
        initialFeePaymentMethod,
        monthlyFeePaymentMethod,
      });
      const contractData = await contractRes.json().catch(() => ({}));
      // contracts POST 内で crm_deals が自動生成されるが、id は contract.id と同じ運用
      dealId = contractData?.contract?.id || null;
    }

    // --- 3. 素材ファイルを media/upload へ転送 ---
    const materialUrls: Array<{ url: string; name: string }> = [];
    const materialFiles = form.getAll('materials').filter((f): f is File => f instanceof File);
    if (materialFiles.length > 0) {
      const baseUrl = process.env.PAL_DB_BASE_URL?.trim().replace(/\/$/, '') || '';
      for (const file of materialFiles) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('paletteId', newPaletteId);
          const upRes = await fetch(`${baseUrl}/api/pal-db/media/upload`, { method: 'POST', body: fd });
          const upData = await upRes.json().catch(() => ({}));
          if (upRes.ok && upData?.success && upData?.asset?.url) {
            materialUrls.push({ url: upData.asset.url, name: file.name });
          }
        } catch (uploadErr) {
          console.error('[material upload]', uploadErr);
        }
      }
    }

    // --- 4. crm_productions 作成 (Pal Studio のヒアリング情報を hearing_data に保存) ---
    const hearingData = {
      sitePurpose,
      existingHpUrl,
      referenceHps,
      mainColor,
      designTaste,
      domainPreference,
      domainName,
      sitemap,
      expectedPageCount,
      requiredFeatures,
      materials: materialUrls,
      // 契約情報のメモ
      priceInitial,
      priceYen,
      initialFeePaymentMethod,
      monthlyFeePaymentMethod,
      term,
    };
    try {
      await palDbPost('/api/productions', {
        dealId,
        customerId: newAccountId,
        productId: palStudioPlan?.id || null,
        productName: 'Pal Studio スタンダードプラン',
        templateKey: 'studio',
        status: 'hearing',
        hearingData,
        desiredDeadline: desiredDeliveryDate || null,
        contactName: representativeName,
        contactEmail,
        agencyContactName: agencyName,
        agencyContactEmail: agencyEmail,
      });
    } catch (productionErr) {
      console.error('[productions insert]', productionErr);
    }

    // --- 5. メール通知 (代理店宛) ---
    try {
      const initialJp = initialFeePaymentMethod === 'invoice' ? '請求書払い' : 'スクエア';
      const monthlyJp = monthlyFeePaymentMethod === 'invoice' ? '請求書払い' : 'スクエア';
      const materialsHtml = materialUrls.length
        ? materialUrls.map((m) => `<li><a href="${m.url}">${m.name}</a></li>`).join('')
        : '<li>(添付なし)</li>';
      const emailBody = `
<h2>Pal Studio 発注完了のお知らせ</h2>
<p>以下の内容で発注が完了しました。制作チームへも自動通知済みです。</p>
<table style="border-collapse:collapse;width:100%;max-width:640px;">
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">店舗名</td><td style="padding:8px;border:1px solid #e2e8f0;">${shopName}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">代表者名</td><td style="padding:8px;border:1px solid #e2e8f0;">${representativeName}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">業種</td><td style="padding:8px;border:1px solid #e2e8f0;">${industry}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">顧客ID</td><td style="padding:8px;border:1px solid #e2e8f0;">${newPaletteId}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">ログインID</td><td style="padding:8px;border:1px solid #e2e8f0;">${loginId}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">ログインPW</td><td style="padding:8px;border:1px solid #e2e8f0;">${loginPassword}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">初期費用</td><td style="padding:8px;border:1px solid #e2e8f0;">¥${Number(priceInitial || 0).toLocaleString()}（${initialJp}）</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">月額費用</td><td style="padding:8px;border:1px solid #e2e8f0;">¥${Number(priceYen || 0).toLocaleString()}（${monthlyJp}）</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">契約期間</td><td style="padding:8px;border:1px solid #e2e8f0;">${term || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">納品希望月</td><td style="padding:8px;border:1px solid #e2e8f0;">${dateDelivery || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">納品希望日</td><td style="padding:8px;border:1px solid #e2e8f0;">${desiredDeliveryDate || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">HP の目的</td><td style="padding:8px;border:1px solid #e2e8f0;">${sitePurpose}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">既存HP URL</td><td style="padding:8px;border:1px solid #e2e8f0;">${existingHpUrl || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">参考HP</td><td style="padding:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${referenceHps}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">メインカラー</td><td style="padding:8px;border:1px solid #e2e8f0;">${mainColor}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">デザインテイスト</td><td style="padding:8px;border:1px solid #e2e8f0;">${designTaste}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">希望ドメイン</td><td style="padding:8px;border:1px solid #e2e8f0;">${domainPreference}${domainName ? `（${domainName}）` : ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">サイトマップ</td><td style="padding:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${sitemap}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">想定ページ数</td><td style="padding:8px;border:1px solid #e2e8f0;">${expectedPageCount}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">必要機能</td><td style="padding:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${requiredFeatures || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">添付素材</td><td style="padding:8px;border:1px solid #e2e8f0;"><ul style="margin:0;padding-left:18px;">${materialsHtml}</ul></td></tr>
</table>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">Palette Lab</p>
`;
      const canvasUrl = process.env.PAL_DB_BASE_URL?.replace('/api/pal-db', '') || 'https://palettecrm.vercel.app';
      if (agencyEmail) {
        await fetch(`${canvasUrl}/api/google/gmail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: agencyEmail,
            subject: `【Pal Studio】${shopName} の発注が完了しました`,
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
      const lineText = [
        'Pal Studioの発注がありました！',
        `顧客名：${shopName}`,
        `代理店名：${agencyName || '-'}`,
        `納品希望時期：${dateDelivery || desiredDeliveryDate || '-'}`,
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
      materialUrls,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    console.error('[pal-studio-setup]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
