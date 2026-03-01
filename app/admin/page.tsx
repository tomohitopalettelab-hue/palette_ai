import { sql } from '@vercel/postgres';
import { notFound } from 'next/navigation';

// ページのキャッシュと再検証の設定 (例: 1時間ごとに再検証)
export const revalidate = 3600;

type Props = {
  params: { id: string };
};

export default async function SitePage({ params }: Props) {
  const { id } = params;

  // データベースから公開済みの顧客データを取得
  const { rows } = await sql`
    SELECT html_code FROM customers WHERE id = ${id} AND status = 'completed';
  `;

  // データが見つからない、または公開済みでない場合は404ページを表示
  if (rows.length === 0) {
    notFound();
  }

  const customer = rows[0];
  const htmlContent = customer.html_code;

  // 取得したHTMLをそのままページとして表示
  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}

// ページのタイトルと説明をデータベースの情報から動的に生成
export async function generateMetadata({ params }: Props) {
    const { id } = params;
    const { rows } = await sql`SELECT name, description FROM customers WHERE id = ${id} AND status = 'completed'`;

    if (rows.length > 0) {
      const customer = rows[0];
      return { title: customer.name, description: customer.description || 'AIによって生成されたサイトです。' };
    }
    return { title: 'サイトが見つかりません', description: '指定されたURLのサイトは存在しないか、まだ公開されていません。' };
}