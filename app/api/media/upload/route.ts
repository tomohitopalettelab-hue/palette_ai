import { NextResponse } from 'next/server';
import { buildPalDbUrl } from '../../_lib/pal-db-client';

const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12MB
const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];

const isFileLike = (value: unknown): value is File => {
  return Boolean(value && typeof (value as File).arrayBuffer === 'function');
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const paletteId = String(formData.get('paletteId') || '').trim().toUpperCase();
    const file = formData.get('file');

    if (!paletteId) {
      return NextResponse.json({ success: false, error: 'paletteId is required' }, { status: 400 });
    }
    if (!isFileLike(file)) {
      return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 });
    }

    // Server-side validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `ファイルサイズが上限（12MB）を超えています。（${(file.size / 1024 / 1024).toFixed(1)}MB）` },
        { status: 400 },
      );
    }

    const mime = file.type || '';
    if (!ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
      return NextResponse.json(
        { success: false, error: `対応していないファイル形式です（${mime || '不明'}）。画像または動画をアップロードしてください。` },
        { status: 400 },
      );
    }

    const forward = new FormData();
    forward.set('paletteId', paletteId);
    forward.set('file', file, file.name || 'upload');

    const response = await fetch(buildPalDbUrl('/api/media/upload'), {
      method: 'POST',
      body: forward,
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
