import { NextRequest, NextResponse } from "next/server";
import { makeAuthenticatedRequest } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const response = await makeAuthenticatedRequest(
      'adup',
      'https://api.adup-tech.com/v202101/report',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    if (!response.success) {
      return NextResponse.json({ error: response.error || "Failed to fetch AdUp report." }, { status: 500 });
    }

    return NextResponse.json(response.data, { 
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
} 