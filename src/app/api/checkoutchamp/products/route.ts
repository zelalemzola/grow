import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const loginId = process.env.CHECKOUT_CHAMP_USERNAME;
  const password = process.env.CHECKOUT_CHAMP_PASSWORD;
  const apiUrl = `https://api.checkoutchamp.com/product/query/?loginId=${loginId}&password=${password}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ CheckoutChamp Products API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: text
      });
      return NextResponse.json({ error: `Upstream error: ${text}` }, { status: 502 });
    }
    
    const data = await response.json();
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