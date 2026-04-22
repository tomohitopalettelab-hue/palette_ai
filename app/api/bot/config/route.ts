import { NextResponse } from 'next/server';
import { getBotConfigOrDefault, listServices, listFaqs } from '../../_lib/bot-store';

// CORS: widget.jsから任意のオリジンで呼ばれる
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paletteId = (searchParams.get('paletteId') || searchParams.get('id') || '').trim().toUpperCase();

    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'invalid paletteId' }, { status: 400, headers: corsHeaders });
    }

    const [config, services, faqs] = await Promise.all([
      getBotConfigOrDefault(paletteId),
      listServices(paletteId, true),
      listFaqs(paletteId),
    ]);

    // widget向けにはサービス全データ、FAQ、公開可能な設定のみ返す
    return NextResponse.json({
      success: true,
      config: {
        paletteId,
        basic: config.basic,
        tone: config.tone,
        conversation: {
          welcomeMessage: config.conversation.welcomeMessage,
          cardCount: config.conversation.cardCount,
          cardShow: config.conversation.cardShow,
          leadFields: config.conversation.leadFields,
        },
        goals: config.goals,
        nurture: config.nurture,
        appearance: config.appearance,
      },
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
        description: s.description,
        features: s.features,
        testimonial: s.testimonial,
      })),
      faqs: faqs.map((f) => ({ question: f.question, answer: f.answer, category: f.category })),
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('bot config error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500, headers: corsHeaders });
  }
}
