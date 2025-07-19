"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { KPICard } from "@/components/dashboard/KPICard";
import { BarChart} from "@/components/dashboard/BarChart";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { DataTable } from "@/components/dashboard/DataTable";
import { formatCurrency, formatPercentage, formatNumber } from "@/lib/calculations";
import { DashboardFilters, Order, AdSpendEntry } from "@/lib/types";
import { addYears, format } from "date-fns";
import { Globe, History, Package, DollarSign, Target } from "lucide-react";
import { PieChart } from "@/components/dashboard/PieChart";
import { AreaChart } from "@/components/dashboard/AreaChart";

const PLATFORM_CONFIG = [
  { key: "Taboola", label: "Taboola", icon: History },
  { key: "Outbrain", label: "Outbrain", icon: Globe },
  { key: "AdUp", label: "AdUp", icon: Package },
  { key: "CheckoutChamp", label: "Checkout Champ", icon: DollarSign },
];

export default function DashboardPage() {
  // Default date range: 1 year
  const today = new Date();
  const oneYearAgo = addYears(today, -1);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: format(oneYearAgo, "yyyy-MM-dd"),
      to: format(today, "yyyy-MM-dd"),
    },
  });
  const [chartType, setChartType] = useState<"bar" | "pie" | "area">("bar");
  const [selectedPlatform, setSelectedPlatform] = useState<string | "all">("all");

  // Fetch all data using React Query
  const { data: taboolaData } = useQuery<any[]>({
    queryKey: ["taboola", filters],
    queryFn: async () => {
      const res = await fetch(`/api/taboola?fromDate=${filters.dateRange.from}&toDate=${filters.dateRange.to}`);
      if (!res.ok) return [];
      const raw = await res.json();
      return Array.isArray(raw) ? raw : (raw.results || raw.rows || []);
    },
  });
  const { data: adupData } = useQuery<any[]>({
    queryKey: ["adup", filters],
    queryFn: async () => {
      const res = await fetch(`/api/adup?fromDate=${filters.dateRange.from}&toDate=${filters.dateRange.to}`);
      if (!res.ok) return [];
      const raw = await res.json();
      return Array.isArray(raw) ? raw : (raw.results || raw.rows || []);
    },
  });
  const { data: outbrainData } = useQuery<any[]>({
    queryKey: ["outbrain", filters],
    queryFn: async () => {
      const res = await fetch(`/api/outbrain/performance?from=${filters.dateRange.from}&to=${filters.dateRange.to}`);
      if (!res.ok) return [];
      const raw = await res.json();
      return Array.isArray(raw) ? raw : (raw.results || raw.rows || []);
    },
  });
  const { data: ordersData } = useQuery<Order[]>({
    queryKey: ["orders", filters],
    queryFn: async () => {
      const res = await fetch(`/api/checkoutchamp?startDate=${filters.dateRange.from}&endDate=${filters.dateRange.to}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    },
  });

  // Normalize and group data
  function normalizeAdSpend(entry: any, platform: string): AdSpendEntry {
    if (platform === "Outbrain") {
      // Handle deeply nested structure
      const metrics = entry.metrics || {};
      const meta = entry.metadata || {};
      const budget = entry.budget || {};
      return {
        platform,
        campaignId: meta.id || entry.campaignId || entry.campaign_id || '-',
        campaignName: meta.name || entry.campaignName || entry.campaign_name || '-',
        spend: metrics.spend ?? metrics.spent ?? entry.spend ?? entry.spent ?? budget.amount ?? 0,
        impressions: metrics.impressions ?? entry.impressions ?? 0,
        clicks: metrics.clicks ?? entry.clicks ?? 0,
        conversions: metrics.conversions ?? metrics.totalConversions ?? entry.conversions ?? 0,
        revenue: metrics.sumValue ?? metrics.totalSumValue ?? entry.revenue ?? entry.conversions_value ?? 0,
        roas: metrics.roas ?? metrics.totalRoas ?? entry.roas ?? null,
        date: entry.date || meta.startDate || '-',
        country: entry.country || '-',
        device: entry.device || '-',
        adType: entry.adType || meta.creativeFormat || '-',
      };
    }
    // Default/other platforms
    return {
      platform,
      campaignId: entry.campaignId || entry.campaign_id || '-',
      campaignName: entry.campaignName || entry.campaign_name || '-',
      spend: entry.spend ?? entry.spent ?? 0,
      impressions: entry.impressions ?? entry.visible_impressions ?? 0,
      clicks: entry.clicks ?? 0,
      conversions: entry.conversions ?? entry.cpa_actions_num ?? 0,
      revenue: entry.revenue ?? entry.conversions_value ?? 0,
      roas: entry.roas ?? null,
      date: entry.date || '-',
      country: entry.country || '-',
      device: entry.device || '-',
      adType: entry.adType || '-',
    };
  }
  const allAdSpend = [
    ...(taboolaData || []).map((entry: any) => normalizeAdSpend(entry, "Taboola")),
    ...(adupData || []).map((entry: any) => normalizeAdSpend(entry, "AdUp")),
    ...(outbrainData || []).map((entry: any) => normalizeAdSpend(entry, "Outbrain")),
  ];
  // Normalize Checkout Champ orders
  function normalizeOrder(entry: any): Record<string, any> {
    return {
      orderId: entry.orderId || entry.id || '-',
      total: entry.totalAmount ? parseFloat(entry.totalAmount) : 0,
      refund: entry.refund || 0,
      chargeback: entry.chargeback || 0,
      upsell: entry.hasUpsell || false,
      date: entry.dateCreated || entry.createdAt || '-',
    };
  }
  const allOrders: Record<string, any>[] = Array.isArray(ordersData) ? ordersData.map(normalizeOrder) : [];

  // Filter by platform if selected
  const filteredAdSpend = selectedPlatform === "all"
    ? allAdSpend
    : allAdSpend.filter((row) => row.platform === selectedPlatform);
  const filteredOrders = selectedPlatform === "all"
    ? allOrders
    : allOrders.filter((row) => row.platform === selectedPlatform);

  // Aggregate metrics for each platform
  function aggregateAdPlatform(platformKey: string) {
    const rows = allAdSpend.filter(a => a.platform === platformKey);
    return {
      spend: rows.reduce((sum, r) => sum + (r.spend || 0), 0),
      impressions: rows.reduce((sum, r) => sum + (r.impressions || 0), 0),
      clicks: rows.reduce((sum, r) => sum + (r.clicks || 0), 0),
      conversions: rows.reduce((sum, r) => sum + (r.conversions || 0), 0),
    };
  }
  // KPI calculations
  // Gross Revenue: sum of all order totals (only valid numbers)
  const grossRevenue = allOrders.reduce((sum, o) => sum + (typeof o.total === 'number' && !isNaN(o.total) ? o.total : 0), 0);
  // Refunds and chargebacks
  const refundTotal = allOrders.reduce((sum, o) => sum + (o.refund || 0), 0);
  const chargebackTotal = allOrders.reduce((sum, o) => sum + (o.chargeback || 0), 0);
  // Net Revenue: gross revenue minus refunds and chargebacks
  const netRevenue = grossRevenue - refundTotal - chargebackTotal;
  // Marketing Spend: sum of all ad platform spend
  const marketingSpend = PLATFORM_CONFIG.filter(p => p.key !== 'CheckoutChamp').reduce((sum, p) => sum + aggregateAdPlatform(p.key).spend, 0);
  // Net Profit: gross revenue minus marketing spend, refunds, and chargebacks
  const netProfit = grossRevenue - marketingSpend - refundTotal - chargebackTotal;
  // Upsell Orders
  const upsellOrders = allOrders.filter(o => o.upsell).length;
  const totalOrders = allOrders.length;

  // KPI cards
  const kpis = [
    { key: "Gross Revenue", value: grossRevenue, format: "currency" },
    { key: "Refund Total", value: refundTotal, format: "currency" },
    { key: "Chargeback Total", value: chargebackTotal, format: "currency" },
    { key: "Net Revenue", value: netRevenue, format: "currency" },
    { key: "Marketing Spend", value: marketingSpend, format: "currency" },
    { key: "Net Profit", value: netProfit, format: "currency" },
    { key: "Total Orders", value: totalOrders, format: "number" },
    { key: "Upsell Orders", value: upsellOrders, format: "number" },
  ];

  // Chart data (shared attributes)
  const chartOptions = [
    { key: "spend", label: "Spend" },
    { key: "impressions", label: "Impressions" },
    { key: "clicks", label: "Clicks" },
    { key: "conversions", label: "Conversions" },
  ];
  const [chartMetric, setChartMetric] = useState<string>("spend");
  const chartData = useMemo(() => {
    // Combined chart for all platforms
    return PLATFORM_CONFIG.map(({ key, label }) => {
      const sum = allAdSpend.filter((a) => a.platform === key).reduce((s, a) => s + ((a as Record<string, any>)[chartMetric] || 0), 0);
      return { name: label, value: sum };
    });
  }, [allAdSpend, chartMetric]);

  // Visualization data
  const adPlatformComparison = PLATFORM_CONFIG.filter(p => p.key !== 'CheckoutChamp').map(p => ({
    name: p.label,
    spend: aggregateAdPlatform(p.key).spend,
    impressions: aggregateAdPlatform(p.key).impressions,
    clicks: aggregateAdPlatform(p.key).clicks,
    conversions: aggregateAdPlatform(p.key).conversions,
  }));
  // Checkout Champ performance/report time series
  const checkoutChampTimeSeries = allOrders.map(o => ({
    date: o.date,
    revenue: o.total || 0,
    chargeback: o.chargeback || 0,
    refund: o.refund || 0,
    upsell: o.upsell ? 1 : 0,
  }));

  // Filters UI
  return (
    <div className="container-responsive space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-xs font-medium mb-1">Platform</label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORM_CONFIG.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
          <div>
            <label className="block text-xs font-medium mb-1">From</label>
            <Input type="date" value={filters.dateRange.from} onChange={e => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, from: e.target.value } }))} />
        </div>
          <div>
            <label className="block text-xs font-medium mb-1">To</label>
            <Input type="date" value={filters.dateRange.to} onChange={e => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, to: e.target.value } }))} />
            </div>
          </CardContent>
        </Card>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <KPICard key={kpi.key} title={kpi.key} value={kpi.value} format={kpi.format as any} />
        ))}
              </div>
      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Comparison ({chartOptions.find(o => o.key === chartMetric)?.label})</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="flex gap-4 items-center mb-4">
            <Select value={chartMetric} onValueChange={setChartMetric}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartOptions.map(opt => (
                  <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={chartType} onValueChange={v => setChartType(v as any)}>
              <TabsList>
                <TabsTrigger value="bar">Bar</TabsTrigger>
                <TabsTrigger value="pie">Pie</TabsTrigger>
                <TabsTrigger value="area">Area</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {chartType === "bar" && <BarChart data={chartData} dataKey="value" xAxisDataKey="name" />}
          {chartType === "pie" && <PieChart data={chartData} />}
          {chartType === "area" && <AreaChart data={chartData} dataKey="value" xAxisDataKey="name" />}
        </CardContent>
      </Card>
      {/* Platform Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLATFORM_CONFIG.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center gap-2">
              <Icon className="w-5 h-5 text-primary" />
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {key !== 'CheckoutChamp' ? (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-xs"><span className="font-medium">Spend:</span> {formatNumber(aggregateAdPlatform(key).spend)}</div>
                  <div className="text-xs"><span className="font-medium">Impressions:</span> {formatNumber(aggregateAdPlatform(key).impressions)}</div>
                  <div className="text-xs"><span className="font-medium">Clicks:</span> {formatNumber(aggregateAdPlatform(key).clicks)}</div>
                  <div className="text-xs"><span className="font-medium">Conversions:</span> {formatNumber(aggregateAdPlatform(key).conversions)}</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-xs"><span className="font-medium">Total Orders:</span> {formatNumber(totalOrders)}</div>
                  <div className="text-xs"><span className="font-medium">Gross Revenue:</span> {formatNumber(grossRevenue)}</div>
                  <div className="text-xs"><span className="font-medium">Chargebacks:</span> {formatNumber(chargebackTotal)}</div>
                  <div className="text-xs"><span className="font-medium">Upsell Orders:</span> {formatNumber(upsellOrders)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Ad Platform Comparison Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Ad Platform Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={adPlatformComparison} dataKey="spend" xAxisDataKey="name" />
        </CardContent>
      </Card>
      <ExportButton
        onClick={() => {}}
        icon="file"
        className="mt-4"
      >
        Export Data
      </ExportButton>
    </div>
  );
} 