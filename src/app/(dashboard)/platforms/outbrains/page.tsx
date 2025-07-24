'use client'
import React, { useState } from 'react';
import MarketersList from './MarketersList';
import CampaignsList from './CampaignsList';
import BudgetsList from './BudgetsList';
import LocationsSearch from './LocationsSearch';
import PerformanceTable from './PerformanceTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { KPICard } from '@/components/dashboard/KPICard';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Target, Users, MousePointerClick, PieChart as PieChartIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { PieChart } from '@/components/dashboard/PieChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { BarChart } from '@/components/dashboard/BarChart';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { getEurToUsdRate } from '@/lib/utils';

const KPI_LIST = [
  {
    key: 'spend',
    title: 'Spend',
    format: 'currency',
    icon: <DollarSign className="h-5 w-5 text-primary" />,
    description: 'Total ad spend',
  },
  {
    key: 'impressions',
    title: 'Impressions',
    format: 'number',
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    description: 'Total ad impressions',
  },
  {
    key: 'clicks',
    title: 'Clicks',
    format: 'number',
    icon: <MousePointerClick className="h-5 w-5 text-primary" />,
    description: 'Total ad clicks',
  },
  {
    key: 'conversions',
    title: 'Conversions',
    format: 'number',
    icon: <Target className="h-5 w-5 text-primary" />,
    description: 'Total conversions',
  },
  {
    key: 'revenue',
    title: 'Outbrain-Reported Revenue',
    format: 'currency',
    icon: <PieChartIcon className="h-5 w-5 text-primary" />,
    description: 'Revenue attributed by Outbrain pixel',
  },
  {
    key: 'roas',
    title: 'ROAS',
    format: 'number',
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
    description: 'Return on Ad Spend',
  },
  {
    key: 'ctr',
    title: 'CTR',
    format: 'percentage',
    icon: <Activity className="h-5 w-5 text-primary" />,
    description: 'Click-through rate',
  },
  {
    key: 'cpa',
    title: 'CPA',
    format: 'currency',
    icon: <Users className="h-5 w-5 text-primary" />,
    description: 'Cost per acquisition',
  },
];

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from,
    to,
  };
}

