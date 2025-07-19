import { NextRequest, NextResponse } from 'next/server';
import { fetchTaboolaData } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  if (!fromDate || !toDate) {
    return NextResponse.json({ error: 'Missing fromDate or toDate' }, { status: 400 });
  }

  try {
    const data = await fetchTaboolaData(fromDate, toDate);
    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Taboola data' }, { status: 500 });
  }
} 