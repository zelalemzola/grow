import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.OUTBRAIN_TOKEN;
  const { searchParams } = new URL(req.url);
  const marketerId = searchParams.get('marketerId');
  if (!token) {
    return NextResponse.json({ error: 'Missing OUTBRAIN_TOKEN in environment' }, { status: 500 });
  }
  if (!marketerId) {
    return NextResponse.json({ error: 'Missing marketerId parameter' }, { status: 400 });
  }
  try {
    const url = `https://api.outbrain.com/amplify/v0.1/marketers/${marketerId}/budgets`;
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
    return NextResponse.json({ error: error.message || 'Failed to fetch budgets' }, { status: 500 });
  }
} 