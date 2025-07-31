import { NextResponse } from 'next/server';

export async function GET() {
  const loginId = process.env.CHECKOUT_CHAMP_USERNAME;
  const password = process.env.CHECKOUT_CHAMP_PASSWORD;
  
  if (!loginId || !password) {
    console.error('❌ CheckoutChamp Test IP: Missing credentials');
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  // Test URL that will trigger an error but show us the IP
  const testUrl = `https://api.checkoutchamp.com/order/query/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}&startDate=01/01/2024&endDate=01/01/2024&page=1&resultsPerPage=1`;

  console.log('🔍 CheckoutChamp Test IP Request:', {
    url: testUrl.replace(/loginId=[^&]+&password=[^&]+/, 'loginId=***&password=***'),
    purpose: 'Testing IP whitelist requirements'
  });

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(30000)
    });

    console.log('🔍 CheckoutChamp Test IP Response Status:', response.status, response.statusText);
    console.log('🔍 CheckoutChamp Test IP Response Headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    
    console.log('🔍 CheckoutChamp Test IP Response Body:', text);

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      console.log('🔍 CheckoutChamp Test IP Response JSON:', data);
      
      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        response: data,
        message: 'Check server logs for detailed IP information'
      });
    } catch (e) {
      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        response: text,
        message: 'Check server logs for detailed IP information'
      });
    }

  } catch (error) {
    console.error('❌ CheckoutChamp Test IP Exception:', error);
    return NextResponse.json({ 
      error: 'Failed to test IP',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 