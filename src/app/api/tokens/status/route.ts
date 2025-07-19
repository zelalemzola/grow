import { NextResponse } from 'next/server';
import { getTokenCacheStatus } from '@/lib/api-helpers';

export async function GET() {
  try {
    const cacheStatus = getTokenCacheStatus();
    
    return NextResponse.json({
      success: true,
      data: cacheStatus,
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