import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.OUTBRAIN_TOKEN;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!token) {
    return NextResponse.json({ error: 'Missing OUTBRAIN_TOKEN in environment' }, { status: 500 });
  }

  // Fetch all marketers
  let marketers: any[] = [];
  try {
    const marketersRes = await fetch('https://api.outbrain.com/amplify/v0.1/marketers', {
      headers: { 'OB-TOKEN-V1': token },
    });
    if (!marketersRes.ok) {
      const error = await marketersRes.text();
      return NextResponse.json({ error: 'Failed to fetch marketers: ' + error }, { status: marketersRes.status });
    }
    const marketersData = await marketersRes.json();
    marketers = marketersData.marketers || marketersData.results || [];
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch marketers' }, { status: 500 });
  }

  // For each marketer, fetch their campaign performance
  const allResults: any[] = [];
  let marketerCount = 0;
  let campaignCount = 0;
  for (const marketer of marketers) {
    const marketerId = marketer.id || marketer.marketerId;
    const marketerName = marketer.name || marketer.marketerName || '';
    if (!marketerId) continue;
    let url = `https://api.outbrain.com/amplify/v0.1/reports/marketers/${marketerId}/campaigns?`;
    if (from) url += `from=${encodeURIComponent(from)}&`;
    if (to) url += `to=${encodeURIComponent(to)}&`;
    url = url.replace(/&$/, '');
    try {
      const res = await fetch(url, {
        headers: { 'OB-TOKEN-V1': token },
      });
      if (!res.ok) continue; // skip this marketer if error
      const data = await res.json();
      const rows = (data.results || []).map((row: any) => ({ ...row, marketerId, marketerName }));
      allResults.push(...rows);
      marketerCount++;
      campaignCount += rows.length;
    } catch { /* skip on error */ }
  }

  if (marketerCount === 0) {
    return NextResponse.json({ error: 'Failed to fetch any marketer performance data' }, { status: 500 });
  }

  return NextResponse.json({ results: allResults, summary: { marketerCount, campaignCount } }, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate' } });
} 