import Script from 'next/script';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBotConfig } from '../../api/_lib/bot-store';
import { hasPaletteAixPlan } from '../../api/_lib/palette-aix-access';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ paletteId: string }>;
}): Promise<Metadata> {
  const { paletteId: raw } = await params;
  const paletteId = String(raw || '').toUpperCase();
  if (!/^[A-Z][0-9]{4}$/.test(paletteId)) return { title: 'AIアシスタント' };
  const config = await getBotConfig(paletteId);
  const shopName = config?.basic?.shopName || 'AIアシスタント';
  const title = `${shopName} – AI チャットアシスタント`;
  const description = config?.basic?.catchphrase
    || config?.basic?.intro?.slice(0, 120)
    || 'AI チャットアシスタントを試してみてください。';
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

/**
 * 公開デモページ
 * /demo/A0010 のように顧客が自社の見込み客に共有できる、
 * チャット Bot を体験できるブランド化された公開ページ。
 *
 * - middleware の保護対象外（誰でもアクセス可能）
 * - shopName/intro/catchphrase 等を BotConfig から取得して表示
 * - widget.js を埋め込み、右下のバブルから AI チャットを起動
 */
export default async function PublicDemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ paletteId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { paletteId: raw } = await params;
  const paletteId = String(raw || '').toUpperCase();
  const sp = await searchParams;
  // デモモード: ?demo=1 で契約・停止状態に関わらず Bot を体験できる（会話ログは保存されない）
  const isDemo = sp?.demo === '1';

  if (!/^[A-Z][0-9]{4}$/.test(paletteId)) notFound();

  const config = await getBotConfig(paletteId);
  if (!config) notFound();

  const hasPlan = await hasPaletteAixPlan(paletteId);
  // デモモードでは契約がなくても Bot を起動する
  const widgetEnabled = hasPlan || isDemo;

  const b = config.basic || {};
  const a = config.appearance || {};
  const shopName = b.shopName || 'AIアシスタント';
  const catchphrase = b.catchphrase || '';
  const intro = b.intro || '';
  const industry = b.industry || '';
  const area = b.area || '';
  const businessHours = b.businessHours || '';
  const closedDays = b.closedDays || '';

  const primary = a.primaryColor || '#6366f1';
  const gradientTo = a.gradientTo || primary;
  const useGradient = a.gradient !== false;
  const headerBg = useGradient
    ? `linear-gradient(135deg, ${primary} 0%, ${gradientTo} 100%)`
    : primary;

  const infoRows: { label: string; value: string }[] = [];
  if (industry) infoRows.push({ label: '業種', value: industry });
  if (area) infoRows.push({ label: '対応エリア', value: area });
  if (businessHours) infoRows.push({ label: '営業時間', value: businessHours });
  if (closedDays) infoRows.push({ label: '定休日', value: closedDays });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: '#1e293b',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          background: headerBg,
          padding: '64px 24px 80px',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.2)',
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 16,
            backdropFilter: 'blur(8px)',
          }}
        >
          ✨ AI チャットアシスタント・デモ
        </div>
        {isDemo && (
          <div
            style={{
              display: 'block',
              margin: '0 auto 12px',
              maxWidth: 'fit-content',
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.25)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            🎬 DEMO MODE（会話ログは保存されません）
          </div>
        )}
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          {shopName}
        </h1>
        {catchphrase && (
          <p style={{ fontSize: 14, opacity: 0.9, margin: 0, lineHeight: 1.6 }}>
            {catchphrase}
          </p>
        )}
      </div>

      {/* メイン */}
      <div style={{ maxWidth: 720, margin: '-40px auto 0', padding: '0 20px 80px', position: 'relative', zIndex: 2 }}>
        {/* ガイドカード */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: headerBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              💬
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                右下のチャットから話しかけてください
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                AI があなたのご質問・ご相談にお応えします
              </div>
            </div>
          </div>
          {intro && (
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.8, margin: '16px 0 0', whiteSpace: 'pre-wrap' }}>
              {intro}
            </p>
          )}
        </div>

        {/* 店舗情報 */}
        {infoRows.length > 0 && (
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 24,
              marginTop: 16,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 12, letterSpacing: '0.05em' }}>
              店舗情報
            </div>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px 16px', fontSize: 13 }}>
              {infoRows.map((row) => (
                <div key={row.label} style={{ display: 'contents' }}>
                  <dt style={{ color: '#64748b', fontWeight: 700 }}>{row.label}</dt>
                  <dd style={{ color: '#1e293b', margin: 0 }}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* 契約状況メッセージ */}
        {!hasPlan && !isDemo && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: 12,
              fontSize: 12,
              color: '#92400e',
            }}
          >
            ⚠️ このBotは現在公開停止中です。プラン契約をご確認ください。
          </div>
        )}

        {/* デモモード注記 */}
        {isDemo && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 12,
              fontSize: 12,
              color: '#1e40af',
            }}
          >
            🎬 これはデモ（体験）モードです。契約状況に関わらず Bot をお試しいただけます。この会話は保存されず、管理画面のログや通知には反映されません。
          </div>
        )}
      </div>

      {/* フッター */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '24px 16px 48px',
          fontSize: 11,
          color: '#94a3b8',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/palette-aix-mark-x.svg"
          alt=""
          width={20}
          height={20}
          style={{ borderRadius: 5, display: 'block' }}
        />
        <span>
          Powered by <span style={{ fontWeight: 700, color: '#475569' }}>Palette AIX</span>
        </span>
      </div>

      {widgetEnabled && (
        <Script src={`/widget.js?id=${paletteId}${isDemo ? '&demo=1' : ''}&t=${Date.now()}`} strategy="afterInteractive" />
      )}
    </div>
  );
}
