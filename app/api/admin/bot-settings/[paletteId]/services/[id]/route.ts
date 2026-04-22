import { NextResponse } from 'next/server';
import { deleteService, getService, upsertService } from '../../../../../_lib/bot-store';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ paletteId: string; id: string }> },
) {
  try {
    const { paletteId: rawP, id } = await params;
    const paletteId = String(rawP || '').trim().toUpperCase();
    const body = await req.json();

    const current = await getService(id);
    if (!current || current.paletteId !== paletteId) {
      return NextResponse.json({ success: false, error: 'service not found' }, { status: 404 });
    }

    const service = await upsertService({
      id,
      paletteId,
      name: body.name ?? current.name,
      price: body.price ?? current.price,
      duration: body.duration ?? current.duration,
      description: body.description ?? current.description,
      targetTags: Array.isArray(body.targetTags) ? body.targetTags : current.targetTags,
      problemTags: Array.isArray(body.problemTags) ? body.problemTags : current.problemTags,
      features: body.features ?? current.features,
      testimonial: body.testimonial ?? current.testimonial,
      sortOrder: body.sortOrder ?? current.sortOrder,
      active: body.active ?? current.active,
    });
    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    console.error('update service error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string; id: string }> },
) {
  try {
    const { id } = await params;
    await deleteService(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('delete service error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
