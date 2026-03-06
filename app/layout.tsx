import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palette AI",
  description: "AI Chat Application",
  icons: {
    icon: "/favicon.png",
  },
};

// 修正ポイント：iOSの勝手なズームとスクロールを物理的に止める設定（Mainから移動）
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
      <body>{children}</body>
    </html>
  );
}
