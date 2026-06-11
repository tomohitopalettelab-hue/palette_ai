import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Palette AIX",
  description: "AI チャットボット管理",
};

// 旧 (main) チャットレイアウトから移植。
// 子ページ (bot-settings / reports) は fixed 親の中を
// 自前の absolute ラッパーでスクロールさせる構造のため、この形を維持する。
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: '#F0F2F5' }} className="fixed inset-0 overflow-hidden touch-none">
      {children}
    </div>
  );
}
