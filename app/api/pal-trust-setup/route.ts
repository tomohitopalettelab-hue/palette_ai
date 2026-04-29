import { NextResponse } from 'next/server';
import { palDbPost, palDbGet } from '../_lib/pal-db-client';
import { getServiceUrl } from '../_lib/service-ports';

type SetupRequest = {
  agencyPaletteId: string;
  shopName: string;
  industry: string;
  loginId: string;
  loginPassword: string;
  priceInitial?: string;
  priceYen?: string;
  initialFeePaymentMethod?: 'square' | 'invoice';
  monthlyFeePaymentMethod?: 'square' | 'invoice';
  term?: string;
  dateContract?: string;
  dateDelivery?: string;
  initialFeeDueDate?: string;
  firstMonthlyDueDate?: string;
  googleMapUrl?: string;
  adminGoogleMapUrl?: string;
  surveyQuestions?: string;
  minStarsForGoogle?: string;
  aiReviewTaste?: string;
  themeName?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SetupRequest;

    if (!body.shopName || !body.industry || !body.loginId || !body.loginPassword || !body.adminGoogleMapUrl) {
      return NextResponse.json({ success: false, error: '店舗名、業種、ログインID、パスワード、Googleビジネスプロフィール URLは必須です' }, { status: 400 });
    }

    // --- 0. ログインID重複チェック ---
    const checkRes = await palDbGet(`/api/chat-auth/check-id?loginId=${encodeURIComponent(body.loginId)}`);
    const checkData = await checkRes.json().catch(() => ({}));
    if (checkData?.exists) {
      return NextResponse.json({ success: false, error: `ログインID「${body.loginId}」は既に使われています。別のIDを指定してください。` }, { status: 400 });
    }

    // --- 0b. 代理店（発注元）のaccountIdを取得 ---
    let agencyAccountId: string | null = null;
    if (body.agencyPaletteId) {
      const agencyRes = await palDbGet(`/api/palette-summary?paletteId=${encodeURIComponent(body.agencyPaletteId)}`);
      const agencyData = await agencyRes.json().catch(() => ({}));
      if (agencyData?.account?.id) {
        agencyAccountId = agencyData.account.id;
      }
    }

    // --- 1. pal_db: 新規顧客アカウント作成 ---
    const accountRes = await palDbPost('/api/accounts', {
      name: body.shopName,
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

    const newPaletteId = accountData.account.paletteId || accountData.account.palette_id;
    const newAccountId = accountData.account.id;

    // --- 2. pal_db: サービスサブスクリプション登録 (pal_trust) ---
    const today = new Date().toISOString().split('T')[0];
    await palDbPost('/api/service-subscriptions', {
      accountId: newAccountId,
      serviceKey: 'pal_trust',
      status: 'active',
      startDate: today,
    });

    // --- 2b. pal_db: 契約(contract)作成 ---
    // まずpal_trustのプランIDを取得
    const plansRes = await palDbGet('/api/plans');
    const plansData = await plansRes.json().catch(() => ({ plans: [] }));
    const plans = Array.isArray(plansData?.plans) ? plansData.plans : Array.isArray(plansData) ? plansData : [];
    const palTrustPlan = plans.find((p: any) =>
      String(p.code || '').toLowerCase().replace(/-/g, '_').includes('pal_trust')
    );

    if (palTrustPlan) {
      await palDbPost('/api/contracts', {
        accountId: newAccountId,
        planId: palTrustPlan.id,
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
        // 支払方法 (square=Square自動発行・invoice=請求書のみ)
        initialFeePaymentMethod: body.initialFeePaymentMethod || 'square',
        monthlyFeePaymentMethod: body.monthlyFeePaymentMethod || 'square',
      });
    }

    // --- 3. pal_trust: 設定を反映 ---
    const palTrustUrl = getServiceUrl('pal_trust');
    if (palTrustUrl) {
      // customerId = loginId でpal_trustの設定を保存（URLにpaletteIdを表示しない）
      const surveyItems = buildSurveyItems(body.surveyQuestions || '');
      const settingsPayload = {
        customerId: body.loginId,
        settings: {
          appName: body.shopName,
          industry: body.industry,
          googleMapUrl: body.googleMapUrl || '',
          adminGoogleMapUrl: body.adminGoogleMapUrl || '',
          minStarsForGoogle: body.minStarsForGoogle || '4',
          aiReviewTaste: body.aiReviewTaste || 'friendly',
          themeName: body.themeName || 'standard',
        },
        surveyItems,
      };

      await fetch(`${palTrustUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPayload),
      });
    }

    // --- 4. メール通知（顧客にメールアドレスがあれば） ---
    try {
      // 代理店情報
      const agencyParams = new URLSearchParams({ paletteId: body.agencyPaletteId || '' });
      const agencyRes = await palDbGet(`/api/palette-summary?${agencyParams.toString()}`);
      const agencyData = await agencyRes.json().catch(() => ({}));
      const agencyEmail = agencyData?.account?.contactEmail;

      // Pal Trust基本情報URL
      const trustAdminUrl = `https://trust.palette-lab.com/${body.loginId}/admin`;
      const trustPlatformUrl = `https://trust.palette-lab.com/platform-admin/`;

      const emailBody = `
<h2>Pal Trust 発注完了のお知らせ</h2>
<p>以下の内容で発注が完了しました。</p>
<table style="border-collapse:collapse;width:100%;max-width:600px;">
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">店舗名</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.shopName}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">業種</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.industry}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">ログインID</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.loginId}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">ログインPW</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.loginPassword}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">顧客ID</td><td style="padding:8px;border:1px solid #e2e8f0;">${newPaletteId}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">初期費用</td><td style="padding:8px;border:1px solid #e2e8f0;">¥${Number(body.priceInitial || 0).toLocaleString()}（${body.initialFeePaymentMethod === 'invoice' ? '請求書払い' : 'スクエア'}）</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">月額費用</td><td style="padding:8px;border:1px solid #e2e8f0;">¥${Number(body.priceYen || 0).toLocaleString()}（${body.monthlyFeePaymentMethod === 'invoice' ? '請求書払い' : 'スクエア'}）</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">契約期間</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.term || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">契約日</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.dateContract || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">納品希望月</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.dateDelivery || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">初期費用支払予定日</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.initialFeeDueDate || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">初回月額支払予定日</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.firstMonthlyDueDate || '-'}</td></tr>
<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">GBP URL</td><td style="padding:8px;border:1px solid #e2e8f0;">${body.adminGoogleMapUrl || '-'}</td></tr>
</table>
<p style="margin-top:16px;">
<strong>Pal Trust 管理画面:</strong><br>
<a href="${trustPlatformUrl}">${trustPlatformUrl}</a>
</p>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">Palette Lab</p>
`;

      // Palette Canvas経由でGmail送信
      const canvasUrl = process.env.PAL_DB_BASE_URL?.replace('/api/pal-db', '') || 'https://palettecrm.vercel.app';
      if (agencyEmail) {
        await fetch(`${canvasUrl}/api/google/gmail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: agencyEmail,
            subject: `【Pal Trust】${body.shopName} の発注が完了しました`,
            body: emailBody,
          }),
        });
      }
    } catch (emailErr) {
      console.error('[Email notification]', emailErr);
      // メール送信失敗は発注処理には影響させない
    }

    return NextResponse.json({
      success: true,
      paletteId: newPaletteId,
      accountId: newAccountId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function buildSurveyItems(questionsText: string) {
  if (!questionsText.trim()) {
    // デフォルトのアンケート項目
    return [
      { id: 1, text: '接客の満足度はどうでしたか？', type: 'rating' },
      { id: 2, text: '具体的に良かった点や改善点を教えてください', type: 'free' },
    ];
  }

  const lines = questionsText.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line, index) => ({
    id: index + 1,
    text: line,
    type: index === 0 ? 'rating' : 'free',
  }));
}
