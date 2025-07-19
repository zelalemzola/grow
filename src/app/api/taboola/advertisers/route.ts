import { NextRequest, NextResponse } from 'next/server';
import { makeAuthenticatedRequest } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const accountId = process.env.TABOOLA_ACCOUNT_ID;
  if (!accountId) {
    return NextResponse.json({ error: 'Missing TABOOLA_ACCOUNT_ID in environment' }, { status: 500 });
  }

  try {
    const response = await makeAuthenticatedRequest(
      'taboola',
      `https://backstage.taboola.com/backstage/api/1.0/${accountId}/advertisers`
    );

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    return NextResponse.json(response.data, { 
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch Taboola advertisers' 
    }, { status: 500 });
  }
} 