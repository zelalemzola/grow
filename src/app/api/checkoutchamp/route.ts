import { NextRequest, NextResponse } from 'next/server';
import { fetchCheckoutChampOrders } from '@/lib/api';

// Helper to normalize date to MM/DD/YY
function toMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  // Pad month and day
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

// Extract filters from GET query params or POST JSON body
async function extractFilters(req: NextRequest) {
  if (req.method === 'POST') {
    const body = await req.json();
    const filters = body.filters || {};
    return filters;
  } else {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('startDate');
    const to = searchParams.get('endDate');
    const brand = searchParams.get('brand');
    const sku = searchParams.get('sku');
    const adPlatform = searchParams.get('adPlatform');
    const country = searchParams.get('country');
    const paymentMethod = searchParams.get('paymentMethod');
    return { dateRange: { from, to }, brand, sku, adPlatform, country, paymentMethod };
  }
}

async function handle(req: NextRequest) {
  try {
    const filters = await extractFilters(req);
    if (!filters.dateRange || !filters.dateRange.from || !filters.dateRange.to) {
      return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 });
    }
    // Normalize date format for CheckoutChamp API
    filters.dateRange = {
      from: toMMDDYY(filters.dateRange.from),
      to: toMMDDYY(filters.dateRange.to),
    };
    const data = await fetchCheckoutChampOrders(filters);
    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch Checkout Champ data' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
} 