import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from or to parameters' }, { status: 400 });
  }

  // Use absolute URLs for server-side fetches
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    // Fetch data from all platforms in parallel
    const [outbrainRes, taboolaRes, adupRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/outbrain/performance?from=${from}&to=${to}`),
      fetch(`${baseUrl}/api/taboola/reports/campaigns?account_id=${process.env.TABOOLA_ACCOUNT_ID}&from=${from}&to=${to}`),
      fetch(`${baseUrl}/api/adup/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: "Campaign Performance",
          report_type: "CAMPAIGN_PERFORMANCE_REPORT",
          select: ["Month", "CampaignName", "Clicks", "Impressions", "Cost", "Conversions", "Ctr"],
          conditions: [],
          download_format: "JSON",
          date_range_type: "CUSTOM_DATE",
          date_range: { min: from, max: to }
        })
      })
    ]);

    const platforms: Record<string, any> = {};

    // Process Outbrain data
    if (outbrainRes.status === 'fulfilled' && outbrainRes.value.ok) {
      const data = await outbrainRes.value.json();
      const results = data.results || [];
      const totals = results.reduce((acc: any, row: any) => {
        const metrics = row.metrics || {};
        acc.spend += Number(metrics.spend || 0);
        acc.revenue += Number(metrics.sumValue || 0);
        acc.clicks += Number(metrics.clicks || 0);
        acc.impressions += Number(metrics.impressions || 0);
        acc.conversions += Number(metrics.conversions || 0);
        return acc;
      }, { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 });
      
      platforms.outbrain = {
        ...totals,
        roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
        campaigns: results.length,
        status: 'active'
      };
    } else {
      platforms.outbrain = {
        spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0,
        roas: 0, ctr: 0, cpc: 0, campaigns: 0, status: 'error'
      };
    }

    // Process Taboola data
    if (taboolaRes.status === 'fulfilled' && taboolaRes.value.ok) {
      const data = await taboolaRes.value.json();
      const results = data.results || [];
      const totals = results.reduce((acc: any, row: any) => {
        acc.spend += Number(row.spent || 0);
        acc.revenue += Number(row.conversions_value || 0);
        acc.clicks += Number(row.clicks || 0);
        acc.impressions += Number(row.impressions || 0);
        acc.conversions += Number(row.conversions_value || 0);
        return acc;
      }, { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 });
      
      platforms.taboola = {
        ...totals,
        roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
        campaigns: results.length,
        status: 'active'
      };
    } else {
      platforms.taboola = {
        spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0,
        roas: 0, ctr: 0, cpc: 0, campaigns: 0, status: 'error'
      };
    }

    // Process AdUp data
    if (adupRes.status === 'fulfilled' && adupRes.value.ok) {
      const data = await adupRes.value.json();
      const results = Array.isArray(data) ? data : (data.results || []);
      const totals = results.reduce((acc: any, row: any) => {
        acc.spend += Number(row.Cost || 0);
        acc.clicks += Number(row.Clicks || 0);
        acc.impressions += Number(row.Impressions || 0);
        acc.conversions += Number(row.Conversions || 0);
        return acc;
      }, { spend: 0, clicks: 0, impressions: 0, conversions: 0 });
      
      platforms.adup = {
        ...totals,
        revenue: 0, // AdUp doesn't provide revenue data
        roas: 0,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
        campaigns: results.length,
        status: 'active'
      };
    } else {
      platforms.adup = {
        spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0,
        roas: 0, ctr: 0, cpc: 0, campaigns: 0, status: 'error'
      };
    }

    // Calculate overall totals
    const overallTotals = Object.values(platforms).reduce((acc: any, platform: any) => {
      acc.spend += platform.spend;
      acc.revenue += platform.revenue;
      acc.clicks += platform.clicks;
      acc.impressions += platform.impressions;
      acc.conversions += platform.conversions;
      acc.campaigns += platform.campaigns;
      return acc;
    }, { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0, campaigns: 0 });

    overallTotals.roas = overallTotals.spend > 0 ? overallTotals.revenue / overallTotals.spend : 0;
    overallTotals.ctr = overallTotals.impressions > 0 ? (overallTotals.clicks / overallTotals.impressions) * 100 : 0;
    overallTotals.cpc = overallTotals.clicks > 0 ? overallTotals.spend / overallTotals.clicks : 0;

    return NextResponse.json({
      platforms,
      overall: overallTotals,
      dateRange: { from, to }
    }, { 
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate' } 
    });

  } catch (error: any) {
    console.error('Error fetching platforms summary:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch platforms summary' 
    }, { status: 500 });
  }
} 