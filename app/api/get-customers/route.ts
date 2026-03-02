import { NextResponse } from 'next/server';
import { readCustomers } from '../_lib/customer-store';

export async function GET() {
  try {
    const customers = readCustomers();
    return NextResponse.json(customers);
  } catch (error: any) {
    console.error("取得エラー:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}