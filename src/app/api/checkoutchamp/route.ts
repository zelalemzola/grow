import { NextRequest, NextResponse } from 'next/server';
import { fetchCheckoutChampOrders } from '@/lib/api';

// Helper to normalize date to MM/DD/YYYY (matching fetchCheckoutChampOrders)
function toMMDDYYYY(dateStr: string) {
  const d = new Date(dateStr);
  // Pad month and day
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
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
    
    // console.log('🔍 Client API Request:', {
    //   originalFrom: filters.dateRange.from,
    //   originalTo: filters.dateRange.to
    // });
    
    // Normalize date format for CheckoutChamp API (matching server-side format)
    filters.dateRange = {
      from: toMMDDYYYY(filters.dateRange.from),
      to: toMMDDYYYY(filters.dateRange.to),
    };
    
    // console.log('🔍 Client API Normalized Dates:', {
    //   normalizedFrom: filters.dateRange.from,
    //   normalizedTo: filters.dateRange.to
    // });
    
    const data = await fetchCheckoutChampOrders(filters);
    
    // console.log('🔍 Client API Response:', {
    //   dataLength: Array.isArray(data) ? data.length : 0,
    //   dateRange: `${filters.dateRange.from} to ${filters.dateRange.to}`
    // });
    
    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } });
  } catch (error: any) {
    console.error('🔍 Client API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch Checkout Champ data' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
} 