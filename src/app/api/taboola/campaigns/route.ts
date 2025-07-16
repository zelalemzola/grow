import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.TABOOLA_ACCESS_TOKEN;
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');
  if (!token || !accountId) {
    return NextResponse.json({ error: 'Missing Taboola credentials or account_id' }, { status: 400 });
  }
  const url = `https://backstage.taboola.com/backstage/api/1.0/${accountId}/campaigns`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch Taboola campaigns' }, { status: 500 });
  }
} 