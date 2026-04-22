import { NextResponse } from 'next/server';
import { listFaqs, upsertFaq } from '../../../../_lib/bot-store';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    const faqs = await listFaqs(paletteId);
    return NextResponse.json({ success: true, faqs });
  } catch (error: any) {
    console.error('list faqs error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    const body = await req.json();
    if (!body.question || !body.answer) {
      return NextResponse.json({ success: false, error: 'question and answer are required' }, { status: 400 });
    }
    const faq = await upsertFaq({
      paletteId,
      question: String(body.question),
      answer: String(body.answer),
      category: body.category ?? '',
      priority: Number(body.priority ?? 3),
    });
    return NextResponse.json({ success: true, faq });
  } catch (error: any) {
    console.error('create faq error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
