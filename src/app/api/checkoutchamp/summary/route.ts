import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const reportType = searchParams.get('reportType') || 'campaign';

  // Credentials from env
  const loginId = process.env.CHECKOUT_CHAMP_USERNAME;
  const password = process.env.CHECKOUT_CHAMP_PASSWORD;
  if (!loginId || !password) {
    console.error('❌ CheckoutChamp Summary: Missing credentials');
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  // Validate required params
  if (!startDate || !endDate) {
    console.error('❌ CheckoutChamp Summary: Missing startDate or endDate');
    return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 });
  }

  // Build the URL
  const url = `https://api.checkoutchamp.com/transactions/summary/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&reportType=${encodeURIComponent(reportType)}`;

  try {
    const response = await fetch(url, { 
      method: 'GET',
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ CheckoutChamp Summary API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: text
      });
      return NextResponse.json({ error: 'Failed to fetch summary', details: text }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ CheckoutChamp Summary API Exception:', error);
    return NextResponse.json({ error: 'Failed to fetch summary', details: error }, { status: 500 });
  }
} 