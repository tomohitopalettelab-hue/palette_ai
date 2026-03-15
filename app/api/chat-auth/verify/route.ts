import { NextRequest, NextResponse } from 'next/server';
import { palDbGet, palDbPost } from '../../_lib/pal-db-client';
import { hasPaletteAiService } from '../../_lib/palette-ai-accounts';

type ServiceCard = {
  key: string;
  title: string;
  description: string;
  planName: string;
  planCode: string;
  phase: string;
  status: string;
};

const formatDate = (raw?: string | null): string => {
  if (!raw) return '未設定';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString('ja-JP');
};

const buildServiceSummaryText = (summary: any, paletteId: string): string => {
  const accountName = summary?.account?.name || '顧客名未設定';
  const contracts: any[] = Array.isArray(summary?.contracts) ? summary.contracts : [];
  const plans: any[] = Array.isArray(summary?.plans) ? summary.plans : [];

  if (!contracts.length) {
    return `認証が完了しました。\n顧客ID ${paletteId}（${accountName}）の有効なサービス情報は現在登録されていません。\n続けて、ご希望の要件を教えてください。`;
  }

  const planMap = new Map<string, any>(plans.map((plan) => [String(plan.id), plan]));
  const lines = contracts.map((contract, index) => {
    const plan = planMap.get(String(contract.planId));
    const planName = plan?.name || '不明なプラン';
    const phase = contract?.phase || '未設定';
    const status = contract?.status || '未設定';
    const startDate = formatDate(contract?.startDate);
    const endDate = contract?.endDate ? formatDate(contract.endDate) : '継続中';
    const price = Number(contract?.priceYen || 0).toLocaleString('ja-JP');
    return `${index + 1}. ${planName} / フェーズ: ${phase} / ステータス: ${status} / 期間: ${startDate}〜${endDate} / 月額: ¥${price}`;
  });

  return [
    `認証が完了しました。顧客ID ${paletteId} の契約サービス内容です。`,
    ...lines,
    '',
    '続けて、作りたいサイトの要件を教えてください。',
  ].join('\n');
};

const isPalStudioPlanCode = (code: string): boolean => {
  const normalized = String(code || '').trim().toLowerCase().replace(/-/g, '_');
  return normalized === 'pal_studio_lite'
    || normalized === 'pal_studio_standard'
    || normalized === 'pal_studio_pro';
};

const isPalVideoPlanCode = (code: string): boolean => {
  const normalized = String(code || '').trim().toLowerCase().replace(/-/g, '_');
  return normalized === 'pal_video_lite'
    || normalized === 'pal_video_standard'
    || normalized === 'pal_video_pro';
};

const isPalOptPlanCode = (code: string): boolean => {
  const normalized = String(code || '').trim().toLowerCase().replace(/-/g, '_');
  return normalized === 'pal_opt_lite' || normalized === 'pal_opt_standard';
};

const resolveServiceKey = (plan: any): string => {
  const code = String(plan?.code || '').toLowerCase();
  const normalized = code.replace(/-/g, '_');
  if (isPalStudioPlanCode(normalized)) return 'pal_studio';
  if (isPalVideoPlanCode(normalized)) return 'pal_video';
  if (isPalOptPlanCode(normalized)) return 'pal_opt';
  if (normalized.includes('palette_ai') || normalized === 'ai' || normalized.startsWith('ai_')) return 'palette_ai';
  if (normalized.includes('pal_trust') || normalized === 'trust' || normalized.startsWith('trust_')) return 'pal_trust';
  return 'other';
};

const getServiceMeta = (serviceKey: string) => {
  if (serviceKey === 'pal_studio') {
    return { title: 'Pal Studio', description: 'HP/LP制作' };
  }
  if (serviceKey === 'pal_video') {
    return { title: 'Pal Video', description: '動画制作' };
  }
  if (serviceKey === 'palette_ai') {
    return { title: 'Palette Ai', description: 'アシスタント' };
  }
  if (serviceKey === 'pal_trust') {
    return { title: 'Pal Trust', description: '口コミシステム' };
  }
  if (serviceKey === 'pal_opt') {
    return { title: 'Pal Opt', description: '投稿代行サービス' };
  }
  return { title: 'Other Service', description: '契約サービス' };
};

const extractServiceCards = (summary: any): ServiceCard[] => {
  const contracts: any[] = Array.isArray(summary?.contracts) ? summary.contracts : [];
  const plans: any[] = Array.isArray(summary?.plans) ? summary.plans : [];
  const planMap = new Map<string, any>(plans.map((plan) => [String(plan.id), plan]));

  const byService = new Map<string, ServiceCard>();
  contracts.forEach((contract) => {
    const plan = planMap.get(String(contract.planId));
    if (!plan) return;

    const serviceKey = resolveServiceKey(plan);
    const meta = getServiceMeta(serviceKey);
    if (!byService.has(serviceKey)) {
      byService.set(serviceKey, {
        key: serviceKey,
        title: meta.title,
        description: meta.description,
        planName: String(plan?.name || '未設定プラン'),
        planCode: String(plan?.code || ''),
        phase: String(contract?.phase || '未設定'),
        status: String(contract?.status || '未設定'),
      });
    }
  });

  return Array.from(byService.values());
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const loginId = String(body?.paletteId || '').trim().toUpperCase();
    const password = String(body?.password || '');

    const verifyResponse = await palDbPost('/api/chat-auth/verify', {
      loginId,
      password,
    });
    const verifyData = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok || verifyData?.success === false) {
      return NextResponse.json({ success: false, error: '顧客IDまたはパスワードが正しくありません。' }, { status: 401 });
    }

    const paletteId = String(verifyData?.paletteId || '').trim().toUpperCase();
    if (!paletteId) {
      return NextResponse.json({ success: false, error: '認証情報の取得に失敗しました。' }, { status: 500 });
    }

    const canUsePaletteAi = await hasPaletteAiService(paletteId);
    if (!canUsePaletteAi) {
      return NextResponse.json({ success: false, error: 'Palette Aiの契約がありません。担当にご連絡ください。' }, { status: 403 });
    }

    const params = new URLSearchParams();
    params.set('paletteId', paletteId);

    const response = await palDbGet(`/api/palette-summary?${params.toString()}`);
    const summary = await response.json().catch(() => ({}));

    if (!response.ok || summary?.success === false) {
      return NextResponse.json({
        success: true,
        paletteId,
        summaryText: `認証が完了しました。\n顧客ID ${paletteId} のサービス情報は取得できませんでした。\n続けて、要件を教えてください。`,
      });
    }

    return NextResponse.json({
      success: true,
      paletteId,
      accountName: summary?.account?.name || verifyData?.accountName || null,
      summaryText: buildServiceSummaryText(summary, paletteId),
      serviceCards: extractServiceCards(summary),
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
