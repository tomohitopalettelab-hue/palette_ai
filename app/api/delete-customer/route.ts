import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'customers.json');

    if (!fs.existsSync(filePath)) {
      // nothing to delete
      return NextResponse.json({ success: true });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let customers: any[] = [];
    try {
      customers = JSON.parse(fileContent);
    } catch (e) {
      console.error('JSON parse error in delete API', e);
      customers = [];
    }

    const filtered = customers.filter(c => c.id !== id);
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
