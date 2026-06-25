import { NextResponse } from 'next/server';
import { getReceptionContextByDid } from '../../_lib/bot-store';

/**
 * GET /api/voice/reception-config?to=<DID>
 * Pipecat（AI電話受付）が着信DIDから応対に必要な文脈を取得する。
 * サーバー間呼び出し。x-voice-service-key で認証。
 */

const authed = (req: Request): boolean => {
  const key = process.env.VOICE_SERVICE_KEY?.trim();
  if (!key) return false; // 未設定時は default-deny
  return req.headers.get('x-voice-service-key') === key;
};

export async function GET(req: Request) {
  try {
    if (!authed(req)) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const to = (searchParams.get('to') || searchParams.get('did') || '').trim();
    if (!to) {
      return NextResponse.json({ success: false, error: 'to (DID) is required' }, { status: 400 });
    }

    const ctx = await getReceptionContextByDid(to);
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'no reception configured for this number', reason: 'not_found' }, { status: 404 });
    }
    if (!ctx.reception.enabled) {
      return NextResponse.json({ success: false, error: 'reception disabled', reason: 'disabled' }, { status: 403 });
    }

    const b = ctx.basic || {};
    return NextResponse.json({
      success: true,
      paletteId: ctx.paletteId,
      reception: ctx.reception,
      shop: {
        name: b.shopName || '',
        industry: b.industry || '',
        area: b.area || '',
        businessHours: b.businessHours || '',
        closedDays: b.closedDays || '',
        catchphrase: b.catchphrase || '',
        intro: b.intro || '',
      },
      services: ctx.services.map((s) => ({
        name: s.name,
        price: s.price || '',
        duration: s.duration || '',
        description: s.description || '',
      })),
      faqs: ctx.faqs.map((f) => ({ question: f.question, answer: f.answer })),
    });
  } catch (error: any) {
    console.error('reception-config error:', error?.message || error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
