import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Palette AI",
  description: "Next Generation UI",
};

// 修正ポイント：iOSの勝手なズームとスクロールを物理的に止める設定
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      {/* touch-none を body にも入れることで、ブラウザ全体のバウンス（揺れ）を抑制します */}
      <body style={{ backgroundColor: '#F0F2F5', margin: 0 }} className="fixed inset-0 overflow-hidden touch-none">
        {children}
      </body>
    </html>
  );
}