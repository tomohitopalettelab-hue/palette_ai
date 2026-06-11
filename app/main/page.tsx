import { redirect } from 'next/navigation';

// 旧 Palette AI チャット (ヒアリング) は廃止。
// 顧客ログイン後のランディングは Bot 設定へ。
export default function MainPage() {
  redirect('/main/bot-settings');
}
