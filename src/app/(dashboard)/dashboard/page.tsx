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
import { DashboardFilters, AdSpendEntry } from "@/lib/types";
import { addYears, format } from "date-fns";
import { Globe, History, Package, DollarSign, Target, Users } from "lucide-react";
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
import { useCogsStore } from "@/lib/cogsStore";
import { useDateRangeStore } from "@/lib/dateRangeStore";
import { useOpexStore } from "@/lib/opexStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePaymentFeeStore } from "@/lib/paymentFeeStore";
import type { Order } from '@/lib/types';
interface OrderWithPaySource extends Order {
  paySource: string;
}

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
  const { from, to, setDateRange, load: loadDateRange } = useDateRangeStore();
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
    queryKey: ["taboola", { from, to }],
    queryFn: async () => {
      const res = await fetch(`/api/taboola?fromDate=${from}&toDate=${to}`);
      if (!res.ok) return [];
      const raw = await res.json();
      return Array.isArray(raw) ? raw : (raw.results || raw.rows || []);
    },
  });
  const { data: adupData } = useQuery<any[]>({
    queryKey: ["adup", { from, to }],
    queryFn: async () => {
      const res = await fetch(`/api/adup?fromDate=${from}&toDate=${to}`);
      if (!res.ok) return [];
      const raw = await res.json();
      return Array.isArray(raw) ? raw : (raw.results || raw.rows || []);
    },
  });
  const { data: outbrainData } = useQuery<any[]>({
    queryKey: ["outbrain", { from, to }],
    queryFn: async () => {
      const res = await fetch(`/api/outbrain/performance?from=${from}&to=${to}`);
      if (!res.ok) return [];
      const raw = await res.json();
      return Array.isArray(raw) ? raw : (raw.results || raw.rows || []);
    },
  });
  const { data: ordersData } = useQuery<Order[]>({
    queryKey: ["orders", { from, to }],
    queryFn: async () => {
      const res = await fetch(`/api/checkoutchamp?startDate=${from}&endDate=${to}`);
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
  function normalizeOrder(entry: any): OrderWithPaySource | undefined {
    const isEUR = entry.currencyCode === 'EUR' || entry.currencySymbol === '€';
    // Exclude partial orders
    if (entry.orderStatus !== 'COMPLETE') return undefined;
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
      items: entry.items || {},
      paySource: typeof entry.paySource === 'string' ? entry.paySource : (entry.paySource ? String(entry.paySource) : ''),
    };
  }
  const allOrders: OrderWithPaySource[] = Array.isArray(ordersData)
    ? ordersData.map(normalizeOrder).filter((o): o is OrderWithPaySource => o !== undefined)
    : [];

  // Define KPIs from raw orders at the top-level scope
  const kpiGrossRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  // Calculate Payment Fees for CheckoutChamp orders only (9% for PayPal, 3% for credit card)
  console.log('Dashboard Payment Fee Orders:', allOrders);
  const totalPaymentFees = allOrders.reduce((sum, o) => {
    let feeRate = 0.03;
    if (o.paymentMethod && o.paymentMethod.toLowerCase().includes('paypal')) {
      feeRate = 0.09;
    }
    return sum + ((o.usdAmount || 0) * feeRate);
  }, 0);
  // Net Revenue = Gross Revenue - Payment Fees
  const kpiNetRevenue = kpiGrossRevenue - totalPaymentFees;
  const kpiRefunds = allOrders.reduce((sum, o) => sum + (o.refund || 0), 0);
  const kpiChargebacks = allOrders.reduce((sum, o) => sum + (o.chargeback || 0), 0);
  const kpiTotalOrders = allOrders.length;

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
    const allOrders: OrderWithPaySource[] = Array.isArray(ordersData)
      ? ordersData.map(normalizeOrder).filter((o): o is OrderWithPaySource => o !== undefined)
      : [];
    return calculateKPIs(allOrders, allAdSpend, skuCosts, fixedExpenses, EUR_TO_USD);
  }, [ordersData, taboolaData, adupData, outbrainData, productsData, skuCosts, fixedExpenses, EUR_TO_USD]);

  const { totalCogs } = useCogsStore();
  // Only destructure opex, setOpex, loadOpex, saveOpex ONCE here:
  const { opex, setOpex, loadOpex, saveOpex } = useOpexStore();
  const [opexDialogOpen, setOpexDialogOpen] = useState(false);
  const [opexInput, setOpexInput] = useState(opex);
  useEffect(() => { loadOpex(); setOpexInput(opex); }, [loadOpex, opex]);
  console.log('OPEX value from store:', opex);

  // Remove COGS and OPEX from KPI cards
  const kpis = kpiResults ? [
    { key: "Gross Revenue", value: kpiGrossRevenue, format: "currency" },
    { key: "Refund Total", value: kpiResults.refundTotal, format: "currency" },
    { key: "Chargeback Total", value: kpiChargebacks, format: "currency" },
    { key: "Refund Rate", value: kpiResults.refundRate, format: "percentage" },
    { key: "Chargeback Rate", value: kpiResults.chargebackRate, format: "percentage" },
    { key: "Net Revenue", value: kpiNetRevenue, format: "currency" },
    { key: "COGS", value: totalCogs, format: "currency" }, // <-- Add COGS card
    { key: "OPEX", value: kpiResults.opex, format: "currency" }, // <-- Add OPEX card
    { key: "Marketing Spend", value: kpiResults.marketingSpend, format: "currency" },
    { key: "Net Profit", value: kpiResults.netProfit, format: "currency" },
    { key: "ROAS", value: kpiResults.roas, format: "number" },
    { key: "Cost Per Customer", value: kpiResults.costPerCustomer, format: "currency" },
    { key: "Upsell Rate", value: kpiResults.upsellRate, format: "percentage" },
    { key: "AOV", value: kpiResults.aov, format: "currency" },
  ] : [];

  // Net Profit calculation for new KPI card
  let calculatedNetProfit = 0;
  if (kpiResults) {
    calculatedNetProfit = kpiNetRevenue - totalCogs - opex - (kpiResults.marketingSpend ?? 0);
  }

  // Updated COGS calculation logic
  function calculateCOGS(orders: OrderWithPaySource[], skuCosts: any[]): number {
    let totalCogs = 0;
    for (const order of orders) {
      if (!order.items || typeof order.items !== 'object') continue;
      for (const item of Object.values(order.items)) {
        if (item && (item.productType === 'OFFER' || item.productType === 'UPSALE')) {
          const sku = (item.productSku || '').trim().toUpperCase();
          const skuCost = skuCosts.find(cost => cost.sku === sku);
          if (skuCost) {
            totalCogs += skuCost.unitCogs + skuCost.shippingCost + (skuCost.handlingFee || 0);
          }
        }
      }
    }
    return totalCogs;
  }

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
  useEffect(() => { loadDateRange(); }, [loadDateRange]);

  // Payment Processing Fee calculation using global store
  const { feePercentages, setFeePercentage, loadFees, saveFee } = usePaymentFeeStore();
  // When mapping/normalizing orders for display/calculation, add paySource property
  const mappedOrders: OrderWithPaySource[] = allOrders.map((o: any) => ({
    ...o,
    paySource: o.paySource || o.paymentMethod || '-',
  }));

  // Ensure default fee for 'creditcard' is 3% if not set
  useEffect(() => {
    if (feePercentages['creditcard'] === undefined) {
      setFeePercentage('creditcard', 3);
    }
  }, [feePercentages, setFeePercentage]);
  // Use mappedOrders instead of orders in all payment fee calculations and UI
  const totalPaymentProcessingFees = mappedOrders.reduce((sum, o) => {
    const paySource = (o.paySource || '-').toLowerCase();
    let feePercent = 0;
    if (feePercentages[paySource] !== undefined) {
      feePercent = feePercentages[paySource];
    } else {
      const found = Object.keys(feePercentages).find(key => paySource.includes(key));
      if (found) feePercent = feePercentages[found];
    }
    return sum + ((o.usdAmount || 0) * (feePercent / 100));
  }, 0);

  // Unique payment methods and their order counts
  const paymentMethodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mappedOrders.forEach((o) => {
      const method = (o.paySource || '-').toString();
      if (!counts[method]) counts[method] = 0;
      counts[method] += 1;
    });
    return Object.entries(counts).map(([method, count]) => ({ method, count }));
  }, [mappedOrders]);

  // Dialog state for payment processing fee breakdown
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);

  useEffect(() => {
    loadFees();
    loadOpex();
  }, [loadFees, loadOpex]);

  return (
    <div className="container-responsive space-y-6">
      {/* Fixed Expenses Input Card */}
     

      {/* Existing Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-center">
          {/* Quick Date Range Filters */}
          <div className="flex gap-2 mb-2">
            {[
              { label: 'Today', getRange: () => { const t = new Date(); return { from: format(t, 'yyyy-MM-dd'), to: format(t, 'yyyy-MM-dd') }; } },
              { label: 'Yesterday', getRange: () => { const t = new Date(); t.setDate(t.getDate() - 1); return { from: format(t, 'yyyy-MM-dd'), to: format(t, 'yyyy-MM-dd') }; } },
              { label: 'This Week', getRange: () => { const t = new Date(); const day = t.getDay() || 7; const from = new Date(t); from.setDate(t.getDate() - day + 1); return { from: format(from, 'yyyy-MM-dd'), to: format(t, 'yyyy-MM-dd') }; } },
              { label: 'Last Week', getRange: () => { const t = new Date(); const day = t.getDay() || 7; const lastWeekEnd = new Date(t); lastWeekEnd.setDate(t.getDate() - day); const lastWeekStart = new Date(lastWeekEnd); lastWeekStart.setDate(lastWeekEnd.getDate() - 6); return { from: format(lastWeekStart, 'yyyy-MM-dd'), to: format(lastWeekEnd, 'yyyy-MM-dd') }; } },
              { label: 'This Month', getRange: () => { const t = new Date(); const from = new Date(t.getFullYear(), t.getMonth(), 1); return { from: format(from, 'yyyy-MM-dd'), to: format(t, 'yyyy-MM-dd') }; } },
              { label: 'Last Month', getRange: () => { const t = new Date(); const from = new Date(t.getFullYear(), t.getMonth() - 1, 1); const to = new Date(t.getFullYear(), t.getMonth(), 0); return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') }; } },
            ].map(({ label, getRange }) => (
              <Button key={label} size="sm" variant="secondary" onClick={() => setDateRange(getRange().from, getRange().to)}>{label.toUpperCase()}</Button>
            ))}
          </div>
          {/* Start Date Calendar in Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-start text-left">
                {from ? format(new Date(from), 'yyyy-MM-dd') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={from ? new Date(from) : undefined}
                onSelect={date => date && setDateRange(date.toISOString().slice(0, 10), to)}
                initialFocus
                toDate={to ? new Date(to) : undefined}
              />
            </PopoverContent>
          </Popover>
          {/* End Date Calendar in Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-start text-left">
                {to ? format(new Date(to), 'yyyy-MM-dd') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={to ? new Date(to) : undefined}
                onSelect={date => date && setDateRange(from, date.toISOString().slice(0, 10))}
                initialFocus
                fromDate={from ? new Date(from) : undefined}
                toDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
      {/* KPI Cards - Grouped Modern Layout with All KPIs */}
      {/* Group 1: Revenue & Profitability */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-300" />
            <CardTitle className="text-base">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={"font-semibold " + (kpiGrossRevenue > 0 ? "text-green-500" : "text-red-500")}>{formatCurrency(kpiGrossRevenue)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <CardTitle className="text-base">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={calculatedNetProfit > 0 ? "text-green-500" : calculatedNetProfit < 0 ? "text-red-500" : ""}>{formatCurrency(calculatedNetProfit)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{kpiGrossRevenue > 0 ? ((calculatedNetProfit / kpiGrossRevenue) * 100).toFixed(2) + '%' : '-'}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TargetIcon className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={((kpiResults?.roas ?? 0) > 1 ? "text-green-500" : (kpiResults?.roas ?? 0) < 1 ? "text-red-500" : "")}>{formatNumber(kpiResults?.roas ?? 0)}x</span>
          </CardContent>
        </Card>
      </div>
      {/* Group 2: Cost & Spend */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 my-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TargetIcon className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">Cost per Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{formatCurrency(kpiResults?.costPerCustomer ?? 0)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-300" />
            <CardTitle className="text-base">Total Marketing Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{formatCurrency(kpiResults?.marketingSpend ?? 0)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-base">Total COGS</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{formatCurrency(totalCogs ?? 0)}</span>
          </CardContent>
        </Card>
        {/* OPEX KPI Card and Dialog */}
        <Dialog open={opexDialogOpen} onOpenChange={setOpexDialogOpen}>
          <DialogTrigger asChild>
            <Card onClick={() => setOpexDialogOpen(true)} className="cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                <CardTitle className="text-base">Total Opex</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <span className={opex > 0 ? "text-red-500 font-semibold" : ""}>${opex.toLocaleString()}</span>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit OPEX Value</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <label className="text-sm">OPEX Value ($)</label>
              <Input type="number" value={opexInput} onChange={e => setOpexInput(Number(e.target.value))} />
              <Button onClick={() => { saveOpex(opexInput); setOpex(opexInput); setOpexDialogOpen(false); }}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Card
          onClick={() => setOpenPaymentDialog(true)}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          tabIndex={0}
          role="button"
          aria-label="Show payment processing fee breakdown"
        >
          <CardHeader className="flex flex-row items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">Total Payment Processing Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={totalPaymentProcessingFees > 0 ? "text-red-500 font-semibold" : ""}>{formatCurrency(totalPaymentProcessingFees)}</span>
          </CardContent>
        </Card>
      </div>
      {/* Dialog for payment method breakdown */}
      <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Methods Fee Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {paymentMethodCounts.length === 0 ? (
              <div className="text-muted-foreground">No payment methods found.</div>
            ) : (
              <ul className="space-y-2">
                {paymentMethodCounts.map(({ method }) => {
                  const key = method.toLowerCase();
                  const value = feePercentages[key] ?? 0;
                  return (
                    <li key={method} className="flex items-center gap-4 border-b pb-2">
                      <span className="font-medium w-32">{method}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={value}
                        onChange={e => { setFeePercentage(method, Number(e.target.value)); saveFee(method, Number(e.target.value)); }}
                        className="w-20 border rounded px-2 py-1 text-right"
                        aria-label={`Set fee for ${method}`}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="pt-4 border-t mt-4 flex items-center gap-2">
              <span className="font-semibold">Total Payment Processing Fee:</span>
              <span className={totalPaymentProcessingFees > 0 ? "text-red-500 font-semibold" : ""}>{formatCurrency(totalPaymentProcessingFees)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Group 3: Orders & AOV */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{formatNumber(kpiTotalOrders)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TargetIcon className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">Upsell Take Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{kpiTotalOrders > 0 ? ((allOrders.filter(o => o.upsell).length / kpiTotalOrders) * 100).toFixed(2) + '%' : '-'}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TargetIcon className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">AOV</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{kpiTotalOrders > 0 ? formatCurrency(kpiGrossRevenue / kpiTotalOrders) : '-'}</span>
          </CardContent>
        </Card>
      </div>
      {/* Group 4: Refunds & Chargebacks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <CardTitle className="text-base">Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{formatCurrency(kpiRefunds)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <CardTitle className="text-base">Chargebacks</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{formatCurrency(kpiChargebacks)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <CardTitle className="text-base">Refund & CB Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{kpiGrossRevenue > 0 ? (((kpiRefunds + kpiChargebacks) / kpiGrossRevenue) * 100).toFixed(2) + '%' : '-'}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <CardTitle className="text-base">Revenue Lost (Refunds + CBs)</CardTitle>
          </CardHeader>
          <CardContent>
            <span>{formatCurrency(kpiRefunds + kpiChargebacks)}</span>
          </CardContent>
        </Card>
              </div>
      {/* Chart Section */}
      {/* <Card>
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
      </Card> */}
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
                  {/* <div className="text-xs"><span className="font-medium">Impressions:</span> {formatNumber(aggregateAdPlatform(key).impressions)}</div>
                  <div className="text-xs"><span className="font-medium">Clicks:</span> {formatNumber(aggregateAdPlatform(key).clicks)}</div>*/}
                  <div className="text-xs"><span className="font-medium">Conversions:</span> {formatNumber(aggregateAdPlatform(key).conversions)}</div>
                  <div className="text-xs"><span className="font-medium">CPC:</span> {aggregateAdPlatform(key).clicks > 0 ? formatCurrency(aggregateAdPlatform(key).spend / aggregateAdPlatform(key).clicks) : '-'}</div>
                  <div className="text-xs"><span className="font-medium">ROAS:</span> {(() => { const rows = allAdSpend.filter(a => a.platform === key); const spend = rows.reduce((sum, r) => sum + (r.spend || 0), 0); const revenue = rows.reduce((sum, r) => sum + (r.revenue || 0), 0); return spend > 0 ? (revenue / spend).toFixed(2) + 'x' : '-'; })()}</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-xs"><span className="font-medium">Total Orders:</span> {formatNumber(kpiTotalOrders)}</div>
                  <div className="text-xs"><span className="font-medium">Gross Revenue:</span> {formatCurrency(kpiGrossRevenue)}</div>
                  <div className="text-xs"><span className="font-medium">Chargebacks:</span> {formatCurrency(kpiChargebacks)}</div>
                  <div className="text-xs"><span className="font-medium">Refunds:</span> {formatCurrency(kpiRefunds)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Ad Platform Comparison Visualization */}
      
    </div>
  );
} 