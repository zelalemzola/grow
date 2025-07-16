import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.OUTBRAIN_TOKEN;
  const { searchParams } = new URL(req.url);
  const term = searchParams.get('term');
  if (!token) {
    return NextResponse.json({ error: 'Missing OUTBRAIN_TOKEN in environment' }, { status: 500 });
  }
  if (!term) {
    return NextResponse.json({ error: 'Missing term parameter' }, { status: 400 });
  }
  try {
    const url = `https://api.outbrain.com/amplify/v0.1/locations/search?term=${encodeURIComponent(term)}`;
    const res = await fetch(url, {
      headers: { 'OB-TOKEN-V1': token },
    });
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch locations' }, { status: 500 });
  }
} 