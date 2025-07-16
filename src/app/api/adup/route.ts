import { NextRequest, NextResponse } from 'next/server';
import { fetchAdUpData } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  if (!fromDate || !toDate) {
    return NextResponse.json({ error: 'Missing fromDate or toDate' }, { status: 400 });
  }

  try {
    const data = await fetchAdUpData(fromDate, toDate);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch AdUp data' }, { status: 500 });
  }
} 