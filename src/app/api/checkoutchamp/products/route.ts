import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const loginId = process.env.CHECKOUT_CHAMP_USERNAME;
  const password = process.env.CHECKOUT_CHAMP_PASSWORD;
  const apiUrl = `https://api.checkoutchamp.com/product/query/?loginId=${loginId}&password=${password}`;

  console.log('🔍 CheckoutChamp Products API Request:', {
    url: apiUrl.replace(/loginId=[^&]+&password=[^&]+/, 'loginId=***&password=***'),
    method: 'POST'
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    console.log('🔍 CheckoutChamp Products API Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ CheckoutChamp Products API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
        url: apiUrl.replace(/loginId=[^&]+&password=[^&]+/, 'loginId=***&password=***')
      });
      
      // Try to parse as JSON for more detailed error info
      try {
        const errorJson = JSON.parse(text);
        console.error('❌ CheckoutChamp Products API Error Details:', errorJson);
      } catch (e) {
        // If not JSON, log as text
        console.error('❌ CheckoutChamp Products API Error Text:', text);
      }
      
      return NextResponse.json({ error: `Upstream error: ${text}` }, { status: 502 });
    }
    
    const data = await response.json();
    console.log('✅ CheckoutChamp Products API Success:', {
      result: data.result,
      messageKeys: data.message ? Object.keys(data.message) : [],
      productCount: data.message ? Object.keys(data.message).length : 0
    });
    
    // Return the 'message' object as an array
    return NextResponse.json(Object.values(data.message || {}));
  } catch (err) {
    console.error('❌ CheckoutChamp Products API Exception:', err);
    return NextResponse.json({ error: err?.toString() }, { status: 500 });
  }
}

// Allow GET for browser testing by calling POST logic
export async function GET(req: NextRequest) {
  return POST(req);
} 