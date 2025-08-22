import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.OUTBRAIN_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing OUTBRAIN_TOKEN in environment' }, { status: 500 });
  }
  try {
    const res = await fetch('https://api.outbrain.com/amplify/v0.1/marketers', {
      headers: { 'OB-TOKEN-V1': 'MTc1NTg0ODY2MzM3ODozNjQ1ZTMwZjI2ZWE5OGJmOGUxM2JjNWQ0YTFmYTIxYzM1MmZmYjNiYzlhZTdmZmMxYzNmYWM2NDVmNjk2NTI0OnsiY2FsbGVyQXBwbGljYXRpb24iOiJBbWVsaWEiLCJpcEFkZHJlc3MiOiIvMTAuMjQzLjg1LjExOjQ5NDQ0IiwiYnlwYXNzQXBpQXV0aCI6ImZhbHNlIiwidXNlck5hbWUiOiJtb2hhbWVkQGdyb3dldml0eS5jb20iLCJ1c2VySWQiOiIxMDc1OTUzOSIsImRhdGFTb3VyY2VUeXBlIjoiTVlfT0JfQ09NIn06NjBmYmIzZTBhYWU0NzdlODc0ZmUwNjhlZWJmYTczODZmNTdjYTA0OGI1MDY0MWZhNDIxOGY1MDJhNjA4YzAxMzUwNzFlNjQwNmYzNDlkMWYxNzI5NmQ1ZWY2M2I0MWIyNThlZjkwZTYxOTZmZjY5NDkzZjc1Y2MxYjMxNmU5MGY=' },
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