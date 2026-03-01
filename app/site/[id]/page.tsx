import { sql } from '@vercel/postgres';
import { notFound } from 'next/navigation';

// このページは常に最新のDB情報を取得するように設定
export const revalidate = 0;

export default async function PublishedSite({ params }: { params: { id: string } }) {
  const { id } = params;

  try {
    // DBから特定のIDのデータを取得
    const { rows } = await sql`SELECT html_code, name FROM customers WHERE id = ${id} LIMIT 1`;
    
    if (rows.length === 0) {
      return notFound();
    }

    const html = rows[0].html_code;

    return (
      // 保存されたHTMLに、Tailwind CSSを適用して表示
      <div className="min-h-screen w-full">
        {/* headタグの代わりに、TailwindのCDNを読み込むスクリプトを注入（iframeを使わない直接表示用） */}
        <script src="https://cdn.tailwindcss.com"></script>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  } catch (error) {
    console.error("Public Page Error:", error);
    return <div>エラーが発生しました。</div>;
  }
}