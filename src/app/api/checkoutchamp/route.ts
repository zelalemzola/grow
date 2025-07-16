import { NextRequest, NextResponse } from 'next/server';
import { fetchCheckoutChampOrders } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  // You can add more filters as needed

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from or to date' }, { status: 400 });
  }

  try {
    const filters = {
      dateRange: { from, to }
      // Add other filters if needed
    };
    const data = await fetchCheckoutChampOrders(filters);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Checkout Champ data' }, { status: 500 });
  }
} 