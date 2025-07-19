import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.OUTBRAIN_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing OUTBRAIN_TOKEN in environment' }, { status: 500 });
  }
  try {
    const res = await fetch('https://api.outbrain.com/amplify/v0.1/marketers', {
      headers: { 'OB-TOKEN-V1': 'MTc1MjM4NDAxODExNzoyZDMwNzc0MzEyMTQ4OTg1OTRlOGRlZDA0MTE1YjQ0MTdlOWY2MGY2MmQxNjFmNTdlODBkODE0YTNmZTU5ZmQwOnsiY2FsbGVyQXBwbGljYXRpb24iOiJBbWVsaWEiLCJpcEFkZHJlc3MiOiIvMTAuMjEyLjEwOS4yNDA6Mzk3NzYiLCJieXBhc3NBcGlBdXRoIjoiZmFsc2UiLCJ1c2VyTmFtZSI6Im1vaGFtZWRAZ3Jvd2V2aXR5LmNvbSIsInVzZXJJZCI6IjEwNzU5NTM5IiwiZGF0YVNvdXJjZVR5cGUiOiJNWV9PQl9DT00ifTozY2I3MzBmYTdiNzg4MTg5NmQxYmE5MDhhZDQ3ZDVkNDc3MTBhOTk1YzI3MTI2NGVhNmMyODdiMDdlNGQwYmExNDBmMTcwMjdhNGYzYjFkZTFhOGFhYzVhYzM4OTFjNmVkNmY4ZjY4N2U2ZjJlYjViNTc5Yjg2MDQ2ODFkM2Y5ZQ==' },
    });
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch marketers' }, { status: 500 });
  }
} 