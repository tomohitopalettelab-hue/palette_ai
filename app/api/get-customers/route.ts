import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // DBから全データを取得（更新日時が新しい順）
    const { rows } = await sql`SELECT * FROM customers ORDER BY updated_at DESC`;

    // 既存のJSONファイル形式（キャメルケース）に合わせてデータを変換して返す
    const customers = rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
      htmlCode: row.html_code, // DBのhtml_codeをフロントエンドのhtmlCodeにマッピング
      updatedAt: row.updated_at,
      description: row.description,
      isTemplate: row.is_template
    }));

    return NextResponse.json(customers);
  } catch (error: any) {
    console.error("取得エラー:", error);
    // 既存のエラーレスポンス形式を維持
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}