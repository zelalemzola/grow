import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.OUTBRAIN_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing OUTBRAIN_TOKEN in environment' }, { status: 500 });
  }
  try {
    const res = await fetch('https://api.outbrain.com/amplify/v0.1/marketers', {
      headers: { 'OB-TOKEN-V1': 'MTc1NTc3NjEyMjUwNzoxZWVmNGMyODE2Y2Y1YjVjMjI5ZjYzNjZhNGQyNDYxNGQwOGE3ZTIyM2I5NGIxODAzYTU5Y2Q2ODA0OWE1ZjE5OnsiY2FsbGVyQXBwbGljYXRpb24iOiJBbWVsaWEiLCJpcEFkZHJlc3MiOiIvMTAuMjQzLjg1LjExOjU1NzA0IiwiYnlwYXNzQXBpQXV0aCI6ImZhbHNlIiwidXNlck5hbWUiOiJ0emVsYWxlbXRlc2ZheWVAZ21haWwuY29tIiwidXNlcklkIjoiMTA4NDE2ODEiLCJkYXRhU291cmNlVHlwZSI6Ik1ZX09CX0NPTSJ9OjE4ZWZiZGQ0MzQzYWVhMTc4YTA4ZDFkN2I1NzJjYjJiYjU5MTQ0MzRlNzU2YThmODVhNDU5M2Y2ZTg2ZjFiZjU4ZGQyMjlkMDVjNzYzNDYwZTdhNTIwOGJmMTVhNWU3ODY4ZDlkNzRmZGI0YWJmZjZhMzYxNDRhNWJmZDNkNjhi' },
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