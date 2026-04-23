// 親 (main) layout は `fixed inset-0 overflow-hidden touch-none` で内部スクロールを
// 封じているので、bot-settings ではその中を縦スクロール可能にするラッパーを被せる
export default function BotSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain touch-pan-y">
      {children}
    </div>
  );
}
