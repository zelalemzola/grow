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

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(30000)
    });

    const text = await response.text();
    
    // Only log if there's an error (like IP whitelist issues)
    if (!response.ok) {
      console.error('❌ CheckoutChamp Test IP Error:', {
        status: response.status,
        statusText: response.statusText,
        error: text
      });
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        response: data,
        message: response.ok ? 'IP test successful' : 'Check server logs for IP whitelist information'
      });
    } catch (e) {
      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        response: text,
        message: response.ok ? 'IP test successful' : 'Check server logs for IP whitelist information'
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