import { NextResponse } from 'next/server';
import { getAdupToken, getTaboolaToken } from '@/lib/api-helpers';

export async function GET() {
  try {
    const [adupToken, taboolaToken] = await Promise.all([
      getAdupToken().catch(err => ({ error: err.message })),
      getTaboolaToken().catch(err => ({ error: err.message }))
    ]);

    return NextResponse.json({
      success: true,
      data: {
        adup: typeof adupToken === 'string' ? { token: adupToken.substring(0, 20) + '...' } : adupToken,
        taboola: typeof taboolaToken === 'string' ? { token: taboolaToken.substring(0, 20) + '...' } : taboolaToken,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 