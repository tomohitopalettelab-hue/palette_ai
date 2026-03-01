import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Saving body:", body); // サーバーのログで中身を確認できるようにする

    // 1. IDの特定（数値・文字列どちらでも対応できるようにString化）
    const id = body.id ? String(body.id) : `cust-${Date.now()}`;
    const updatedAt = new Date().toISOString();
    const status = body.status || 'hearing';

    // 2. フロントエンドとバックエンドの変数名のズレを吸収
    // htmlCode でも html_code でも受け取れるようにする
    const name = body.name || null;
    const answers = JSON.stringify(body.answers || []);
    const html_code = body.htmlCode || body.html_code || '';
    const description = body.description || '';
    const is_template = body.isTemplate === true || body.is_template === true;

    // 3. Vercel Postgresへの保存
    await sql`
      INSERT INTO customers (id, name, status, answers, html_code, description, is_template, updated_at)
      VALUES (
        ${id}, 
        ${name}, 
        ${status}, 
        ${answers}, 
        ${html_code}, 
        ${description}, 
        ${is_template}, 
        ${updatedAt}
      )
      ON CONFLICT (id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        answers = EXCLUDED.answers,
        html_code = EXCLUDED.html_code,
        description = EXCLUDED.description,
        is_template = EXCLUDED.is_template,
        updated_at = EXCLUDED.updated_at;
    `;

    return NextResponse.json({ 
      success: true, 
      customer: { ...body, id, updatedAt, status } 
    });

  } catch (error: any) {
    console.error('Save API Error Details:', error);
    // 詳細なエラーをフロントに返す（デバッグ用）
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.detail || '' 
    }, { status: 500 });
  }
}