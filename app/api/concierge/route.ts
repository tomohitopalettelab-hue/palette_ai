import { NextResponse } from 'next/server';
import { palDbGet } from '../_lib/pal-db-client';
import { SERVICE_URLS } from '../_lib/service-ports';
import { getOpenAI, CHAT_MODEL } from '../_lib/openai-client';

type ConciergeAction = {
  priority: 'high' | 'medium' | 'low';
  service: string;
  title: string;
  description: string;
};

type ProgressCard = {
  service: string;
  label: string;
  status: string;
  health: string;
  detail: string;
  lastActivity: string;
};

const SERVICE_LABELS: Record<string, string> = {
  pal_studio: 'ホームページ制作',
  pal_video: '動画制作',
  pal_trust: '口コミ・レビュー管理',
  pal_opt: 'SNS・コンテンツ運用',
  pal_base: 'マーケティング素材',
  pal_ad: '広告運用',
};

const buildProgressCards = (
  kpiResults: Array<{ service: string; data: any }>,
): ProgressCard[] => {
  return kpiResults.map(({ service, data }) => {
    const kpi = data?.kpi || {};
    const health = String(data?.health || 'green');
    const lastActivity = String(data?.lastActivity || '');
    const label = SERVICE_LABELS[service] || service;

    let status = '稼働中';
    let detail = '';

    if (service === 'pal_studio') {
      status = kpi.siteStatus || '未作成';
      const parts: string[] = [];
      if (kpi.blogPosts) parts.push(`ブログ${kpi.blogPosts}件`);
      if (kpi.newsPosts) parts.push(`ニュース${kpi.newsPosts}件`);
      if (kpi.totalPages) parts.push(`${kpi.totalPages}ページ`);
      detail = parts.join(' / ') || 'データなし';
    } else if (service === 'pal_video') {
      const total = Number(kpi.totalVideos || 0);
      const completed = Number(kpi.completed || 0);
      const rendering = Number(kpi.rendering || 0);
      if (total === 0) { status = '未制作'; }
      else if (rendering > 0) { status = '制作中'; }
      else { status = `${completed}本完了`; }
      detail = total > 0
        ? `全${total}本 / 完了${completed} / 制作中${rendering}`
        : 'まだ動画がありません';
    } else if (service === 'pal_trust') {
      const total = Number(kpi.totalResponses || 0);
      const avg = Number(kpi.avgScore || 0);
      status = total > 0 ? `レビュー${total}件` : 'レビューなし';
      detail = avg > 0 ? `平均評価 ${avg.toFixed(1)}点` : 'データなし';
    } else if (service === 'pal_opt') {
      const total = Number(kpi.totalPosts || 0);
      const published = Number(kpi.published || 0);
      const draft = Number(kpi.draft || 0);
      status = total > 0 ? `${published}件投稿済` : '未投稿';
      const parts: string[] = [];
      if (draft) parts.push(`下書き${draft}件`);
      if (kpi.instagramPosts) parts.push(`Instagram${kpi.instagramPosts}件`);
      if (kpi.blogPostsOpt) parts.push(`ブログ${kpi.blogPostsOpt}件`);
      detail = parts.join(' / ') || (total > 0 ? `全${total}件` : 'データなし');
    } else if (service === 'pal_base') {
      status = kpi.status || 'active';
      const items: string[] = [];
      if (kpi.bannerCreated && kpi.bannerCreated !== '-') items.push('バナー作成済');
      if (kpi.couponGenerated && kpi.couponGenerated !== '-') items.push('クーポン作成済');
      detail = items.length ? items.join(' / ') : '素材未作成';
    }

    if (lastActivity) {
      const d = new Date(lastActivity);
      if (!isNaN(d.getTime())) {
        const formatted = d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
        detail = detail ? `最終更新: ${formatted} / ${detail}` : `最終更新: ${formatted}`;
      }
    }

    return { service, label, status, health, detail, lastActivity };
  });
};

/** Normalise plan codes like "pal_studio_standard" → "pal_studio" */
const planCodeToServiceKey = (code: string): string | null => {
  const c = String(code || '').toLowerCase();
  if (c.startsWith('pal_studio')) return 'pal_studio';
  if (c.startsWith('pal_video')) return 'pal_video';
  if (c.startsWith('pal_trust')) return 'pal_trust';
  if (c.startsWith('pal_opt')) return 'pal_opt';
  if (c.startsWith('pal_base')) return 'pal_base';
  if (c.startsWith('pal_ad')) return 'pal_ad';
  if (c.startsWith('palette_ai')) return 'palette_ai';
  return null;
};

