import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.TABOOLA_ACCESS_TOKEN;
  const accountId = process.env.TABOOLA_ACCOUNT_ID;
  if (!token || !accountId) {
    return NextResponse.json({ error: 'Missing Taboola credentials in environment' }, { status: 500 });
  }
  const url = `https://backstage.taboola.com/backstage/api/1.0/${accountId}/advertisers`;
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
    return NextResponse.json({ error: error.message || 'Failed to fetch Taboola advertisers' }, { status: 500 });
  }
} 