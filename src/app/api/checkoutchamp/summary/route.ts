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

  console.log('🔍 CheckoutChamp Summary API Request:', {
    url: url.replace(/loginId=[^&]+&password=[^&]+/, 'loginId=***&password=***'),
    startDate,
    endDate,
    reportType
  });

  try {
    const response = await fetch(url, { 
      method: 'GET',
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    console.log('🔍 CheckoutChamp Summary API Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ CheckoutChamp Summary API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
        url: url.replace(/loginId=[^&]+&password=[^&]+/, 'loginId=***&password=***')
      });
      
      // Try to parse as JSON for more detailed error info
      try {
        const errorJson = JSON.parse(text);
        console.error('❌ CheckoutChamp Summary API Error Details:', errorJson);
      } catch (e) {
        // If not JSON, log as text
        console.error('❌ CheckoutChamp Summary API Error Text:', text);
      }
      
      return NextResponse.json({ error: 'Failed to fetch summary', details: text }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('✅ CheckoutChamp Summary API Success:', {
      result: data.result,
      dataKeys: data.message ? Object.keys(data.message) : [],
      dateRange: `${startDate} to ${endDate}`
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ CheckoutChamp Summary API Exception:', error);
    return NextResponse.json({ error: 'Failed to fetch summary', details: error }, { status: 500 });
  }
} 