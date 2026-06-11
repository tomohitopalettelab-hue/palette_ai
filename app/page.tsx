import { redirect } from 'next/navigation';

// 旧 Palette AI チャットの撤去に伴い、ルートはログインへ。
// (admin / customer / agency はログイン後に各ダッシュボードへ遷移)
export default function RootPage() {
  redirect('/login');
}
