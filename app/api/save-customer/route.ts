import { NextResponse } from 'next/server';
import { upsertCustomer } from '../_lib/customer-store';

const PALETTE_ID_PATTERN = /^[A-Z][0-9]{4}$/;

const getPalStudioBaseUrl = (): string => {
  const configured = process.env.PAL_STUDIO_BASE_URL?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production'
    ? 'https://studio.palette-lab.com'
    : 'http://localhost:3002';
};

const buildPalStudioUrl = (path: string): string => {
  const base = getPalStudioBaseUrl().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("=== /api/save-customer received ===", JSON.stringify(body, null, 2));
    const newCustomer = {
      ...body,
      id: body.id || `cust-${Date.now()}`,
      customer_id: body.customer_id || `custsrv-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      status: body.status || 'hearing',
    };

    const saved = await upsertCustomer(newCustomer);

    const normalizedCustomerId = String(saved?.customer_id || '').trim().toUpperCase();
    const shouldSyncToStudio =
      PALETTE_ID_PATTERN.test(normalizedCustomerId)
      && ['hearing', 'reviewing', 'completed'].includes(String(saved?.status || '').toLowerCase());

    if (shouldSyncToStudio) {
      const syncRes = await fetch(buildPalStudioUrl('/api/save-customer'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...saved,
          customer_id: normalizedCustomerId,
          id: normalizedCustomerId,
          status: String(saved?.status || 'reviewing'),
        }),
      });

      if (!syncRes.ok) {
        const syncBody = await syncRes.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: syncBody?.error || 'pal_studio同期に失敗しました。' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, customer: saved });
  } catch (error) {
    console.error('Save API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}