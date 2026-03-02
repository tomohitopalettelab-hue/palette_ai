import { NextResponse } from 'next/server';
import { readCustomers, saveCustomers } from '../_lib/customer-store';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    const customers = readCustomers();

    const filtered = customers.filter(c => c.id !== id);
    saveCustomers(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
