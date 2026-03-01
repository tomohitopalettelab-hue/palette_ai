import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ ID: string }> }
) {
  const params = await props.params;
  const { ID: id } = params; // rename to keep existing logic

  try {
    // dataディレクトリのcustomers.jsonを参照するように修正
    const filePath = path.join(process.cwd(), 'data', 'customers.json');
    
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Data source not found', { status: 404 });
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');
    const customers = JSON.parse(fileContents);
    
    // 顧客データは内部ID（cust-...）または外部発行ID（customer_id / custsrv-...）の
    // どちらかでアクセスされる可能性がある。
    const customer = customers.find((c: any) => c.id === id || c.customer_id === id);

    if (!customer || !customer.htmlCode) {
      return new NextResponse('Page not found', { status: 404 });
    }

    let html = String(customer.htmlCode);

    // 出力するHTMLに <html> タグが含まれていない場合、自前でラップする。
    // 同時に charset と Tailwind CDN を挿入し、文字化けとスタイル未適用を防止する。
    if (!/<html[\s>]/i.test(html)) {
      html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8" />` +
             `<script src="https://cdn.tailwindcss.com"></script></head><body>${html}</body></html>`;
    } else {
      // charset が指定されていない場合は挿入
      if (!/<meta[^>]+charset=/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1><meta charset="utf-8" />`);
      }
      // Tailwind CDN が含まれていなければ追加
      if (!/cdn\.tailwindcss\.com/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1><script src="https://cdn.tailwindcss.com"></script>`);
      }
    }

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
