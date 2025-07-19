import { NextRequest, NextResponse } from 'next/server';
import { makeAuthenticatedRequest } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  
  if (!accountId || !from || !to) {
    return NextResponse.json({ error: 'Missing account_id, from, or to parameters' }, { status: 400 });
  }
  
  try {
    const response = await makeAuthenticatedRequest(
      'taboola',
      `https://backstage.taboola.com/backstage/api/1.0/${accountId}/reports/campaign-summary/dimensions/day?start_date=${from}&end_date=${to}`
    );

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    return NextResponse.json(response.data, { 
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch Taboola campaign reports' 
    }, { status: 500 });
  }
} 