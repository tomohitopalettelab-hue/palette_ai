import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const parseCustomersJson = (raw: string) => {
  const normalized = raw.replace(/^\uFEFF/, '').trim();
  if (!normalized) return [];
  const parsed = JSON.parse(normalized);
  return Array.isArray(parsed) ? parsed : [];
};

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'customers.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const customers = parseCustomersJson(fileContent);
    return NextResponse.json(customers);
  } catch (error: any) {
    console.error("取得エラー:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}