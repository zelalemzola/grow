import { cookies } from 'next/headers';
import { fetchCheckoutChampOrders } from '@/lib/api';
import DashboardClient from '@/components/client/DashboardClient';

// Force dynamic rendering to prevent build-time static generation
export const dynamic = 'force-dynamic';

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

export default async function DashboardPage({ searchParams }: PageProps) {
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

    // ✅ Fetch CheckoutChamp products directly from API (no internal HTTP call)
    let productsData: any[] = [];
    try {
      const loginId = process.env.CHECKOUT_CHAMP_USERNAME;
      const password = process.env.CHECKOUT_CHAMP_PASSWORD;
      const apiUrl = `https://api.checkoutchamp.com/product/query/?loginId=${loginId}&password=${password}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000)
      });
      
      if (response.ok) {
        const data = await response.json();
        productsData = Object.values(data.message || {});
      }
    } catch (error) {
      console.error('Error fetching CheckoutChamp products:', error);
      productsData = [];
    }

    // Pass the data to the client component
    return <DashboardClient 
      initialOrders={orders} 
      initialProducts={productsData}
      initialDateRange={dateRange}
    />;
  } catch (error) {
    console.error('Error in DashboardPage:', error);
    // Return client component with empty data on error
    return <DashboardClient 
      initialOrders={[]} 
      initialProducts={[]}
      initialDateRange={getDefaultDateRange()}
    />;
  }
} 