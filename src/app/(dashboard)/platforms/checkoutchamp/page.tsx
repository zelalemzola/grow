import { cookies } from 'next/headers';
import { fetchCheckoutChampOrders } from '@/lib/api';
import CheckoutChampClient from '@/components/client/CheckoutChampClient';


interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Helper to get default date range (last 30 days)
function getDefaultDateRange() {
  const today = new Date();
  const from = new Date(today);
  from.setMonth(today.getMonth() - 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}

// Helper to get date range from URL params, cookies, or use default
async function getDateRange(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
  try {
    // First try URL params
    const params = await searchParams;
    const fromParam = params.from;
    const toParam = params.to;
    
    if (fromParam && toParam && typeof fromParam === 'string' && typeof toParam === 'string') {
      return { from: fromParam, to: toParam };
    }
    
    // Fallback to cookies
    try {
      const cookieStore = await cookies();
      const dateRangeCookie = cookieStore.get('global-date-range');
      if (dateRangeCookie) {
        const parsed = JSON.parse(dateRangeCookie.value);
        if (parsed.from && parsed.to) {
          return { from: parsed.from, to: parsed.to };
        }
      }
    } catch (error) {
      console.error('Error parsing date range cookie:', error);
    }
    
    return getDefaultDateRange();
  } catch (error) {
    console.error('Error getting date range:', error);
    return getDefaultDateRange();
  }
}

export default async function CheckoutChampPlatformPage({ searchParams }: PageProps) {
  try {
    // Get date range from URL params, cookies, or use default
    const dateRange = await getDateRange(searchParams);
    
    // ✅ Fetch CheckoutChamp orders server-side (static IP)
    const orders = await fetchCheckoutChampOrders({
      dateRange: {
        from: dateRange.from,
        to: dateRange.to,
      }
    });

    // ✅ Fetch CheckoutChamp products server-side (static IP)
    const productsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/checkoutchamp/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const productsData = productsRes.ok ? await productsRes.json() : [];

    // Pass the data to the client component
    return <CheckoutChampClient 
      initialOrders={orders} 
      initialProducts={productsData}
      initialDateRange={dateRange}
    />;
  } catch (error) {
    console.error('Error in CheckoutChampPlatformPage:', error);
    // Return client component with empty data on error
    return <CheckoutChampClient 
      initialOrders={[]} 
      initialProducts={[]}
      initialDateRange={getDefaultDateRange()}
    />;
  }
} 