import { NextResponse } from 'next/server';
import { palDbPost, palDbGet } from '../_lib/pal-db-client';
import { getServiceUrl } from '../_lib/service-ports';

type SetupRequest = {
  agencyPaletteId: string;
  shopName: string;
  industry: string;
  loginId: string;
  loginPassword: string;
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

    if (!body.shopName || !body.industry || !body.loginId || !body.loginPassword) {
      return NextResponse.json({ success: false, error: '店舗名、業種、ログインID、パスワードは必須です' }, { status: 400 });
    }

    // --- 1. pal_db: 新規顧客アカウント作成 ---
    const accountRes = await palDbPost('/api/accounts', {
      name: body.shopName,
      industry: body.industry,
      chatLoginId: body.loginId,
      chatPassword: body.loginPassword,
      status: 'active',
    });
    const accountData = await accountRes.json().catch(() => ({}));
    if (!accountRes.ok || !accountData?.account) {
      return NextResponse.json({ success: false, error: accountData?.error || '顧客アカウントの作成に失敗しました' }, { status: 500 });
    }

    const newPaletteId = accountData.account.paletteId || accountData.account.palette_id;
    const newAccountId = accountData.account.id;

    // --- 2. pal_db: サービスサブスクリプション登録 (pal_trust) ---
    await palDbPost('/api/service-subscriptions', {
      accountId: newAccountId,
      serviceKey: 'pal_trust',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
    });

    // --- 3. pal_trust: 設定を反映 ---
    const palTrustUrl = getServiceUrl('pal_trust');
    if (palTrustUrl) {
      // customerId = paletteId でpal_trustの設定を保存
      const surveyItems = buildSurveyItems(body.surveyQuestions || '');
      const settingsPayload = {
        customerId: newPaletteId,
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
