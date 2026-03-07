import { NextResponse } from 'next/server';
import { buildPalDbUrl } from '../../_lib/pal-db-client';

export async function DELETE(_req: Request, context: { params: { id?: string } }) {
  try {
    const id = String(context.params?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const response = await fetch(buildPalDbUrl(`/api/media/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
