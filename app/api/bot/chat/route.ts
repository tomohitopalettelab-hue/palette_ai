import { NextResponse } from 'next/server';
import { processBotTurn } from '../../_lib/bot-engine';
import { hasPaletteAixPlan } from '../../_lib/palette-aix-access';
import { checkDemoRateLimit, getClientIp } from '../../_lib/rate-limit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paletteId = String(body.paletteId || '').trim().toUpperCase();
    const message = String(body.message || '').trim();
    const sessionId = body.sessionId ? String(body.sessionId) : null;
    const visitorId = String(body.visitorId || `vis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    // デモモード: 契約不要の体験URL（/demo/[id]?demo=1）からの会話。
    // 契約チェックをスキップし、会話は is_demo フラグ付きで保存（管理画面・統計・通知から除外）。
    const isDemo = body.demo === true || body.demo === 1 || body.demo === '1';

    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400, headers: corsHeaders });
    }
    if (!message) {
      return NextResponse.json({ success: false, error: 'message is required' }, { status: 400, headers: corsHeaders });
    }

    // Palette AIX プラン契約チェック（デモモードはスキップ）
    if (!isDemo) {
      const hasPlan = await hasPaletteAixPlan(paletteId);
      if (!hasPlan) {
        return NextResponse.json(
          { success: false, error: 'Palette AIX プランが必要です', reason: 'plan_required' },
          { status: 403, headers: corsHeaders },
        );
      }
    } else {
      // デモモードは契約チェックを回避できるため、IP 単位で1時間あたりの通数を制限し
      // OpenAI の無制限消費（不正利用）を防ぐ。
      const ip = getClientIp(req);
      const rl = await checkDemoRateLimit('bot-chat', ip);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'デモのご利用が混み合っています。しばらく時間をおいてからお試しください。',
            reason: 'rate_limited',
          },
          { status: 429, headers: { ...corsHeaders, 'Retry-After': String(rl.retryAfterSec) } },
        );
      }
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const referrer = req.headers.get('referer') || undefined;

    const result = await processBotTurn({
      paletteId,
      sessionId,
      message,
      visitorId,
      userAgent,
      referrer,
      isDemo,
    });

    return NextResponse.json({ success: true, ...result }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('bot chat error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'internal error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