const fetchKpi = async (
  serviceKey: string,
  paletteId: string,
): Promise<{ service: string; data: any } | null> => {
  const baseUrl = SERVICE_URLS[serviceKey];
  if (!baseUrl) return null;

  try {
    const res = await fetch(
      `${baseUrl}/api/kpi?cid=${encodeURIComponent(paletteId)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data ? { service: serviceKey, data } : null;
  } catch {
    return null;
  }
};

const buildAiPrompt = (
  customerName: string,
  kpiResults: Array<{ service: string; data: any }>,
): string => {
  const kpiSummary = kpiResults
    .map((r) => `【${r.service}】\n${JSON.stringify(r.data, null, 2)}`)
    .join('\n\n');

  return `あなたはPalette Labのサービスコンシェルジュです。
顧客「${customerName}」の現在のサービス利用状況を分析し、改善アクションを提案してください。

## KPIデータ
${kpiSummary}

## 判定ルール
- pal_trust: 未返信レビューあり or 平均評価3.0未満 → high / 3.5未満 → medium
- pal_opt: 14日以上投稿なし → high / 7日以上 → medium
- pal_studio: 30日以上サイト更新なし → high / 14日以上 → medium
- pal_base: バナー・クーポン未作成 → medium
- pal_video: 動画未制作 → medium
- healthが"red" → high, "yellow" → medium

## 出力形式（JSON）
{
  "summary": "全体的な状況を1〜2文で",
  "actions": [
    {
      "priority": "high" | "medium" | "low",
      "service": "サービスキー",
      "title": "短いタイトル（20文字以内）",
      "description": "具体的なアクション説明（50文字以内）"
    }
  ]
}

- actionsは最大6件、priority順（high→medium→low）で返す
- データが取れなかったサービスは無視
- 全て日本語で出力
- JSONのみ出力（前後に余計な文字を入れない）`;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paletteId = String(body?.paletteId || '').trim().toUpperCase();

    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json(
        { success: false, error: 'paletteId is required' },
        { status: 400 },
      );
    }

    // 1. Get subscribed services from pal-db
    const summaryRes = await palDbGet(
      `/api/palette-summary?paletteId=${encodeURIComponent(paletteId)}`,
    );
    const summaryData = await summaryRes.json().catch(() => ({}));
    const customerName =
      summaryData?.account?.name || summaryData?.accounts?.[0]?.name || 'お客様';

    const contracts: any[] = Array.isArray(summaryData?.contracts)
      ? summaryData.contracts
      : [];
    const plans: any[] = Array.isArray(summaryData?.plans)
      ? summaryData.plans
      : [];
    const planMap = new Map(plans.map((p: any) => [String(p.id), p]));

    // Extract unique service keys from active contracts
    const serviceKeys = new Set<string>();
    for (const contract of contracts) {
      const plan = planMap.get(String(contract.planId));
      const code = plan?.code || '';
      const key = planCodeToServiceKey(code);
      if (key && key !== 'palette_ai') {
        serviceKeys.add(key);
      }
    }

    if (serviceKeys.size === 0) {
      return NextResponse.json({
        success: true,
        summary: '現在ご契約中のサービスが見つかりませんでした。',
        actions: [],
        progress: [],
        kpis: {},
      });
    }

    // 2. Fetch KPIs in parallel
    const kpiPromises = Array.from(serviceKeys).map((key) =>
      fetchKpi(key, paletteId),
    );
    const kpiResults = (await Promise.all(kpiPromises)).filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

    if (kpiResults.length === 0) {
      return NextResponse.json({
        success: true,
        summary:
          '各サービスのステータス情報を取得できませんでした。サービスが起動していない可能性があります。',
        actions: [],
        progress: [],
        kpis: {},
      });
    }

    // Build progress cards (rule-based, no AI needed)
    const progress = buildProgressCards(kpiResults);

    // 3. Generate AI recommendations
    const prompt = buildAiPrompt(customerName, kpiResults);

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
      });

      const rawText = String(completion.choices?.[0]?.message?.content || '').trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({
          success: true,
          summary: rawText.slice(0, 200),
          actions: [],
          progress,
          kpis: Object.fromEntries(kpiResults.map((r) => [r.service, r.data])),
        });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const actions: ConciergeAction[] = Array.isArray(parsed.actions)
        ? parsed.actions.slice(0, 6)
        : [];

      return NextResponse.json({
        success: true,
        summary: String(parsed.summary || ''),
        actions,
        progress,
        kpis: Object.fromEntries(kpiResults.map((r) => [r.service, r.data])),
      });
    } catch (aiError: any) {
      console.warn('concierge AI failed:', aiError?.message);
      return NextResponse.json({
        success: true,
        summary: 'AI分析に失敗しました。KPIデータを確認してください。',
        actions: [],
        progress,
        kpis: Object.fromEntries(kpiResults.map((r) => [r.service, r.data])),
      });
    }
  } catch (error: any) {
    console.error('concierge error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'コンシェルジュ分析中にエラーが発生しました。',
      },
      { status: 500 },
    );
  }
}
