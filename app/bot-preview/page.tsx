import Script from 'next/script';

export const dynamic = 'force-dynamic';

/**
 * Bot ウィジェット プレビュー用ページ（管理画面のiframeで表示）
 * ?id=A0010 のpaletteIdでwidget.jsを埋め込み、実際のチャットを試せる
 */
export default async function BotPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const paletteId = String(id || '').toUpperCase();

  if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#64748b',
      }}>
        <p>paletteId が不正です</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>
          これはあなたのサイトに設置されるチャットBotのプレビュー画面です
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
          右下のバブルをクリックするとチャットが開きます。<br />
          訪問者が実際にどう操作するかを、ここで試せます。
        </p>
        <div style={{
          marginTop: 32,
          padding: 20,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
            ダミーコンテンツ
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
            これはお客様のHP全体をイメージするためのダミー文章です。
            実際の設置では、お客様のHPの各ページに自動表示されます。
          </p>
        </div>
      </div>

      <Script src={`/widget.js?id=${paletteId}&t=${Date.now()}`} strategy="afterInteractive" />
    </div>
  );
}
