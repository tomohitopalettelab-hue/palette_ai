import { redirect } from 'next/navigation';

// 旧 Palette AI (ヒアリングチャット) の契約顧客一覧は廃止。
// 管理トップは営業Bot設定 (Palette AIX) へ。
export default function AdminPage() {
  redirect('/admin/bot-settings');
}
