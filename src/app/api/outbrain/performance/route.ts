import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = process.env.OUTBRAIN_TOKEN;
  const { searchParams } = new URL(req.url);
  const marketerId = searchParams.get('marketerId');
  const campaignId = searchParams.get('campaignId');
  const budgetId = searchParams.get('budgetId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  const sort = searchParams.get('sort');
  const filter = searchParams.get('filter');
  const includeArchivedCampaigns = searchParams.get('includeArchivedCampaigns');
  const includeConversionDetails = searchParams.get('includeConversionDetails');
  const conversionsByClickDate = searchParams.get('conversionsByClickDate');

  if (!token) {
    return NextResponse.json({ error: 'Missing OUTBRAIN_TOKEN in environment' }, { status: 500 });
  }
  if (!marketerId) {
    return NextResponse.json({ error: 'Missing marketerId parameter' }, { status: 400 });
  }

  let url = `https://api.outbrain.com/amplify/v0.1/reports/marketers/${marketerId}/campaigns?`;
  if (from) url += `from=${encodeURIComponent(from)}&`;
  if (to) url += `to=${encodeURIComponent(to)}&`;
  if (limit) url += `limit=${encodeURIComponent(limit)}&`;
  if (offset) url += `offset=${encodeURIComponent(offset)}&`;
  if (sort) url += `sort=${encodeURIComponent(sort)}&`;
  if (filter) url += `filter=${encodeURIComponent(filter)}&`;
  if (includeArchivedCampaigns) url += `includeArchivedCampaigns=${encodeURIComponent(includeArchivedCampaigns)}&`;
  if (budgetId) url += `budgetId=${encodeURIComponent(budgetId)}&`;
  if (campaignId) url += `campaignId=${encodeURIComponent(campaignId)}&`;
  if (includeConversionDetails) url += `includeConversionDetails=${encodeURIComponent(includeConversionDetails)}&`;
  if (conversionsByClickDate) url += `conversionsByClickDate=${encodeURIComponent(conversionsByClickDate)}&`;

  url = url.replace(/&$/, ''); // Remove trailing &

  try {
    const res = await fetch(url, {
      headers: { 'OB-TOKEN-V1': token },
    });
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    const data = await res.json();
    // Return results and summary as in docs
    return NextResponse.json({ results: data.results, summary: data.summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch performance data' }, { status: 500 });
  }
} 