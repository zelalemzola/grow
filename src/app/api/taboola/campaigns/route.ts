import { NextRequest, NextResponse } from 'next/server';
import { makeAuthenticatedRequest } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');

  if (!accountId) {
    return NextResponse.json({ error: 'Missing account_id parameter' }, { status: 400 });
  }

  try {
    const response = await makeAuthenticatedRequest(
      'taboola',
      `https://backstage.taboola.com/backstage/api/1.0/${accountId}/campaigns`
    );

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    const data = response.data as any;
    const campaigns = data.results || data.campaigns || [];
    
    console.log(`Taboola campaigns API: Fetched ${campaigns.length} campaigns for account ${accountId}`);
    
    return NextResponse.json({ 
      results: campaigns, 
      summary: { campaignCount: campaigns.length } 
    }, { 
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch campaigns' }, { status: 500 });
  }
} 