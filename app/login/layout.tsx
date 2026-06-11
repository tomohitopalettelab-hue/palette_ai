import './login.css';

/**
 * /login 専用レイアウト
 * globals.css の body スタイル (中央 flex / overflow:hidden / 100vh 固定)
 * を login.css で上書きし、PC でも全幅で表示されるようにする
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
