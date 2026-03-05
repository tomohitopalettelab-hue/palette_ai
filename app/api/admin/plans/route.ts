import { NextRequest, NextResponse } from 'next/server';
import { palDbGet, palDbPost } from '../../_lib/pal-db-client';

export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === '1';
    const response = await palDbGet(`/api/plans?includeInactive=${includeInactive ? '1' : '0'}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('GET /api/admin/plans Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await palDbPost('/api/plans', body || {});
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('POST /api/admin/plans Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
