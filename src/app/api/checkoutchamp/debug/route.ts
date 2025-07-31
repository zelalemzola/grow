import { NextResponse } from 'next/server';

export async function GET() {
  const loginId = process.env.CHECKOUT_CHAMP_USERNAME;
  const password = process.env.CHECKOUT_CHAMP_PASSWORD;
  
  if (!loginId || !password) {
    console.error('❌ CheckoutChamp Debug: Missing credentials');
    return NextResponse.json({ 
      error: 'Missing credentials',
      hasLoginId: !!loginId,
      hasPassword: !!password
    }, { status: 500 });
  }

  // Test multiple endpoints to see which one works
  const tests = [
    {
      name: 'Orders API',
      url: `https://api.checkoutchamp.com/order/query/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}&startDate=01/01/2024&endDate=01/01/2024&page=1&resultsPerPage=1`
    },
    {
      name: 'Summary API',
      url: `https://api.checkoutchamp.com/transactions/summary/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}&startDate=01/01/2024&endDate=01/01/2024&reportType=campaign`
    },
    {
      name: 'Products API',
      url: `https://api.checkoutchamp.com/product/query/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}`
    }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`🔍 Testing ${test.name}...`);
      
      const response = await fetch(test.url, {
        method: test.name === 'Products API' ? 'POST' : 'GET',
        headers: test.name === 'Products API' ? { 'Content-Type': 'application/json' } : {},
        signal: AbortSignal.timeout(30000)
      });

      const text = await response.text();
      
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (e) {
        parsedData = text;
      }

      const result = {
        name: test.name,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedData,
        error: !response.ok ? text : null
      };

      if (!response.ok) {
        console.error(`❌ ${test.name} failed:`, {
          status: response.status,
          statusText: response.statusText,
          error: text
        });
      } else {
        console.log(`✅ ${test.name} successful`);
      }

      results.push(result);

    } catch (error) {
      console.error(`❌ ${test.name} exception:`, error);
      results.push({
        name: test.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        exception: true
      });
    }
  }

  // Also test what IP we're using
  let ipInfo = null;
  try {
    const ipResponse = await fetch('https://ifconfig.me', { signal: AbortSignal.timeout(10000) });
    ipInfo = await ipResponse.text();
  } catch (error) {
    ipInfo = 'Failed to get IP info';
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV
    },
    credentials: {
      hasLoginId: !!loginId,
      hasPassword: !!password,
      loginIdLength: loginId?.length || 0
    },
    ipInfo,
    tests: results
  });
} 