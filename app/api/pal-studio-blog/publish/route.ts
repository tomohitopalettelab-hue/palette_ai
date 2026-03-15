import { NextResponse } from 'next/server';

const PAL_STUDIO_ORIGIN = (process.env.PAL_STUDIO_ORIGIN || '').replace(/\/$/, '');
const PAL_STUDIO_ADMIN_API_KEY = process.env.PAL_STUDIO_ADMIN_API_KEY || '';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paletteId = String(body.paletteId || '').trim().toUpperCase();
    const post = body.post as Record<string, unknown>;

    if (!paletteId) {
      return NextResponse.json({ error: 'paletteId は必須です。' }, { status: 400 });
    }
    if (!post?.title) {
      return NextResponse.json({ error: 'post.title は必須です。' }, { status: 400 });
    }
    if (!PAL_STUDIO_ORIGIN) {
      return NextResponse.json({ error: 'PAL_STUDIO_ORIGIN が未設定です。管理者にお問い合わせください。' }, { status: 500 });
    }
    if (!PAL_STUDIO_ADMIN_API_KEY) {
      return NextResponse.json({ error: 'PAL_STUDIO_ADMIN_API_KEY が未設定です。管理者にお問い合わせください。' }, { status: 500 });
    }

    const res = await fetch(`${PAL_STUDIO_ORIGIN}/api/admin/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-studio-admin-key': PAL_STUDIO_ADMIN_API_KEY,
      },
      body: JSON.stringify({ paletteId, post }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;

    if (!res.ok || data.success === false) {
      const errMsg = typeof data.error === 'string' ? data.error : `pal_studio への投稿に失敗しました (${res.status})`;
      return NextResponse.json({ error: errMsg }, { status: res.status || 500 });
    }

    return NextResponse.json({ success: true, post: data.post });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