const OutbrainsPage = () => {
  const [selectedMarketer, setSelectedMarketer] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsType, setDetailsType] = useState<'campaign' | 'budget' | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);

  const defaultRange = getDefaultDateRange();
  const [from, setFrom] = useState<Date>(defaultRange.from);
  const [to, setTo] = useState<Date>(defaultRange.to);

  // Fetch performance data for the selected marketer and date range
  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['outbrain', 'performance', selectedMarketer, from?.toISOString().slice(0,10), to?.toISOString().slice(0,10)],
    queryFn: async () => {
      if (!selectedMarketer) return [];
      const url = new URL('/api/outbrain/performance', window.location.origin);
      url.searchParams.set('from', from.toISOString().slice(0, 10));
      url.searchParams.set('to', to.toISOString().slice(0, 10));
      url.searchParams.set('marketerId', selectedMarketer);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch performance data');
      const json = await res.json();
      return Array.isArray(json.results) ? json.results : [];
    },
    enabled: !!selectedMarketer,
  });

  // Fetch EUR to USD rate
  const { data: eurToUsdRateData } = useQuery<number>({
    queryKey: ['eur-usd-rate'],
    queryFn: getEurToUsdRate,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    retry: 1,
  });
  const EUR_TO_USD = typeof eurToUsdRateData === 'number' && !isNaN(eurToUsdRateData) ? eurToUsdRateData : 1.10;

  // Aggregate KPI totals from the performance data
  const kpiTotals = useMemo(() => {
    if (!perfData || !Array.isArray(perfData)) return null;
    return perfData.reduce(
      (acc: any, row: any) => {
        const m = row.metrics || {};
        const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
        const spend = isEUR ? Number(m.spend || 0) * EUR_TO_USD : Number(m.spend || 0);
        const revenue = isEUR ? Number(m.sumValue || 0) * EUR_TO_USD : Number(m.sumValue || 0);
        acc.spend += spend;
        acc.impressions += Number(m.impressions || 0);
        acc.clicks += Number(m.clicks || 0);
        acc.conversions += Number(m.conversions || 0);
        acc.revenue += revenue;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
    );
  }, [perfData, EUR_TO_USD]);
  if (kpiTotals) {
    kpiTotals.roas = kpiTotals.spend > 0 ? kpiTotals.revenue / kpiTotals.spend : 0;
    kpiTotals.ctr = kpiTotals.impressions > 0 ? (kpiTotals.clicks / kpiTotals.impressions) * 100 : 0;
    kpiTotals.cpa = kpiTotals.conversions > 0 ? kpiTotals.spend / kpiTotals.conversions : 0;
  }

  // Fetch campaigns data for pie charts
  const { data: campaignsData } = useQuery({
    queryKey: ['outbrain', 'campaigns', selectedMarketer],
    queryFn: async () => {
      if (!selectedMarketer) return { campaigns: [] };
      const res = await fetch(`/api/outbrain/campaigns?marketerId=${selectedMarketer}`);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
    enabled: !!selectedMarketer,
  });

  const campaigns = campaignsData?.campaigns || [];

  // Pie chart calculations
  // 1. Content Type Distribution
  const campaignsByContentType = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    const map = new Map<string, number>();
    campaigns.forEach((campaign: any) => {
      const type = campaign.contentType || 'Unknown';
      map.set(type, (map.get(type) || 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    const total = arr.reduce((sum, item) => sum + item.value, 0);
    return arr.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [campaigns]);

  // 2. Campaign Objective Distribution
  const campaignsByObjective = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    const map = new Map<string, number>();
    campaigns.forEach((campaign: any) => {
      const objective = campaign.objective || 'Unknown';
      map.set(objective, (map.get(objective) || 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    const total = arr.reduce((sum, item) => sum + item.value, 0);
    return arr.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [campaigns]);

  // 3. Top Campaigns by Conversions
  const topCampaignsByConversions = useMemo(() => {
    if (!perfData || !Array.isArray(perfData) || perfData.length === 0) return [];
    
    // Aggregate conversions by campaign
    const campaignConversions = new Map<string, number>();
    perfData.forEach((row: any) => {
      const campaignId = row.metadata?.campaignId || row.campaignId;
      const campaignName = row.metadata?.campaignName || `Campaign ${campaignId}`;
      const conversions = Number(row.metrics?.conversions || 0);
      if (campaignId) {
        campaignConversions.set(campaignName, (campaignConversions.get(campaignName) || 0) + conversions);
      }
    });
    
    const arr = Array.from(campaignConversions.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 campaigns
    
    const total = arr.reduce((sum, item) => sum + item.value, 0);
    return arr.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [perfData]);



  // 2. Daily Spend Trends
  const dailySpendTrends = useMemo(() => {
    if (!perfData || !Array.isArray(perfData) || perfData.length === 0) return [];
    const dailySpend = new Map<string, number>();
    perfData.forEach((row: any) => {
      const date = row.metadata?.date || row.date;
      const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
      const spend = isEUR ? Number(row.metrics?.spend || 0) * EUR_TO_USD : Number(row.metrics?.spend || 0);
      if (date && spend > 0) {
        dailySpend.set(date, (dailySpend.get(date) || 0) + spend);
      }
    });
    
    return Array.from(dailySpend.entries())
      .map(([date, spend]) => ({ date, spend }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [perfData, EUR_TO_USD]);

  // 3. ROAS Distribution
  const roasDistribution = useMemo(() => {
    if (!perfData || !Array.isArray(perfData) || perfData.length === 0) return [];
    const roasRanges = {
      '0-1x': 0,
      '1-2x': 0,
      '2-5x': 0,
      '5x+': 0
    };
    perfData.forEach((row: any) => {
      const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
      const spend = isEUR ? Number(row.metrics?.spend || 0) * EUR_TO_USD : Number(row.metrics?.spend || 0);
      const revenue = isEUR ? Number(row.metrics?.sumValue || 0) * EUR_TO_USD : Number(row.metrics?.sumValue || 0);
      if (spend > 0) {
        const roas = revenue / spend;
        if (roas < 1) roasRanges['0-1x']++;
        else if (roas < 2) roasRanges['1-2x']++;
        else if (roas < 5) roasRanges['2-5x']++;
        else roasRanges['5x+']++;
      }
    });
    return Object.entries(roasRanges)
      .map(([range, count]) => ({ name: range, value: count }))
      .filter(item => item.value > 0);
  }, [perfData, EUR_TO_USD]);

  // 4. Spend Distribution
  const spendDistribution = useMemo(() => {
    if (!perfData || !Array.isArray(perfData) || perfData.length === 0) return [];
    const spendRanges = {
      '0-100': 0,
      '100-500': 0,
      '500-1000': 0,
      '1000-5000': 0,
      '5000+': 0
    };
    perfData.forEach((row: any) => {
      const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
      const spend = isEUR ? Number(row.metrics?.spend || 0) * EUR_TO_USD : Number(row.metrics?.spend || 0);
      if (spend > 0) {
        if (spend <= 100) spendRanges['0-100']++;
        else if (spend <= 500) spendRanges['100-500']++;
        else if (spend <= 1000) spendRanges['500-1000']++;
        else if (spend <= 5000) spendRanges['1000-5000']++;
        else spendRanges['5000+']++;
      }
    });
    return Object.entries(spendRanges)
      .map(([range, count]) => ({ name: range, value: count }))
      .filter(item => item.value > 0);
  }, [perfData, EUR_TO_USD]);

  // 5. Daily Conversion Trends
  const dailyConversionTrends = useMemo(() => {
    if (!perfData || !Array.isArray(perfData) || perfData.length === 0) return [];
    
    const dailyConversions = new Map<string, number>();
    perfData.forEach((row: any) => {
      const date = row.metadata?.date || row.date;
      const conversions = Number(row.metrics?.conversions || 0);
      if (date && !isNaN(conversions)) {
        dailyConversions.set(date, (dailyConversions.get(date) || 0) + conversions);
      }
    });
    
    return Array.from(dailyConversions.entries())
      .map(([date, conversions]) => ({ date, conversions }))
      .filter(item => item.conversions > 0) // Only show days with conversions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [perfData]);

  // Handler for opening details modal
  const openDetails = (type: 'campaign' | 'budget', data: any) => {
    setDetailsType(type);
    setDetailsData(data);
    setDetailsOpen(true);
  };

  return (
    <main className="min-h-screen bg-background py-8 px-2 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold mb-2 text-primary flex items-center gap-2">
          <span>Outbrain Dashboard</span>
        </h1>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {perfLoading ? (
            KPI_LIST.map(kpi => (
              <div key={kpi.key} className="h-24 bg-muted rounded animate-pulse" />
            ))
          ) : kpiTotals ? (
            KPI_LIST.map(kpi => (
              <KPICard
                key={kpi.key}
                title={kpi.title}
                value={kpiTotals[kpi.key] || 0}
                format={kpi.format as any}
                icon={kpi.icon}
                description={kpi.description}
              />
            ))
          ) : null}
        </div>
        {/* Date Range Controls (shared) */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {/* Start Date Calendar */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-start text-left">
                {from ? format(from, 'yyyy-MM-dd') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                selected={from}
                onSelect={date => date && setFrom(date)}
                initialFocus
                toDate={to}
              />
            </PopoverContent>
          </Popover>
          {/* End Date Calendar */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-start text-left">
                {to ? format(to, 'yyyy-MM-dd') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                selected={to}
                onSelect={date => date && setTo(date)}
                initialFocus
                fromDate={from}
                toDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
        
       
        
        {/* Marketers Card and rest of dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Marketers</CardTitle>
          </CardHeader>
          <CardContent>
            <MarketersList
              onSelect={id => {
                setSelectedMarketer(id);
                setSelectedCampaign(null);
              }}
              selectedMarketerId={selectedMarketer || undefined}
            />
          </CardContent>
        </Card>
        
       
        
        <div className="grid grid-cols-1  gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Campaigns</CardTitle>
              
            </CardHeader>
            <CardContent>
              {selectedMarketer ? (
                <CampaignsList
                  marketerId={selectedMarketer}
                  onSelect={id => {
                    setSelectedCampaign(id);
                  }}
                  selectedCampaignId={selectedCampaign || undefined}
                  onDetails={data => openDetails('campaign', data)}
                />
              ) : (
                <div className="text-muted-foreground">Select a marketer to view campaigns.</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Budgets</CardTitle>
              
            </CardHeader>
            <CardContent>
              {selectedMarketer ? (
                <BudgetsList
                  marketerId={selectedMarketer}
                  onDetails={data => openDetails('budget', data)}
                />
              ) : (
                <div className="text-muted-foreground">Select a marketer to view budgets.</div>
              )}
            </CardContent>
          </Card>
        </div>
         {/* Performance Visualizations */}
         {selectedMarketer && (roasDistribution.length > 0 || spendDistribution.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {roasDistribution.length > 0 && (
              <PieChart
                data={roasDistribution}
                title="ROAS Distribution"
                description="Distribution of campaigns by ROAS ranges."
                dataKey="value"
                nameKey="name"
                valueKey="value"
              />
            )}
            {spendDistribution.length > 0 && (
              <PieChart
                data={spendDistribution}
                title="Spend Distribution"
                description="Distribution of campaigns by spend ranges ($)."
                dataKey="value"
                nameKey="name"
                valueKey="value"
              />
            )}
          </div>
        )}
        {/* Performance Table */}
        {selectedMarketer && (
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceTable
                marketerId={selectedMarketer}
                campaignId={selectedCampaign || undefined}
                from={from}
                to={to}
              />
            </CardContent>
          </Card>
        )}
        
      </div>
      {/* Details Modal (Sheet) */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="max-w-md w-full">
          <SheetHeader>
            <SheetTitle>{detailsType === 'campaign' ? 'Campaign Details' : 'Budget Details'}</SheetTitle>
          </SheetHeader>
          {/* Details content here, render detailsData */}
          <pre className="text-xs mt-4 bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(detailsData, null, 2)}</pre>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default OutbrainsPage; 