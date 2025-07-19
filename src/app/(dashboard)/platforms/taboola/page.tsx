"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "@/components/dashboard/DataTable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { KPICard } from '@/components/dashboard/KPICard';
import { DollarSign, BarChart3, MousePointerClick, TrendingUp, Activity, Target, Divide, Percent } from 'lucide-react';
import { useMemo } from 'react';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { parseISO, format as formatDate } from 'date-fns';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { getEurToUsdRate } from '@/lib/utils';

function useTaboolaAdvertisers() {
  return useQuery({
    queryKey: ["taboola", "advertisers"],
    queryFn: async () => {
      const res = await fetch("/api/taboola/advertisers");
      if (!res.ok) throw new Error("Failed to fetch advertisers");
      return res.json();
    },
  });
}

function useTaboolaCampaigns(accountId?: string) {
  return useQuery({
    queryKey: ["taboola", "campaigns", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const res = await fetch(`/api/taboola/campaigns?account_id=${accountId}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error("Request timed out. Please try again.");
        }
        throw error;
      }
    },
    enabled: !!accountId,
    retry: 1,
    retryDelay: 2000,
  });
}

function useTaboolaConversionRules(accountId?: string) {
  return useQuery({
    queryKey: ["taboola", "conversion-rules", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const res = await fetch(`/api/taboola/conversion-rules?account_id=${accountId}`);
      if (!res.ok) throw new Error("Failed to fetch conversion rules");
      return res.json();
    },
    enabled: !!accountId,
  });
}

function useTaboolaCampaignReports(accountId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ["taboola", "reports", accountId, from, to],
    queryFn: async () => {
      if (!accountId || !from || !to) return [];
      const res = await fetch(`/api/taboola/reports/campaigns?account_id=${accountId}&from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed to fetch campaign reports");
      return res.json();
    },
    enabled: !!accountId && !!from && !!to,
  });
}

function dynamicColumns(rows: any[], alwaysShow: { key: string; label: string; tooltip?: string }[] = []) {
  if (!rows.length) return alwaysShow.map(col => ({ ...col, visible: true }));
  const keys = new Set<string>();
  rows.forEach(row => Object.keys(row).forEach(k => keys.add(k)));
  return [
    ...alwaysShow.map(col => ({ ...col, visible: true })),
    ...Array.from(keys).filter(k => !alwaysShow.some(col => col.key === k) && k !== "budget").map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim(),
      visible: true,
      tooltip: `Field from Taboola API: ${key}`,
    })),
  ];
}

function formatRow(row: any, allKeys: string[]) {
  const formatted: Record<string, any> = {};
  for (const key of allKeys) {
    if (key === "budget") continue;
    let value = row[key];
    if (typeof value === "boolean") {
      formatted[key] = value ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>;
    } else if (typeof value === "object" && value !== null) {
      formatted[key] = <pre className="text-xs bg-muted p-1 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
    } else if (value === 0) {
      formatted[key] = 0;
    } else if (value === "" || value === undefined || value === null) {
      formatted[key] = "-";
    } else {
      formatted[key] = value;
    }
  }
  return formatted;
}

const alwaysShowAdvertiser = [
  { key: "name", label: "Advertiser Name", tooltip: "The name of the advertiser." },
  { key: "account_id", label: "Account ID", tooltip: "Taboola account ID." },
];
const alwaysShowCampaign = [
  { key: "name", label: "Campaign Name", tooltip: "The name of the campaign." },
  { key: "id", label: "Campaign ID", tooltip: "Unique campaign identifier." },
];
const alwaysShowConversionRule = [
  { key: "display_name", label: "Rule Name", tooltip: "Conversion rule display name." },
  { key: "id", label: "Rule ID", tooltip: "Conversion rule ID." },
];
const alwaysShowReport = [
  { key: "date", label: "Date", tooltip: "Report date." },
  { key: "campaign", label: "Campaign", tooltip: "Campaign name or ID." },
];

