"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { KPICard } from "@/components/dashboard/KPICard";
import { BarChart} from "@/components/dashboard/BarChart";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { DataTable } from "@/components/dashboard/DataTable";
import { formatCurrency, formatPercentage, formatNumber, calculateKPIs } from "@/lib/calculations";
import { DashboardFilters, Order, AdSpendEntry } from "@/lib/types";
import { addYears, format } from "date-fns";
import { Globe, History, Package, DollarSign, Target } from "lucide-react";
import { PieChart } from "@/components/dashboard/PieChart";
import { AreaChart } from "@/components/dashboard/AreaChart";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Target as TargetIcon } from "lucide-react";
import { getEurToUsdRate } from "@/lib/utils";
import { useEffect } from "react";
import { Label } from "@/components/ui/label";

interface FixedExpense {
  date: string;
  category: string;
  amount: number;
}

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

  // State for manual fixed expenses
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([
    { date: new Date().toISOString().slice(0, 10), category: "Rent", amount: 0 },
    { date: new Date().toISOString().slice(0, 10), category: "Utilities", amount: 0 },
    { date: new Date().toISOString().slice(0, 10), category: "Software Subscriptions", amount: 0 },
    { date: new Date().toISOString().slice(0, 10), category: "Employee Salaries", amount: 0 },
    { date: new Date().toISOString().slice(0, 10), category: "Other", amount: 0 },
  ]);

  // Function to update fixed expense
  const updateFixedExpense = (index: number, field: keyof FixedExpense, value: string | number) => {
    const updatedExpenses = [...fixedExpenses];
    updatedExpenses[index] = { ...updatedExpenses[index], [field]: value };
    setFixedExpenses(updatedExpenses);
  };

  // Fetch EUR to USD rate
  const { data: eurToUsdRateData } = useQuery<number>({
    queryKey: ['eur-usd-rate'],
    queryFn: getEurToUsdRate,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    retry: 1,
  });
  const EUR_TO_USD = typeof eurToUsdRateData === 'number' && !isNaN(eurToUsdRateData) ? eurToUsdRateData : 1.10;

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
  // Add a fetch for product cost data
  const { data: productsData } = useQuery<any[]>({
    queryKey: ["products"],
    queryFn: async () => {
      // Use POST as required by the proxy and upstream API
      const res = await fetch(`/api/checkoutchamp/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return [];
      const raw = await res.json();
      // If the response is an object with numeric keys, convert to array
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return Object.values(raw);
      }
      return Array.isArray(raw) ? raw : [];
    },
  });

  // Build SKUCost array for calculateKPIs
  console.log('Product Data:', productsData);
  // Extract the actual product array from the mixed response
  const productArray = Array.isArray(productsData) && productsData[3] && Array.isArray(productsData[3]) 
    ? productsData[3] 
    : [];
  console.log('Extracted Product Array:', productArray);

  const skuCosts = productArray
    .filter((p: any) => p && typeof p === 'object' && ('productSku' in p || 'productId' in p))
    .map((p: any) => ({
      sku: (p.productSku || '').trim().toUpperCase(),
      productId: p.productId ? p.productId.toString().trim() : '',
      unitCogs: Number(p.productCost) || 0,
      shippingCost: Number(p.shippingCost) || 0,
      handlingFee: 0, // If you have a handling fee field, use it here
    }));
  console.log('SKU Costs:', skuCosts);

  // Normalize and group data
  function normalizeAdSpend(entry: any, platform: string): AdSpendEntry {
    // Currency conversion logic
    const isEUR = entry.currencyCode === 'EUR' || entry.currencySymbol === '€';
    let spend = entry.spend ?? entry.spent ?? 0;
    let revenue = entry.revenue ?? entry.conversions_value ?? 0;
    if (platform === "Outbrain") {
      const metrics = entry.metrics || {};
      const meta = entry.metadata || {};
      const budget = entry.budget || {};
      spend = metrics.spend ?? metrics.spent ?? entry.spend ?? entry.spent ?? budget.amount ?? 0;
      revenue = metrics.sumValue ?? metrics.totalSumValue ?? entry.revenue ?? entry.conversions_value ?? 0;
      if (isEUR) {
        spend = spend * EUR_TO_USD;
        revenue = revenue * EUR_TO_USD;
      }
      return {
        platform,
        campaignId: meta.id || entry.campaignId || entry.campaign_id || '-',
        campaignName: meta.name || entry.campaignName || entry.campaign_name || '-',
        spend,
        impressions: metrics.impressions ?? entry.impressions ?? 0,
        clicks: metrics.clicks ?? entry.clicks ?? 0,
        conversions: metrics.conversions ?? metrics.totalConversions ?? entry.conversions ?? 0,
        revenue,
        roas: metrics.roas ?? metrics.totalRoas ?? entry.roas ?? null,
        date: entry.date || meta.startDate || '-',
        country: entry.country || '-',
        device: entry.device || '-',
        adType: entry.adType || meta.creativeFormat || '-',
      };
    }
    if (isEUR) {
      spend = spend * EUR_TO_USD;
      revenue = revenue * EUR_TO_USD;
    }
    return {
      platform,
      campaignId: entry.campaignId || entry.campaign_id || '-',
      campaignName: entry.campaignName || entry.campaign_name || '-',
      spend,
      impressions: entry.impressions ?? entry.visible_impressions ?? 0,
      clicks: entry.clicks ?? 0,
      conversions: entry.conversions ?? entry.cpa_actions_num ?? 0,
      revenue,
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
  // Normalize Checkout Champ orders (forgiving version)
  function normalizeOrder(entry: any): Order {
    const isEUR = entry.currencyCode === 'EUR' || entry.currencySymbol === '€';
    // Get raw values
    let rawTotal = typeof entry.totalAmount === 'number' ? entry.totalAmount : (entry.totalAmount ? Number(entry.totalAmount) : 0);
    let rawUsdAmount = (() => {
      if (typeof entry.usdAmount === 'number' && !isNaN(entry.usdAmount)) return entry.usdAmount;
      if (typeof entry.totalAmount === 'number' && !isNaN(entry.totalAmount)) return entry.totalAmount;
      if (typeof entry.price === 'number' && !isNaN(entry.price)) return entry.price;
      if (typeof entry.totalAmount === 'string' && entry.totalAmount && !isNaN(Number(entry.totalAmount))) return Number(entry.totalAmount);
      if (typeof entry.price === 'string' && entry.price && !isNaN(Number(entry.price))) return Number(entry.price);
      if (entry.items && typeof entry.items === 'object') {
        return Object.values(entry.items).reduce((sum: number, item) => {
          const typedItem = item as { price?: number | string };
          const price = typeof typedItem.price === 'number'
            ? typedItem.price
            : (typeof typedItem.price === 'string' && typedItem.price && !isNaN(Number(typedItem.price)) ? Number(typedItem.price) : 0);
          return sum + price;
        }, 0);
      }
      return 0;
    })();
    if (isEUR) {
      rawTotal = rawTotal * EUR_TO_USD;
      rawUsdAmount = rawUsdAmount * EUR_TO_USD;
    }
    return {
      orderId: typeof entry.orderId === 'string' ? entry.orderId : (entry.orderId ? String(entry.orderId) : ''),
      date: typeof entry.dateCreated === 'string' ? entry.dateCreated : (entry.dateCreated ? String(entry.dateCreated) : ''),
      sku: typeof entry.sku === 'string' ? entry.sku : (entry.sku ? String(entry.sku) : ''),
      quantity: typeof entry.quantity === 'number' ? entry.quantity : (entry.quantity ? Number(entry.quantity) : 1),
      total: rawTotal,
      usdAmount: rawUsdAmount,
      paymentMethod: typeof entry.paymentMethod === 'string' ? entry.paymentMethod : (entry.paymentMethod ? String(entry.paymentMethod) : ''),
      refund: typeof entry.refund === 'number' ? entry.refund : (entry.refund ? Number(entry.refund) : 0),
      chargeback: typeof entry.chargeback === 'number' ? entry.chargeback : (entry.chargeback ? Number(entry.chargeback) : 0),
      upsell: typeof entry.hasUpsell === 'boolean' ? entry.hasUpsell : Boolean(entry.hasUpsell),
      country: typeof entry.country === 'string' ? entry.country : (entry.country ? String(entry.country) : ''),
      brand: typeof entry.brand === 'string' ? entry.brand : (entry.brand ? String(entry.brand) : ''),
    };
  }
  const allOrders: Order[] = Array.isArray(ordersData)
    ? ordersData.map(normalizeOrder)
    : [];

  // Filter by platform if selected
  const filteredAdSpend = selectedPlatform === "all"
    ? allAdSpend
    : allAdSpend.filter((row) => row.platform === selectedPlatform);
  // Orders do not have a platform property, so do not filter by platform
  const filteredOrders = allOrders;

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
  // Calculate all KPIs using the utility for accuracy
  const kpiResults = useMemo(() => {
    if (!ordersData || !taboolaData || !adupData || !outbrainData || !productsData) return null;
    // Combine all ad spend
    const allAdSpend = [
      ...(taboolaData || []).map((entry: any) => normalizeAdSpend(entry, "Taboola")),
      ...(adupData || []).map((entry: any) => normalizeAdSpend(entry, "AdUp")),
      ...(outbrainData || []).map((entry: any) => normalizeAdSpend(entry, "Outbrain")),
    ];
    // Normalize orders
    const allOrders: Order[] = Array.isArray(ordersData)
      ? ordersData.map(normalizeOrder).filter((o): o is Order => o !== null)
      : [];
    return calculateKPIs(allOrders, allAdSpend, skuCosts, fixedExpenses, EUR_TO_USD);
  }, [ordersData, taboolaData, adupData, outbrainData, productsData, skuCosts, fixedExpenses, EUR_TO_USD]);

  // Remove COGS and OPEX from KPI cards
  const kpis = kpiResults ? [
    { key: "Gross Revenue", value: kpiResults.grossRevenue, format: "currency" },
    { key: "Refund Total", value: kpiResults.refundTotal, format: "currency" },
    { key: "Chargeback Total", value: kpiResults.chargebackTotal, format: "currency" },
    { key: "Refund Rate", value: kpiResults.refundRate, format: "percentage" },
    { key: "Chargeback Rate", value: kpiResults.chargebackRate, format: "percentage" },
    { key: "Net Revenue", value: kpiResults.netRevenue, format: "currency" },
    { key: "COGS", value: kpiResults.cogs, format: "currency" }, // <-- Add COGS card
    { key: "OPEX", value: kpiResults.opex, format: "currency" }, // <-- Add OPEX card
    { key: "Marketing Spend", value: kpiResults.marketingSpend, format: "currency" },
    { key: "Net Profit", value: kpiResults.netProfit, format: "currency" },
    { key: "ROAS", value: kpiResults.roas, format: "number" },
    { key: "Cost Per Customer", value: kpiResults.costPerCustomer, format: "currency" },
    { key: "Upsell Rate", value: kpiResults.upsellRate, format: "percentage" },
    { key: "AOV", value: kpiResults.aov, format: "currency" },
  ] : [];

  // Chart data (shared attributes)
  const chartOptions = [
    { key: "spend", label: "Spend" },
    { key: "impressions", label: "Impressions" },
    { key: "clicks", label: "Clicks" },
    { key: "conversions", label: "Conversions" },
  ];
  const [chartMetric, setChartMetric] = useState<string>("spend");
  // Only include ad platforms in the chart (exclude Checkout Champ)
  const AD_PLATFORMS = PLATFORM_CONFIG.filter(p => p.key !== 'CheckoutChamp');
  const chartData = useMemo(() => {
    return AD_PLATFORMS.map(({ key, label }) => {
      const sum = allAdSpend.filter((a) => a.platform === key).reduce((s, a) => s + ((a as Record<string, any>)[chartMetric] || 0), 0);
      return { name: label, value: sum };
    });
  }, [allAdSpend, chartMetric]);

  // Visualization data
  const adPlatformComparison = AD_PLATFORMS.map(p => ({
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
      {/* Fixed Expenses Input Card */}
     

      {/* Existing Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-center">
          {/* Start Date Calendar in Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-start text-left">
                {filters.dateRange.from ? format(new Date(filters.dateRange.from), 'yyyy-MM-dd') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={filters.dateRange.from ? new Date(filters.dateRange.from) : undefined}
                onSelect={date => date && setFilters(f => ({ ...f, dateRange: { ...f.dateRange, from: date.toISOString().slice(0, 10) } }))}
                initialFocus
                toDate={filters.dateRange.to ? new Date(filters.dateRange.to) : undefined}
              />
            </PopoverContent>
          </Popover>
          {/* End Date Calendar in Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-start text-left">
                {filters.dateRange.to ? format(new Date(filters.dateRange.to), 'yyyy-MM-dd') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={filters.dateRange.to ? new Date(filters.dateRange.to) : undefined}
                onSelect={date => date && setFilters(f => ({ ...f, dateRange: { ...f.dateRange, to: date.toISOString().slice(0, 10) } }))}
                initialFocus
                fromDate={filters.dateRange.from ? new Date(filters.dateRange.from) : undefined}
                toDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
      {/* KPI Cards - Grouped Modern Layout with All KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-6">
        {/* Revenue & Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-300" />
            <CardTitle className="text-base">Revenue & Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between"><span>Gross Revenue</span><span className={"font-semibold " + ((kpiResults?.grossRevenue ?? 0) > 0 ? "text-green-500" : "text-red-500")}>{formatCurrency(kpiResults?.grossRevenue ?? 0)}</span></div>
            <div className="flex justify-between"><span>Net Revenue</span><span className={((kpiResults?.netRevenue ?? 0) > 0 ? "text-green-500" : (kpiResults?.netRevenue ?? 0) < 0 ? "text-red-500" : "")}>{formatCurrency(kpiResults?.netRevenue ?? 0)}</span></div>
            <div className="flex justify-between"><span>Marketing Spend</span><span className={((kpiResults?.marketingSpend ?? 0) > 0 ? "text-red-500" : "")}>{formatCurrency(kpiResults?.marketingSpend ?? 0)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between"><span>Total Orders</span><span>{formatNumber(kpiResults?.totalOrders ?? 0)}</span></div>
            <div className="flex justify-between"><span>Unique Customers</span><span>{formatNumber(kpiResults?.uniqueCustomers ?? 0)}</span></div>
          </CardContent>
        </Card>
        {/* Refunds & Chargebacks */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <CardTitle className="text-base">Refunds & Chargebacks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between"><span>Refund Total</span><span className="text-red-500 font-semibold">{formatCurrency(kpiResults?.refundTotal ?? 0)}</span></div>
            <div className="flex justify-between"><span>Refund Rate</span><span className="text-red-500 font-semibold">{formatPercentage(kpiResults?.refundRate ?? 0)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between"><span>Chargeback Total</span><span className="text-red-500 font-semibold">{formatCurrency(kpiResults?.chargebackTotal ?? 0)}</span></div>
            <div className="flex justify-between"><span>Chargeback Rate</span><span className="text-red-500 font-semibold">{formatPercentage(kpiResults?.chargebackRate ?? 0)}</span></div>
          </CardContent>
        </Card>
        {/* Cost Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between"><span>Payment Fees</span><span className={((kpiResults?.paymentFees ?? 0) > 0 ? "text-red-500" : "")}>{formatCurrency(kpiResults?.paymentFees ?? 0)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold"><span>Net Profit</span><span className={((kpiResults?.netProfit ?? 0) > 0 ? "text-green-500" : (kpiResults?.netProfit ?? 0) < 0 ? "text-red-500" : "")}>{formatCurrency(kpiResults?.netProfit ?? 0)}</span></div>
          </CardContent>
        </Card>
        {/* Customer Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TargetIcon className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">Customer Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between"><span>Cost per Customer</span><span className={((kpiResults?.costPerCustomer ?? 0) > 0 ? "text-red-500" : "")}>{formatCurrency(kpiResults?.costPerCustomer ?? 0)}</span></div>
            <div className="flex justify-between"><span>Upsell Rate</span><span className={((kpiResults?.upsellRate ?? 0) > 0 ? "text-green-500" : "")}>{formatPercentage(kpiResults?.upsellRate ?? 0)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between"><span>ROAS</span><span className={((kpiResults?.roas ?? 0) > 1 ? "text-green-500" : (kpiResults?.roas ?? 0) < 1 ? "text-red-500" : "")}>{formatNumber(kpiResults?.roas ?? 0)}x</span></div>
            <div className="flex justify-between"><span>AOV</span><span className={((kpiResults?.aov ?? 0) > 0 ? "text-green-500" : "")}>{formatCurrency(kpiResults?.aov ?? 0)}</span></div>
          </CardContent>
        </Card>
        {/* COGS KPI Card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-base">COGS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between"><span>Total COGS</span><span className={((kpiResults?.cogs ?? 0) > 0 ? "text-red-500" : "")}>{formatCurrency(kpiResults?.cogs ?? 0)}</span></div>
            <div className="flex justify-between"><span>Average COGS</span><span className={((kpiResults?.averageCogs ?? 0) > 0 ? "text-red-500" : "")}>{formatCurrency(kpiResults?.averageCogs ?? 0)}</span></div>
          </CardContent>
        </Card>
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
              </TabsList>
            </Tabs>
          </div>
          {chartType === "bar" && <BarChart data={chartData} dataKey="value" xAxisDataKey="name" />}
          {chartType === "pie" && <PieChart data={chartData} />}
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
                (() => {
                  // Use normalized Checkout Champ orders only
                  const checkoutChampOrders = allOrders;
                  const totalOrders = checkoutChampOrders.length;
                  const grossRevenue = checkoutChampOrders.reduce((sum, o) => sum + (o.usdAmount || 0), 0);
                  const chargebacks = checkoutChampOrders.reduce((sum, o) => sum + (o.chargeback || 0), 0);
                  const upsellOrders = checkoutChampOrders.filter(o => o.upsell).length;
                  return (
                <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="text-xs"><span className="font-medium">Total Orders:</span> {formatNumber(totalOrders)}</div>
                      <div className="text-xs"><span className="font-medium">Gross Revenue:</span> {formatCurrency(grossRevenue)}</div>
                      <div className="text-xs"><span className="font-medium">Chargebacks:</span> {formatCurrency(chargebacks)}</div>
                      <div className="text-xs"><span className="font-medium">Upsell Orders:</span> {formatNumber(upsellOrders)}</div>
                </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Ad Platform Comparison Visualization */}
      
    </div>
  );
} 