import { NextRequest, NextResponse } from 'next/server';
import { fetchCheckoutChampOrders } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  // You can add more filters as needed

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 });
  }

  try {
    const filters = {
      dateRange: { from: startDate, to: endDate }
      // Add other filters if needed
    };
    const data = await fetchCheckoutChampOrders(filters);
    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } });
  } catch (error: any) {
    // Forward the error message and set status 500
    return NextResponse.json({ error: error.message || 'Failed to fetch Checkout Champ data' }, { status: 500 });
  }
} 