// Define relevant columns for campaigns
const campaignColumns = [
  { key: 'name', label: 'Campaign Name', visible: true },
  { key: 'id', label: 'Campaign ID', visible: true },
  { key: 'branding_text', label: 'Branding', visible: true },
  { key: 'pricing_model', label: 'Pricing Model', visible: true },
  { key: 'daily_cap', label: 'Daily Cap', visible: true },
  { key: 'status', label: 'Status', visible: true },
  { key: 'country_targeting', label: 'Countries', visible: true },
];

// Format campaign row for display
function formatCampaignRow(row: any) {
  return {
    name: row.name || '-',
    id: row.id || '-',
    branding_text: row.branding_text || '-',
    pricing_model: row.pricing_model || '-',
    daily_cap: row.daily_cap !== undefined && row.daily_cap !== null ? row.daily_cap : '-',
    status: (
      <Badge
        variant="secondary"
        className={row.is_active
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-red-100 text-red-800 border-red-200'}
      >
        {row.is_active ? 'Active' : 'Paused'}
      </Badge>
    ),
    country_targeting: Array.isArray(row.country_targeting?.value)
      ? row.country_targeting.value.join(', ')
      : '-',
  };
}

// Define relevant columns for conversion rules
const conversionRuleColumns = [
  { key: 'display_name', label: 'Rule Name', visible: true },
  { key: 'id', label: 'Rule ID', visible: true },
  { key: 'status', label: 'Status', visible: true },
  { key: 'type', label: 'Type', visible: true },
];

// Format conversion rule row for display
function formatConversionRuleRow(row: any) {
  return {
    display_name: row.display_name || '-',
    id: row.id || '-',
    status: (
      <Badge
        variant="secondary"
        className={row.is_active
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-red-100 text-red-800 border-red-200'}
      >
        {row.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
    type: row.type || '-',
  };
}

export default function TaboolaPage() {
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const ALL = '__all__';
  const [countryFilter, setCountryFilter] = useState<string>(ALL);
  const [brandingFilter, setBrandingFilter] = useState<string>(ALL);
  const statusOptions = [
    { value: ALL, label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
  ];
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  function getDefaultDateRange() {
    const to = new Date();
    const from = new Date();
    from.setFullYear(to.getFullYear() - 1);
    return { from, to };
  }
  const [reportDateRange, setReportDateRange] = useState(() => getDefaultDateRange());
  const { from: reportFrom, to: reportTo } = reportDateRange;

  // Fetch all advertisers
  const { data: advertisersData, isLoading: advLoading, error: advError } = useTaboolaAdvertisers();
  const advertisers = (advertisersData?.results || []).filter((a: { name: string }) => a.name.toLowerCase().includes(search.toLowerCase()));

  // Fetch campaigns, conversion rules, and reports for selected advertiser
  const { data: campaignsData, isLoading: campLoading, error: campError } = useTaboolaCampaigns(selectedAdvertiser || undefined);
  const campaigns = campaignsData?.results || [];

  const { data: convRulesData, isLoading: convLoading, error: convError } = useTaboolaConversionRules(selectedAdvertiser || undefined);
  const conversionRules = convRulesData?.results || [];

  const { data: reportsData, isLoading: repLoading, error: repError } = useTaboolaCampaignReports(selectedAdvertiser || undefined, reportFrom.toISOString().slice(0, 10), reportTo.toISOString().slice(0, 10));
  const reports = reportsData?.results || [];

  // Get unique country and branding values from campaigns
  const uniqueCountries: string[] = Array.from(new Set((campaigns || []).flatMap((c: { country_targeting?: { value?: string[] } }) => Array.isArray(c.country_targeting?.value) ? c.country_targeting.value : []).filter((v: unknown): v is string => typeof v === 'string' && !!v)));
  const uniqueBrandings: string[] = Array.from(new Set((campaigns || []).map((c: { branding_text?: string }) => c.branding_text).filter((v: unknown): v is string => typeof v === 'string' && !!v)));

  // Filter campaigns based on selected filters
  const filteredCampaigns = campaigns.filter((c: { country_targeting?: { value?: string[] }, branding_text?: string, is_active?: boolean }) => {
    const countryMatch = countryFilter === ALL || (Array.isArray(c.country_targeting?.value) && c.country_targeting.value.includes(countryFilter));
    const brandingMatch = brandingFilter === ALL || c.branding_text === brandingFilter;
    const statusMatch = statusFilter === ALL || (statusFilter === 'active' ? c.is_active : !c.is_active);
    return countryMatch && brandingMatch && statusMatch;
  });

  // Fetch EUR to USD rate
  const { data: eurToUsdRateData } = useQuery<number>({
    queryKey: ['eur-usd-rate'],
    queryFn: getEurToUsdRate,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    retry: 1,
  });
  const EUR_TO_USD = typeof eurToUsdRateData === 'number' && !isNaN(eurToUsdRateData) ? eurToUsdRateData : 1.10;

  // Aggregate KPIs from reports
  const kpiTotals = useMemo(() => {
    if (!reports || !Array.isArray(reports)) return null;
    return reports.reduce(
      (acc: any, row: any) => {
        const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
        const spend = isEUR ? Number(row.spent ?? row.spend ?? 0) * EUR_TO_USD : Number(row.spent ?? row.spend ?? 0);
        acc.spend += spend;
        acc.impressions += Number(row.impressions ?? 0);
        acc.clicks += Number(row.clicks ?? 0);
        acc.conversions += Number(row.cpa_actions_num ?? 0);
        acc.roasSum += Number(row.roas ?? 0);
        acc.ctrSum += Number(row.ctr ?? 0);
        acc.cpcSum += Number(row.cpc ?? 0);
        acc.cpmSum += Number(row.cpm ?? 0);
        acc.cpaSum += Number(row.cpa ?? row.cpa_clicks ?? 0);
        acc.rows++;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, roasSum: 0, ctrSum: 0, cpcSum: 0, cpmSum: 0, cpaSum: 0, rows: 0 }
    );
  }, [reports, EUR_TO_USD]);

  const kpiCards = [
    {
      key: 'spend',
      title: 'Total Spend',
      value: kpiTotals?.spend || 0,
      format: 'currency',
      icon: <DollarSign className="h-5 w-5 text-primary" />, 
      description: 'Total ad spend',
    },
    {
      key: 'impressions',
      title: 'Impressions',
      value: kpiTotals?.impressions || 0,
      format: 'number',
      icon: <BarChart3 className="h-5 w-5 text-primary" />, 
      description: 'Total ad impressions',
    },
    {
      key: 'clicks',
      title: 'Clicks',
      value: kpiTotals?.clicks || 0,
      format: 'number',
      icon: <MousePointerClick className="h-5 w-5 text-primary" />, 
      description: 'Total ad clicks',
    },
    {
      key: 'conversions',
      title: 'Conversions',
      value: kpiTotals?.conversions || 0,
      format: 'number',
      icon: <Target className="h-5 w-5 text-primary" />, 
      description: 'Total conversions',
    },
    {
      key: 'roas',
      title: 'Avg ROAS',
      value: kpiTotals && kpiTotals.rows > 0 ? kpiTotals.roasSum / kpiTotals.rows : 0,
      format: 'number',
      icon: <TrendingUp className="h-5 w-5 text-primary" />, 
      description: 'Average Return on Ad Spend',
    },
    {
      key: 'cpc',
      title: 'Avg CPC',
      value: kpiTotals && kpiTotals.rows > 0 ? kpiTotals.cpcSum / kpiTotals.rows : 0,
      format: 'currency',
      icon: <Divide className="h-5 w-5 text-primary" />, 
      description: 'Average cost per click',
    },
    {
      key: 'cpm',
      title: 'Avg CPM',
      value: kpiTotals && kpiTotals.rows > 0 ? kpiTotals.cpmSum / kpiTotals.rows : 0,
      format: 'currency',
      icon: <Percent className="h-5 w-5 text-primary" />, 
      description: 'Average cost per 1000 impressions',
    },
    {
      key: 'cpa',
      title: 'Avg CPA',
      value: kpiTotals && kpiTotals.rows > 0 ? kpiTotals.cpaSum / kpiTotals.rows : 0,
      format: 'currency',
      icon: <Target className="h-5 w-5 text-primary" />, 
      description: 'Average cost per acquisition',
    },
  ];

  // Build a lookup from campaign ID to campaign object
  const campaignMap = useMemo(() => {
    const map = new Map();
    campaigns.forEach((c: any) => map.set(c.id, c));
    return map;
  }, [campaigns]);

  // Prepare chart data with formatted date
  const spendOverTime = useMemo(() => {
    if (!reports) return [];
    return reports.map((row: any) => {
      const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
      return {
      date: row.date ? formatDate(parseISO(row.date.slice(0, 10)), 'yyyy-MM-dd') : '',
        spend: isEUR ? Number(row.spent ?? row.spend ?? 0) * EUR_TO_USD : Number(row.spent ?? row.spend ?? 0)
      };
    }).filter((d: { date: string; spend: number }) => d.date && !isNaN(d.spend));
  }, [reports, EUR_TO_USD]);

  const conversionsOverTime = useMemo(() => {
    if (!reports) return [];
    return reports.map((row: any) => ({
      date: row.date ? formatDate(parseISO(row.date.slice(0, 10)), 'yyyy-MM-dd') : '',
      conversions: Number(row.cpa_actions_num ?? 0)
    })).filter((d: { date: string; conversions: number }) => d.date && !isNaN(d.conversions));
  }, [reports]);

  // Aggregate spend by branding using campaign info
  const spendByBranding = useMemo(() => {
    if (!reports) return [];
    const map = new Map<string, number>();
    reports.forEach((row: any) => {
      const campaignId = row.campaign_id || row.campaign;
      const campaign = campaignMap.get(campaignId);
      const branding = campaign?.branding_text || 'Unknown';
      const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
      const spend = isEUR ? Number(row.spent ?? row.spend ?? 0) * EUR_TO_USD : Number(row.spent ?? row.spend ?? 0);
      map.set(branding, (map.get(branding) || 0) + spend);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    const total = arr.reduce((sum, item) => sum + item.value, 0);
    return arr.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [reports, campaignMap, EUR_TO_USD]);

  // Aggregate spend by country using campaign info
  const spendByCountry = useMemo(() => {
    if (!reports) return [];
    const map = new Map<string, number>();
    reports.forEach((row: any) => {
      const campaignId = row.campaign_id || row.campaign;
      const campaign = campaignMap.get(campaignId);
      const country = Array.isArray(campaign?.country_targeting?.value) && campaign.country_targeting.value.length > 0
        ? campaign.country_targeting.value[0]
        : 'Unknown';
      const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
      const spend = isEUR ? Number(row.spent ?? row.spend ?? 0) * EUR_TO_USD : Number(row.spent ?? row.spend ?? 0);
      map.set(country, (map.get(country) || 0) + spend);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    const total = arr.reduce((sum, item) => sum + item.value, 0);
    return arr.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [reports, campaignMap, EUR_TO_USD]);

  // Alternative: Campaign distribution by country (when spend data is limited)
  const campaignsByCountry = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    const map = new Map<string, number>();
    campaigns.forEach((campaign: any) => {
      const countries = Array.isArray(campaign?.country_targeting?.value) 
        ? campaign.country_targeting.value 
        : [];
      
      if (countries.length === 0) {
        map.set('Unknown', (map.get('Unknown') || 0) + 1);
      } else {
        countries.forEach((country: string) => {
          map.set(country, (map.get(country) || 0) + 1);
        });
      }
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    const total = arr.reduce((sum, item) => sum + item.value, 0);
    return arr.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [campaigns]);

  // Campaign distribution by branding
  const campaignsByBranding = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    const map = new Map<string, number>();
    campaigns.forEach((campaign: any) => {
      const branding = campaign?.branding_text || 'Unknown';
      map.set(branding, (map.get(branding) || 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    const total = arr.reduce((sum, item) => sum + item.value, 0);
    return arr.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [campaigns]);

  // Handlers
  const openDetails = (data: unknown) => {
    setDetailsData(data);
    setDetailsOpen(true);
  };

  // Define relevant columns for campaign reports
  const reportColumns = [
    { key: 'date', label: 'Date', visible: true },
    { key: 'clicks', label: 'Clicks', visible: true },
    { key: 'impressions', label: 'Impressions', visible: true },
    { key: 'conversions', label: 'Conversions', visible: true },
    { key: 'spent', label: 'Spend', visible: true },
    { key: 'roas', label: 'ROAS', visible: true },
    { key: 'ctr', label: 'CTR', visible: true },
    { key: 'cpa', label: 'CPA', visible: true },
    { key: 'currency', label: 'Currency', visible: true },
  ];

  function formatReportRow(row: any) {
    return {
      date: row.date || '-',
      clicks: row.clicks ?? '-',
      impressions: row.impressions ?? '-',
      conversions: row.cpa_actions_num ?? '-',
      spent: row.spent ?? row.spend ?? '-',
      roas: row.roas ?? '-',
      ctr: row.ctr ?? '-',
      cpa: row.cpa ?? row.cpa_clicks ?? '-',
      currency: row.currency || '-',
    };
  }

  return (
    <main className="min-h-screen bg-background py-8 px-2 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold mb-2 text-primary flex items-center gap-2">
          <span>Taboola Dashboard</span>
        </h1>
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {repLoading ? (
            kpiCards.map(kpi => (
              <div key={kpi.key} className="h-24 bg-muted rounded animate-pulse" />
            ))
          ) : kpiTotals ? (
            kpiCards.map(kpi => (
              <KPICard
                key={kpi.key}
                title={kpi.title}
                value={kpi.value}
                format={kpi.format as any}
                icon={kpi.icon}
                description={kpi.description}
              />
            ))
          ) : null}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Advertisers</CardTitle>
          </CardHeader>
            {advLoading ? (
            <CardContent className="flex flex-col gap-2 animate-pulse">
              <div className="h-6 bg-muted rounded w-1/3 mb-2" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-muted/50 rounded w-full" />
              ))}
            </CardContent>
            ) : advError ? (
            <CardContent className="bg-red-100 text-red-700 p-3 rounded mb-4">Error loading advertisers: {advError.message}</CardContent>
            ) : advertisers.length === 0 ? (
            <CardContent className="bg-yellow-100 text-yellow-700 p-3 rounded mb-4 flex items-center gap-2"><span>⚠️</span>No advertisers found.</CardContent>
            ) : (
            <CardContent>
              <div className="mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search advertisers..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border px-2 py-1 rounded text-sm w-full max-w-xs"
                />
              </div>
              <ScrollArea className="max-h-64">
                <ul className="space-y-1">
              {advertisers.map((adv: any) => (
                    <li key={adv.account_id}>
                      <button
                        className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded transition border ${selectedAdvertiser === adv.account_id ? 'bg-primary/10 border-primary text-primary font-bold' : 'hover:bg-muted border-transparent'}`}
                  onClick={() => setSelectedAdvertiser(adv.account_id)}
                      >
                        <User className="h-4 w-4" />
                        <span className="font-medium truncate">{adv.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground truncate">ID: {adv.account_id}</span>
                        {selectedAdvertiser === adv.account_id && <Badge variant="default" className="ml-auto flex items-center gap-1"><CheckCircle className="h-3 w-3" />Selected</Badge>}
                      </button>
                    </li>
              ))}
                </ul>
              </ScrollArea>
          </CardContent>
          )}
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <AreaChart
            data={spendOverTime}
            title="Spend Over Time"
            description="How your spend changes over the selected period."
            dataKey="spend"
            xAxisDataKey="date"
            color="#4F8A8B"
            yAxisFormatter={formatCurrency}
          />
          <AreaChart
            data={conversionsOverTime}
            title="Conversions Over Time"
            description="How your conversions change over the selected period."
            dataKey="conversions"
            xAxisDataKey="date"
            color="#F08A5D"
            yAxisFormatter={formatNumber}
          />
          
        </div>
        
        {/* Additional Campaign Distribution Charts */}
        {(campaignsByCountry.length > 0 || campaignsByBranding.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {campaignsByBranding.length > 0 && (
              <PieChart
                data={campaignsByBranding}
                title="Campaigns by Branding"
                description="Distribution of campaigns by branding text."
                dataKey="value"
                nameKey="name"
                valueKey="value"
              />
            )}
            {campaignsByCountry.length > 0 && (
              <PieChart
                data={campaignsByCountry}
                title="Campaigns by Country"
                description="Distribution of campaigns by country targeting."
                dataKey="value"
                nameKey="name"
                valueKey="value"
              />
            )}
          </div>
        )}
        {/* Advertisers - redesigned like MarketersList */}
       
        {/* Campaigns */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4 items-center">
              <div>
                <label className="block text-xs font-medium mb-1">Country</label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All countries</SelectItem>
                    {uniqueCountries.map((c: string) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Branding</label>
                <Select value={brandingFilter} onValueChange={setBrandingFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All brandings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All brandings</SelectItem>
                    {uniqueBrandings.map((b: string) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Table */}
            {campLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Loading campaigns...
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedAdvertiser ? `Fetching campaigns for selected advertiser...` : 'Please select an advertiser first'}
                </div>
              </div>
            ) : campError ? (
              <div className="text-red-600">Error: {campError.message}</div>
            ) : !selectedAdvertiser ? (
              <div className="text-muted-foreground">Please select an advertiser to view campaigns.</div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-muted-foreground">No campaigns found for this advertiser.</div>
            ) : (
              <DataTable
                data={filteredCampaigns.map(formatCampaignRow)}
                columns={campaignColumns}
                onColumnToggle={() => {}}
                searchable={true}
                filterable={false}
                exportable={true}
                expandable={true}
                onRowToggle={id => {
                  const camp = campaigns.find((c: any) => c.id === id);
                  if (camp) openDetails(camp);
                }}
              />
            )}
          </CardContent>
        </Card>
        {/* Conversion Rules */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Conversion Rules</CardTitle>
          </CardHeader>
          <CardContent>
            {convLoading ? (
              <div className="animate-pulse">Loading conversion rules...</div>
            ) : convError ? (
              <div className="text-red-600">Error: {convError.message}</div>
            ) : conversionRules.length === 0 ? (
              <div className="text-muted-foreground">No conversion rules found.</div>
            ) : (
              <DataTable
                data={conversionRules.map(formatConversionRuleRow)}
                columns={conversionRuleColumns}
                onColumnToggle={() => {}}
                searchable={true}
                filterable={false}
                exportable={true}
                expandable={true}
                onRowToggle={id => {
                  const rule = conversionRules.find((r: any) => r.id === id);
                  if (rule) openDetails(rule);
                }}
              />
            )}
          </CardContent>
        </Card>
        {/* Campaign Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4 items-center">
              <div>
                <label className="block text-xs font-medium mb-1">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[160px] justify-start text-left">
                      {reportFrom ? format(reportFrom, 'yyyy-MM-dd') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <Calendar
                      mode="single"
                      selected={reportFrom}
                      onSelect={date => date && setReportDateRange(r => ({ ...r, from: date }))}
                      initialFocus
                      toDate={reportTo}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[160px] justify-start text-left">
                      {reportTo ? format(reportTo, 'yyyy-MM-dd') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <Calendar
                      mode="single"
                      selected={reportTo}
                      onSelect={date => date && setReportDateRange(r => ({ ...r, to: date }))}
                      initialFocus
                      fromDate={reportFrom}
                      toDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {repLoading ? (
              <div className="animate-pulse">Loading campaign reports...</div>
            ) : repError ? (
              <div className="text-red-600">Error: {repError.message}</div>
            ) : reports.length === 0 ? (
              <div className="text-muted-foreground">No campaign reports found.</div>
            ) : (
              <DataTable
                data={reports.map(formatReportRow)}
                columns={reportColumns}
                onColumnToggle={() => {}}
                searchable={true}
                filterable={false}
                exportable={true}
                expandable={true}
                onRowToggle={id => {
                  const rep = reports.find((r: any) => r.id === id || r.campaign === id);
                  if (rep) openDetails(rep);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
      {/* Details Modal (Sheet) */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="max-w-md w-full">
          <SheetHeader>
            <SheetTitle>Details</SheetTitle>
          </SheetHeader>
          <pre className="text-xs mt-4 bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(detailsData, null, 2)}</pre>
        </SheetContent>
      </Sheet>
    </main>
  );
} 