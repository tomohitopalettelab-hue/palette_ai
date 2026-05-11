import './demo.css';

/**
 * /demo/[paletteId] 専用レイアウト
 * - globals.css の body スタイル (中央 flex / overflow:hidden / 100vh 固定)
 *   を上書きし、通常の縦スクロール・横幅100% のページとして表示する
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
