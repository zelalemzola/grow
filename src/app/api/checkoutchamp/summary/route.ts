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
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  // Validate required params
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 });
  }

  // Build the URL
  const url = `https://api.checkoutchamp.com/transactions/summary/?loginId=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&reportType=${encodeURIComponent(reportType)}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch summary from CheckoutChamp', details: error }, { status: 500 });
  }
} 