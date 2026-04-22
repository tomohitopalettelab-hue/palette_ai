import { NextResponse } from 'next/server';
import { listServices, upsertService } from '../../../../_lib/bot-store';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    const { paletteId: raw } = await params;
    const paletteId = String(raw || '').trim().toUpperCase();
    const services = await listServices(paletteId);
    return NextResponse.json({ success: true, services });
  } catch (error: any) {
    console.error('list services error:', error);
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
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    }
    const service = await upsertService({
      paletteId,
      name: String(body.name),
      price: body.price ?? '',
      duration: body.duration ?? '',
      description: body.description ?? '',
      targetTags: Array.isArray(body.targetTags) ? body.targetTags : [],
      problemTags: Array.isArray(body.problemTags) ? body.problemTags : [],
      features: body.features ?? '',
      testimonial: body.testimonial ?? '',
      sortOrder: Number(body.sortOrder ?? 0),
      active: body.active ?? true,
    });
    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    console.error('create service error:', error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
