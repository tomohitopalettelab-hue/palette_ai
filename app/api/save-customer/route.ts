import { NextResponse } from 'next/server';
import { readCustomers, saveCustomers } from '../_lib/customer-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("=== /api/save-customer received ===", JSON.stringify(body, null, 2));
    let customers = readCustomers();

    // 新規データか更新か
    // IDがない場合は新規作成とみなす

    // `customer_id` は外部の "customers サーバー" が発行する識別子として
    // body から渡される想定。なければ内部生成しておく。
    const newCustomer = {
      ...body,
      id: body.id || `cust-${Date.now()}`,
      customer_id: body.customer_id || `custsrv-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      status: body.status || 'hearing',
    };

    // IDで検索して更新、なければ追加
    const existingIndex = customers.findIndex((c: any) => c.id === newCustomer.id);
    if (existingIndex >= 0) {
      customers[existingIndex] = { ...customers[existingIndex], ...newCustomer };
    } else {
      // 新しいものを先頭に
      customers.unshift(newCustomer);
    }

    // 保存
    saveCustomers(customers);

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (error) {
    console.error('Save API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}