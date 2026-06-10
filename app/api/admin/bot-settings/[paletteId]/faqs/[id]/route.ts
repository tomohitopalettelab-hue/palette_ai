import { NextResponse } from 'next/server';
import { deleteFaq, upsertFaq } from '../../../../../_lib/bot-store';
import { assertAccessAllowed } from '../../../../../_lib/agency-scope';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ paletteId: string; id: string }> },
) {
  try {
    const { paletteId: rawP, id } = await params;
    const paletteId = String(rawP || '').trim().toUpperCase();
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const body = await req.json();
    const faq = await upsertFaq({
      id,
      paletteId,
      question: String(body.question || ''),
      answer: String(body.answer || ''),
      category: body.category ?? '',
      priority: Number(body.priority ?? 3),
    });
    return NextResponse.json({ success: true, faq });
  } catch (error: any) {
    console.error('update faq error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string; id: string }> },
) {
  try {
    const { paletteId: rawP, id } = await params;
    const paletteId = String(rawP || '').trim().toUpperCase();
    const access = await assertAccessAllowed(paletteId);
    if (!access.allowed) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    await deleteFaq(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('delete faq error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
