"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, AlertTriangle, Target, Users, BarChart3, Package } from "lucide-react";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { DataTable } from "@/components/dashboard/DataTable";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { DashboardFilters, Order, AdSpendEntry } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart } from '@/components/dashboard/AreaChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { BarChart } from '@/components/dashboard/BarChart';
import { getEurToUsdRate } from '@/lib/utils';

// Enhanced order type with attribution data
interface EnhancedOrder extends Order {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  campaignName?: string;
  funnelReferenceId?: string;
  attributedPlatform?: string;
  attributedSpend?: number;
  roas?: number;
}

const fetchCheckoutChampOrders = async (filters: DashboardFilters): Promise<Order[]> => {
  // Format dates as M/D/YY for the API
  const startDate = new Date(filters.dateRange.from).toLocaleDateString('en-US');
  const endDate = new Date(filters.dateRange.to).toLocaleDateString('en-US');
  const params = new URLSearchParams({
    startDate,
    endDate,
  });
  const res = await fetch(`/api/checkoutchamp?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
};

// Fetch ad spend data from all platforms
const fetchAdSpendData = async (filters: DashboardFilters): Promise<AdSpendEntry[]> => {
  const [from, to] = [filters.dateRange.from, filters.dateRange.to];
  // AdUp report body as required by API
  const adupBody = {
    report_name: "CAMPAIGN_PERFORMANCE_REPORT",
    report_type: "CAMPAIGN_PERFORMANCE_REPORT",
    select: [
      "Month",
      "CampaignName",
      "Clicks",
      "Impressions",
      "Cost",
      "Conversions",
      "Ctr"
    ],
    conditions: [],
    download_format: "JSON",
    date_range_type: "CUSTOM_DATE",
    date_range: {
      min: from,
      max: to
    }
  };
  // Get Taboola account ID from env (local only)
  const accountId = 'growevity-network';
  const [outbrainRes, taboolaRes, adupRes] = await Promise.allSettled([
    fetch(`/api/outbrain/performance?from=${from}&to=${to}`),
    fetch(`/api/taboola/campaigns?account_id=${accountId}&from=${from}&to=${to}`),
    fetch('/api/adup/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adupBody)
    }),
  ]);

  const adSpendData: AdSpendEntry[] = [];

  // Outbrain mapping
  if (outbrainRes.status === 'fulfilled' && outbrainRes.value.ok) {
    const outbrainData = await outbrainRes.value.json();
    if (Array.isArray(outbrainData.results)) {
      adSpendData.push(...outbrainData.results.map((row: any) => ({
        platform: 'Outbrain',
        campaignId: row.metadata?.id,
        campaignName: row.metadata?.name,
        spend: row.metrics?.spend ?? 0,
        clicks: row.metrics?.clicks,
        impressions: row.metrics?.impressions,
        conversions: row.metrics?.conversions,
        roas: row.metrics?.roas,
        marketerId: row.marketerId,
        marketerName: row.marketerName,
        date: row.metadata?.startDate || row.metadata?.date || undefined,
      })));
    }
  }

  // Taboola mapping
  if (taboolaRes.status === 'fulfilled' && taboolaRes.value.ok) {
    const taboolaData = await taboolaRes.value.json();
    if (Array.isArray(taboolaData.results)) {
      adSpendData.push(...taboolaData.results.map((row: any) => ({
        platform: 'Taboola',
        campaignId: row.id,
        campaignName: row.name,
        spend: row.spend ?? 0,
        clicks: row.clicks,
        impressions: row.impressions,
        conversions: row.conversions,
        roas: row.roas,
        advertiserId: row.advertiserId,
        advertiserName: row.advertiserName,
        date: row.date || undefined,
      })));
    }
  }

  // AdUp mapping
  if (adupRes.status === 'fulfilled' && adupRes.value.ok) {
    const adupData = await adupRes.value.json();
    // AdUp may return array or {results: array}
    let adupRows: any[] = [];
    if (Array.isArray(adupData)) {
      adupRows = adupData;
    } else if (adupData && Array.isArray(adupData.results)) {
      adupRows = adupData.results;
    }
    adSpendData.push(...adupRows.map((row: any) => ({
      platform: 'AdUp',
      campaignId: row.campaign_id || row.campaignId,
      campaignName: row.campaign_name || row.campaignName,
      spend: row.spend ?? 0,
      clicks: row.clicks,
      impressions: row.impressions,
      conversions: row.conversions,
      roas: row.roas,
      date: row.date,
    })));
  }

  return adSpendData;
};

// Correlate orders with ad spend data
const correlateOrdersWithAdSpend = (orders: Order[], adSpend: AdSpendEntry[]): EnhancedOrder[] => {
  const knownPlatforms = ['outbrain', 'taboola', 'adup'];
  return orders.map((order: any) => {
    const enhancedOrder: EnhancedOrder = {
      ...order,
      utmSource: order.UTMSource || order.utmSource || null,
      utmMedium: order.UTMMedium || order.utmMedium || null,
      utmCampaign: order.UTMCampaign || order.utmCampaign || null,
      utmTerm: order.UTMTerm || order.utmTerm || null,
      utmContent: order.UTMContent || order.utmContent || null,
      campaignName: order.campaignName || null,
      funnelReferenceId: order.funnelReferenceId || null,
    };

    // 1. Use utmSource for direct attribution if possible
    const utmSource = (enhancedOrder.utmSource || '').toLowerCase();
    if (knownPlatforms.includes(utmSource)) {
      enhancedOrder.attributedPlatform = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
      // Optionally, try to find spend for this platform
      const spendEntry = adSpend.find(spend => spend.platform.toLowerCase() === utmSource);
      if (spendEntry) {
        enhancedOrder.attributedSpend = spendEntry.spend;
        enhancedOrder.roas = (enhancedOrder.usdAmount && spendEntry.spend)
          ? enhancedOrder.usdAmount / spendEntry.spend
          : undefined;
      }
      return enhancedOrder;
    }

    // 2. Otherwise, use existing matching logic
    const matchingAdSpend = adSpend.find(spend => {
      // Match by marketerId/advertiserId if present
      if (order.marketerId && spend.marketerId && order.marketerId === spend.marketerId) return true;
      if (order.advertiserId && spend.advertiserId && order.advertiserId === spend.advertiserId) return true;
      // Match by campaign name (case-insensitive, partial)
      if (order.campaignName && spend.campaignName &&
          order.campaignName.toLowerCase().includes(spend.campaignName.toLowerCase())) return true;
      return false;
    });

    if (matchingAdSpend) {
      enhancedOrder.attributedPlatform = matchingAdSpend.platform;
      enhancedOrder.attributedSpend = matchingAdSpend.spend;
      enhancedOrder.roas = (enhancedOrder.usdAmount && matchingAdSpend.spend)
        ? enhancedOrder.usdAmount / matchingAdSpend.spend
        : undefined;
    }

    return enhancedOrder;
  });
};

export default function CheckoutChampPlatformPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    },
  });

  // Correct useQuery usage: queryKey, queryFn, options
  // If using React Query v3, use this signature:
  const { data: eurToUsdRateData } = useQuery<number>({
    queryKey: ['eur-usd-rate'],
    queryFn: getEurToUsdRate,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    retry: 1,
  });
  const eurToUsdRate: number = typeof eurToUsdRateData === 'number' && !isNaN(eurToUsdRateData) ? eurToUsdRateData : 1.10;

  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery<Order[]>({
    queryKey: ['checkoutchamp-orders', filters],
    queryFn: () => fetchCheckoutChampOrders(filters),
  });

  const { data: adSpendData, isLoading: adSpendLoading, error: adSpendError } = useQuery<AdSpendEntry[]>({
    queryKey: ['ad-spend', filters],
    queryFn: () => fetchAdSpendData(filters),
  });

  // Fetch product cost data for COGS calculation
  const { data: productsData } = useQuery<any[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch(`/api/checkoutchamp/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return [];
      const raw = await res.json();
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return Object.values(raw);
      }
      return Array.isArray(raw) ? raw : [];
    },
  });

  // Extract product cost data
  const productArray = Array.isArray(productsData) && productsData[3] && Array.isArray(productsData[3]) 
    ? productsData[3] 
    : [];

  const skuCosts = productArray
    .filter((p: any) => p && typeof p === 'object' && ('productSku' in p || 'productId' in p))
    .map((p: any) => ({
      sku: (p.productSku || '').trim().toUpperCase(),
      productId: p.productId ? p.productId.toString().trim() : '',
      unitCogs: Number(p.productCost) || 0,
      shippingCost: Number(p.shippingCost) || 0,
      handlingFee: 0,
    }));

  // COGS calculation function
  const calculateCOGS = (orders: Order[]) => {
    let totalCogs = 0;
    orders.forEach(order => {
      if (!order.items) return;
      Object.values(order.items).forEach((item: any) => {
        const itemSku = (item.productSku || '').trim().toUpperCase();
        const itemProductId = (item.productId || '').toString().trim();
        const itemQty = Number(item.qty) || 0;
        // Try to match by SKU first, then by productId
        const skuCost = skuCosts.find(cost =>
          (cost.sku && cost.sku.trim().toUpperCase() === itemSku) ||
          (cost.productId && cost.productId.toString().trim() === itemProductId)
        );
        if (skuCost) {
          // Convert EUR costs to USD using the conversion rate
          const unitCogsUSD = skuCost.unitCogs * eurToUsdRate;
          const shippingCostUSD = skuCost.shippingCost * eurToUsdRate;
          const handlingFeeUSD = (skuCost.handlingFee || 0) * eurToUsdRate;
          const orderCogs = (unitCogsUSD * itemQty) + shippingCostUSD + handlingFeeUSD;
          totalCogs += orderCogs;
        }
      });
    });
    return totalCogs;
  };

  // Ensure data is always arrays
  const orders = Array.isArray(ordersData) ? ordersData : [];
  const adSpend = Array.isArray(adSpendData) ? adSpendData : [];

  // Correlate orders with ad spend
  const enhancedOrders = correlateOrdersWithAdSpend(orders, adSpend);

  // Map API fields to UI fields for calculations and table
  const mappedOrders = enhancedOrders.map((o: any) => {
    // Extract SKUs and upsell info from items
    let sku = '-';
    let upsell = false;
    if (o.items && typeof o.items === 'object') {
      const itemsArr = Object.values(o.items);
      sku = itemsArr.map((item: any) => item.productSku).filter(Boolean).join(', ');
      upsell = itemsArr.some((item: any) => item.productType === 'UPSALE');
    } else if (typeof o.sku === 'string') {
      sku = o.sku;
    }
    // Currency conversion logic
    const isEUR = o.currencyCode === 'EUR' || o.currencySymbol === '€';
    // Use dynamic rate
    const EUR_TO_USD = eurToUsdRate;
    // Get raw values
    const rawTotal = o.totalAmount !== undefined && o.totalAmount !== null ? Number(o.totalAmount) : (o.price !== undefined && o.price !== null ? Number(o.price) : 0);
    const rawUsdAmount = o.usdAmount !== undefined && o.usdAmount !== null ? Number(o.usdAmount) : (o.totalAmount !== undefined && o.totalAmount !== null ? Number(o.totalAmount) : 0);
    // Convert if needed
    const total = isEUR ? rawTotal * EUR_TO_USD : rawTotal;
    const usdAmount = isEUR ? rawUsdAmount * EUR_TO_USD : rawUsdAmount;
    return {
      orderId: o.orderId || o.clientOrderId || '-',
      date: o.dateCreated || '-',
      sku,
      quantity: o.quantity || (o.items ? Object.values(o.items).reduce((sum: number, item: any) => sum + (item.quantity ? Number(item.quantity) : 0), 0) : 1),
      total,
      usdAmount,
      paymentMethod: o.paymentMethod || o.paySource || '-',
      refund: o.refund || 0,
      chargeback: o.chargeback || 0,
      upsell: upsell ? 'Yes' : 'No',
      country: o.country || o.shipCountry || '-',
      brand: o.campaignName || o.campaignCategoryName || '-',
      // Attribution data
      utmSource: o.utmSource || '-',
      utmMedium: o.utmMedium || '-',
      utmCampaign: o.utmCampaign || '-',
      attributedPlatform: o.attributedPlatform || '-',
      attributedSpend: o.attributedSpend || 0,
      roas: o.roas ? `${(o.roas * 100).toFixed(2)}%` : '-',
    };
  });

  // Unique values for filters and popovers
  const uniqueSKUs = Array.from(new Set(
    mappedOrders
      .flatMap((o) => o.sku.split(',').map((sku: string) => sku.trim()))
      .filter((sku) => sku && sku !== '-')
  ));
  const uniquePaymentMethods = Array.from(new Set(mappedOrders.map((o) => o.paymentMethod).filter(Boolean)));
  const uniquePlatforms = Array.from(new Set(mappedOrders.map((o) => o.attributedPlatform).filter(p => p && p !== '-')));

  // Filter state for UI
  const [skuFilter, setSkuFilter] = useState<string>("__ALL__");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("__ALL__");
  const [platformFilter, setPlatformFilter] = useState<string>("__ALL__");

  // Filtered orders for table and KPIs
  const filteredOrders = mappedOrders.filter((o) => {
    const skuList = o.sku.split(',').map((sku: string) => sku.trim());
    const skuMatch = skuFilter === "__ALL__" ? true : skuList.includes(skuFilter);
    const paymentMatch = paymentMethodFilter === "__ALL__" ? true : o.paymentMethod === paymentMethodFilter;
    const platformMatch = platformFilter === "__ALL__" ? true : o.attributedPlatform === platformFilter;
    return skuMatch && paymentMatch && platformMatch;
  });

  // KPI calculations
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.usdAmount || 0), 0);
  const totalOrders = filteredOrders.length;
  const totalRefunds = filteredOrders.reduce((sum, o) => sum + (o.refund || 0), 0);
  const totalChargebacks = filteredOrders.reduce((sum, o) => sum + (o.chargeback || 0), 0);
  const totalUpsells = filteredOrders.filter((o) => o.upsell === 'Yes').length;
  const totalAttributedSpend = filteredOrders.reduce((sum, o) => sum + (o.attributedSpend || 0), 0);
  const averageROAS = totalAttributedSpend > 0 ? (totalRevenue / totalAttributedSpend) : 0;
  const attributedOrders = filteredOrders.filter((o) => o.attributedPlatform !== '-').length;
  // Convert filteredOrders back to Order[] format for COGS calculation
  const ordersForCOGS = filteredOrders.map(o => ({
    ...o,
    upsell: o.upsell === 'Yes'
  })) as Order[];
  const totalCOGS = calculateCOGS(ordersForCOGS);
  const averageCOGS = totalOrders > 0 ? totalCOGS / totalOrders : 0;

  // DataTable columns
  const columns = [
    { key: "orderId", label: "Order ID", visible: true },
    { key: "date", label: "Date", visible: true },
    { key: "sku", label: "SKU", visible: true },
    { key: "quantity", label: "Qty", visible: true },
    { key: "total", label: "Total", visible: true },
    { key: "usdAmount", label: "USD Amount", visible: true },
    { key: "paymentMethod", label: "Payment", visible: true },
    { key: "refund", label: "Refund", visible: true },
    { key: "chargeback", label: "Chargeback", visible: true },
    { key: "upsell", label: "Upsell", visible: true },
    { key: "country", label: "Country", visible: true },
    { key: "brand", label: "Brand", visible: true },
    { key: "utmSource", label: "UTM Source", visible: false },
    { key: "utmMedium", label: "UTM Medium", visible: false },
    { key: "utmCampaign", label: "UTM Campaign", visible: false },
    { key: "attributedPlatform", label: "Attributed Platform", visible: true },
    { key: "attributedSpend", label: "Attributed Spend", visible: true },
    // Removed ROAS column
  ];

  // DataTable column toggle handler
  const [visibleColumns, setVisibleColumns] = useState(columns);
  const handleColumnToggle = (columnKey: string) => {
    setVisibleColumns((prev) =>
      prev.map((col) =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
  };

  // Date range filter handler
  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value,
      },
    }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      dateRange: {
        from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10),
      },
    });
    setSkuFilter("__ALL__");
    setPaymentMethodFilter("__ALL__");
    setPlatformFilter("__ALL__");
  };

  const isLoading = ordersLoading || adSpendLoading;
  const error = ordersError || adSpendError;

  return (
    <div className="container-responsive space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Checkout Champ Orders</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            View and analyze orders from Checkout Champ with ad platform attribution and ROAS analysis.
          </p>
        </div>
       
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards - Modern Grouped Layout */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 my-6">
            {/* Revenue & Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-300" />
                <CardTitle className="text-base">Revenue & Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex justify-between"><span>Total Order Revenue</span><span className={"font-semibold " + (totalRevenue > 0 ? "text-green-500" : "text-red-500")}>{formatCurrency(totalRevenue)}</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between"><span>Total Orders</span><span>{formatNumber(totalOrders)}</span></div>
                <div className="flex justify-between"><span>Upsell Orders</span><span className={totalUpsells > 0 ? "text-green-500" : ""}>{formatNumber(totalUpsells)}</span></div>
              </CardContent>
            </Card>
            {/* Refunds & Chargebacks */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-base">Refunds & Chargebacks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex justify-between"><span>Refunds</span><span className="text-red-500 font-semibold">{formatCurrency(totalRefunds)}</span></div>
                <div className="flex justify-between"><span>Chargebacks</span><span className="text-red-500 font-semibold">{formatCurrency(totalChargebacks)}</span></div>
              </CardContent>
            </Card>
            {/* Attribution */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-base">Attribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex justify-between"><span>Attributed Orders</span><span>{formatNumber(attributedOrders)}</span></div>
                <div className="flex justify-between"><span>Attributed Spend</span><span className={totalAttributedSpend > 0 ? "text-red-500" : ""}>{formatCurrency(totalAttributedSpend)}</span></div>
                <div className="flex justify-between"><span>Avg. ROAS</span><span className={averageROAS > 1 ? "text-green-500" : averageROAS < 1 ? "text-red-500" : ""}>{averageROAS.toFixed(2)}x</span></div>
              </CardContent>
            </Card>
            {/* Customer Metrics */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                <CardTitle className="text-base">Customer Metrics</CardTitle>
            </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex justify-between"><span>Unique Customers</span><span>{formatNumber(new Set(filteredOrders.map(o => o.orderId)).size)}</span></div>
                <div className="flex justify-between"><span>Avg. Order Value</span><span className={totalOrders > 0 && totalRevenue > 0 ? "text-green-500" : ""}>{totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : "$0.00"}</span></div>
            </CardContent>
          </Card>
          {/* COGS */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              <CardTitle className="text-base">COGS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between"><span>Total COGS</span><span className={totalCOGS > 0 ? "text-red-500 font-semibold" : ""}>{formatCurrency(totalCOGS)}</span></div>
              <div className="flex justify-between"><span>Avg. COGS per Order</span><span className={averageCOGS > 0 ? "text-red-500 font-semibold" : ""}>{formatCurrency(averageCOGS)}</span></div>
            </CardContent>
          </Card>
          </div>

          {/* Orders Over Time */}
          <AreaChart
            data={(() => {
              // Group by date
              const grouped: Record<string, number> = {};
              mappedOrders.forEach(o => {
                if (o.date && o.date !== '-') {
                  grouped[o.date] = (grouped[o.date] || 0) + 1;
                }
              });
              return Object.entries(grouped).map(([date, count]) => ({ date, count }));
            })()}
            title="Orders Over Time"
            dataKey="count"
            xAxisDataKey="date"
            color="#3b82f6"
            yAxisFormatter={formatNumber}
          />

          {/* Orders by Country */}
          <PieChart
            data={(() => {
              const grouped: Record<string, number> = {};
              mappedOrders.forEach(o => {
                if (o.country && o.country !== '-') {
                  grouped[o.country] = (grouped[o.country] || 0) + 1;
                }
              });
              return Object.entries(grouped).map(([name, value]) => ({ name, value }));
            })()}
            title="Orders by Country"
            dataKey="value"
            nameKey="name"
          />

          {/* Payment Method Distribution */}
          <PieChart
            data={(() => {
              const grouped: Record<string, number> = {};
              mappedOrders.forEach(o => {
                if (o.paymentMethod && o.paymentMethod !== '-') {
                  grouped[o.paymentMethod] = (grouped[o.paymentMethod] || 0) + 1;
                }
              });
              return Object.entries(grouped).map(([name, value]) => ({ name, value }));
            })()}
            title="Payment Method Distribution"
            dataKey="value"
            nameKey="name"
          />

          {/* Upsell Rate Over Time */}
          <BarChart
            data={(() => {
              // Group by date
              const grouped: Record<string, { total: number; upsell: number }> = {};
              mappedOrders.forEach(o => {
                if (o.date && o.date !== '-') {
                  if (!grouped[o.date]) grouped[o.date] = { total: 0, upsell: 0 };
                  grouped[o.date].total += 1;
                  if (o.upsell === 'Yes') grouped[o.date].upsell += 1;
                }
              });
              return Object.entries(grouped).map(([date, { total, upsell }]) => ({
                date,
                rate: total > 0 ? (upsell / total) * 100 : 0
              }));
            })()}
            title="Upsell Rate Over Time"
            dataKey="rate"
            xAxisDataKey="date"
            yAxisFormatter={(v: number) => `${v.toFixed(1)}%`}
          />

          {/* Attributed vs. Unattributed Orders */}
          <PieChart
            data={(() => {
              let attributed = 0, unattributed = 0;
              mappedOrders.forEach(o => {
                if (o.attributedPlatform && o.attributedPlatform !== '-') attributed += 1;
                else unattributed += 1;
              });
              return [
                { name: 'Attributed', value: attributed },
                { name: 'Unattributed', value: unattributed }
              ];
            })()}
            title="Attributed vs. Unattributed Orders"
            dataKey="value"
            nameKey="name"
          />

          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <span>Platform Attribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniquePlatforms.map((platform) => {
                  const platformOrders = filteredOrders.filter(o => o.attributedPlatform === platform);
                  const platformRevenue = platformOrders.reduce((sum, o) => sum + (o.usdAmount || 0), 0);
                  const platformSpend = platformOrders.reduce((sum, o) => sum + (o.attributedSpend || 0), 0);
                  const platformROAS = platformSpend > 0 ? (platformRevenue / platformSpend) : 0;
                  return (
                    <Card key={platform} className="p-4 border rounded-lg shadow-sm bg-card">
                      <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <CardTitle className="text-sm font-semibold">{platform}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 px-0 pt-0 pb-0">
                        <div className="flex justify-between text-xs"><span>Orders</span><span className="font-semibold">{platformOrders.length}</span></div>
                        <div className="flex justify-between text-xs"><span>Order Revenue</span><span className={platformRevenue > 0 ? "text-green-500 font-semibold" : ""}>{formatCurrency(platformRevenue)}</span></div>
                        <div className="flex justify-between text-xs"><span>Spend</span><span className={platformSpend > 0 ? "text-red-500 font-semibold" : ""}>{formatCurrency(platformSpend)}</span></div>
                        <div className="flex justify-between text-xs"><span>ROAS</span><span className={platformROAS > 1 ? "text-green-500 font-semibold" : platformROAS < 1 ? "text-red-500 font-semibold" : "font-semibold"}>{platformSpend > 0 ? platformROAS.toFixed(2) + "x" : "N/A"}</span></div>
                      </CardContent>
                    </Card>
                  );
                })}
                {uniquePlatforms.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    No platform attribution data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attribution" className="space-y-6">
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <span>UTM Attribution Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">UTM Sources</div>
                  <div className="space-y-1">
                    {Array.from(new Set(mappedOrders.map(o => o.utmSource).filter(s => s && s !== '-'))).map(source => {
                      const sourceOrders = mappedOrders.filter(o => o.utmSource === source);
                      const sourceRevenue = sourceOrders.reduce((sum, o) => sum + (o.usdAmount || 0), 0);
                      return (
                        <div key={source} className="text-xs p-2 bg-muted rounded">
                          <div className="font-medium">{source}</div>
                          <div>Orders: {sourceOrders.length}</div>
                          <div>Order Revenue: {formatCurrency(sourceRevenue)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">UTM Mediums</div>
                  <div className="space-y-1">
                    {Array.from(new Set(mappedOrders.map(o => o.utmMedium).filter(m => m && m !== '-'))).map(medium => {
                      const mediumOrders = mappedOrders.filter(o => o.utmMedium === medium);
                      const mediumRevenue = mediumOrders.reduce((sum, o) => sum + (o.usdAmount || 0), 0);
                      return (
                        <div key={medium} className="text-xs p-2 bg-muted rounded">
                          <div className="font-medium">{medium}</div>
                          <div>Orders: {mediumOrders.length}</div>
                          <div>Order Revenue: {formatCurrency(mediumRevenue)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">UTM Campaigns</div>
                  <div className="space-y-1">
                    {Array.from(new Set(mappedOrders.map(o => o.utmCampaign).filter(c => c && c !== '-'))).map(campaign => {
                      const campaignOrders = mappedOrders.filter(o => o.utmCampaign === campaign);
                      const campaignRevenue = campaignOrders.reduce((sum, o) => sum + (o.usdAmount || 0), 0);
                      return (
                        <div key={campaign} className="text-xs p-2 bg-muted rounded">
                          <div className="font-medium">{campaign}</div>
                          <div>Orders: {campaignOrders.length}</div>
                          <div>Order Revenue: {formatCurrency(campaignRevenue)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Date Range */}
                <div className="space-y-3 sm:col-span-2">
                  <label className="text-sm font-medium flex items-center space-x-2">
                    <span>Date Range</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full border rounded px-2 py-2 text-left text-sm">
                          From: {filters.dateRange.from}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={new Date(filters.dateRange.from)}
                          onSelect={date =>
                            date &&
                            handleDateRangeChange("from", date.toISOString().slice(0, 10))
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full border rounded px-2 py-2 text-left text-sm">
                          To: {filters.dateRange.to}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={new Date(filters.dateRange.to)}
                          onSelect={date =>
                            date &&
                            handleDateRangeChange("to", date.toISOString().slice(0, 10))
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {/* SKU Filter */}
                <div className="space-y-3">
                  <label htmlFor="sku" className="text-sm font-medium">SKU</label>
                  <Select value={skuFilter} onValueChange={setSkuFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All SKUs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All SKUs</SelectItem>
                      {uniqueSKUs.filter(sku => typeof sku === 'string' && sku.trim() !== '').map((sku) => (
                        <SelectItem key={sku} value={sku}>{sku}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Payment Method Filter */}
                <div className="space-y-3">
                  <label htmlFor="paymentMethod" className="text-sm font-medium">Payment Method</label>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All Methods</SelectItem>
                      {uniquePaymentMethods.filter(pm => typeof pm === 'string' && pm.trim() !== '').map((pm) => (
                        <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Platform Filter */}
                <div className="space-y-3">
                  <label htmlFor="platform" className="text-sm font-medium">Platform</label>
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All Platforms</SelectItem>
                      {uniquePlatforms.filter(p => typeof p === 'string' && p.trim() !== '').map((platform) => (
                        <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Reset Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleResetFilters}
                    className="bg-muted text-xs px-3 py-2 rounded hover:bg-primary/10 border border-input"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <span>Order Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading orders and attribution data...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">Failed to load data.</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No orders found for the selected filters.</div>
              ) : (
                <DataTable
                  columns={visibleColumns}
                  data={filteredOrders}
                  onColumnToggle={handleColumnToggle}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 