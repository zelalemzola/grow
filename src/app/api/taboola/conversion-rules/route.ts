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
      `https://backstage.taboola.com/backstage/api/1.0/${accountId}/universal_pixel/conversion_rule`
    );

    if (!response.success) {
      // Check if it's a 404 error (no conversion rules)
      if (response.error?.includes('404')) {
        return NextResponse.json({ results: [] }, { status: 200 });
      }
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    return NextResponse.json(response.data, { 
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch Taboola conversion rules' 
    }, { status: 500 });
  }
} 