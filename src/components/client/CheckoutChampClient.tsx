"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, AlertTriangle, Target, Users, BarChart3, Package, History } from "lucide-react";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { DataTable } from "@/components/dashboard/DataTable";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { DashboardFilters, Order, AdSpendEntry, SKUCost } from "@/lib/types";
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
import { useCogsStore } from "@/lib/cogsStore";
import { useDateRangeStore } from "@/lib/dateRangeStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePaymentFeeStore } from "@/lib/paymentFeeStore";
import { useOpexStore } from '@/lib/opexStore';
import { Button } from "@/components/ui/button";

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

// Props interface for the client component
interface CheckoutChampClientProps {
  initialOrders: Order[];
  initialProducts: any[];
  initialDateRange: { from: string; to: string };
}

// Fetch ad spend data from all platforms (client-side)
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

export default function CheckoutChampClient({ 
  initialOrders, 
  initialProducts, 
  initialDateRange 
}: CheckoutChampClientProps) {
  const { from, to, setDateRange, load: loadDateRange } = useDateRangeStore();
  const { totalCogs, load } = useCogsStore();
  const { feePercentages, setFeePercentage, loadFees, saveFee } = usePaymentFeeStore();
  const { opex, setOpex, loadOpex, saveOpex } = useOpexStore();

  // Initialize date range from props
  useEffect(() => {
    if (initialDateRange.from && initialDateRange.to) {
      setDateRange(initialDateRange.from, initialDateRange.to);
    }
  }, [initialDateRange, setDateRange]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    loadFees();
    loadOpex();
  }, [loadFees, loadOpex]);

  // Correct useQuery usage: queryKey, queryFn, options
  // If using React Query v3, use this signature:
  const { data: eurToUsdRateData } = useQuery<number>({
    queryKey: ['eur-usd-rate'],
    queryFn: getEurToUsdRate,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    retry: 1,
  });
  const eurToUsdRate: number = typeof eurToUsdRateData === 'number' && !isNaN(eurToUsdRateData) ? eurToUsdRateData : 1.10;

  // Use initial orders data with proper caching and revalidation
  const { data: ordersData, isLoading: ordersLoading, error: ordersError, isRefetching: ordersRefetching, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['checkoutchamp-orders', { dateRange: { from, to } }],
    queryFn: () => fetch(`/api/checkoutchamp?startDate=${from}&endDate=${to}`).then(res => res.json()),
    initialData: initialOrders, // Use server-fetched data as initial data
    enabled: false, // Disable automatic refetching
    staleTime: Infinity, // Data never becomes stale automatically
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  // Manual refetch when date range changes
  useEffect(() => {
    if (from && to && (from !== initialDateRange.from || to !== initialDateRange.to)) {
      console.log('📅 Date range changed, manually refetching orders:', { from, to });
      refetchOrders();
    }
  }, [from, to, initialDateRange, refetchOrders]);

  const { data: adSpendData, isLoading: adSpendLoading, error: adSpendError } = useQuery<AdSpendEntry[]>({
    queryKey: ['ad-spend', { dateRange: { from, to } }],
    queryFn: () => fetchAdSpendData({ dateRange: { from, to } }),
    enabled: false, // Disable automatic refetching
    staleTime: Infinity, // Data never becomes stale automatically
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Use initial products data with proper caching
  const { data: productsData, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['checkoutchamp-products'],
    queryFn: async () => {
      const res = await fetch('/api/checkoutchamp/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return [];
      return await res.json();
    },
    initialData: initialProducts, // Use server-fetched data as initial data
    enabled: false, // Disable automatic refetching
    staleTime: Infinity, // Products data never becomes stale automatically
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Background COGS calculation when orders and products load (moved after React Query declarations)
  const { calculateCogsFromOrders, isCalculating: cogsCalculating } = useCogsStore();
  
  useEffect(() => {
    if (ordersData && productsData && ordersData.length > 0) {
      console.log('🔄 Triggering background COGS calculation for CheckoutChamp');
      calculateCogsFromOrders(ordersData, productsData);
    }
  }, [ordersData, productsData, calculateCogsFromOrders]);

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
  const calculateCOGS = (orders: Order[], skuCosts: SKUCost[]) => {
    let totalCogs = 0;
    orders.forEach(order => {
      if (!order.items) return;
      Object.values(order.items).forEach((item: any) => {
        if (item.productType === 'OFFER' || item.productType === 'UPSALE') {
          const sku = (item.productSku || '').trim().toUpperCase();
          const skuCost = skuCosts.find(cost => cost.sku === sku);
        if (skuCost) {
            const itemCogs = skuCost.unitCogs + skuCost.shippingCost + (skuCost.handlingFee || 0);
            totalCogs += itemCogs;
            // console.log(`[COGS] Adding SKU: ${sku}, unitCogs: ${skuCost.unitCogs}, shipping: ${skuCost.shippingCost}, handling: ${skuCost.handlingFee}, itemCogs: ${itemCogs}, runningTotal: ${totalCogs}`);
          } else {
            // console.log(`[COGS] No cost found for SKU: ${sku}`);
          }
        }
      });
    });
    // console.log(`[COGS] Final total COGS: ${totalCogs}`);
    return totalCogs;
  };

  // When fetching and mapping orders, filter out partial orders
  const orders = Array.isArray(ordersData) ? ordersData.filter((o: any) => o.orderStatus === 'COMPLETE') : [];
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
    const rawRefund = o.refund !== undefined && o.refund !== null ? Number(o.refund) : 0;
    const rawChargeback = o.chargeback !== undefined && o.chargeback !== null ? Number(o.chargeback) : 0;
    const rawAttributedSpend = o.attributedSpend !== undefined && o.attributedSpend !== null ? Number(o.attributedSpend) : 0;
    // Convert if needed
    const total = isEUR ? rawTotal * EUR_TO_USD : rawTotal;
    const usdAmount = isEUR ? rawUsdAmount * EUR_TO_USD : rawUsdAmount;
    const refund = isEUR ? rawRefund * EUR_TO_USD : rawRefund;
    const chargeback = isEUR ? rawChargeback * EUR_TO_USD : rawChargeback;
    const attributedSpend = isEUR ? rawAttributedSpend * EUR_TO_USD : rawAttributedSpend;
    return {
      orderId: o.orderId || o.clientOrderId || '-',
      date: o.dateCreated || '-',
      sku,
      quantity: o.quantity || (o.items ? Object.values(o.items).reduce((sum: number, item: any) => sum + (item.quantity ? Number(item.quantity) : 0), 0) : 1),
      total,
      usdAmount,
      paymentMethod: o.paymentMethod || o.paySource || '-',
      paySource: o.paySource || o.paymentMethod || '-', // <-- Add paySource for linter fix
      refund,
      chargeback,
      upsell: upsell ? 'Yes' : 'No',
      country: o.country || o.shipCountry || '-',
      brand: o.campaignName || o.campaignCategoryName || '-',
      utmSource: o.utmSource || '-',
      utmMedium: o.utmMedium || '-',
      utmCampaign: o.utmCampaign || '-',
      attributedPlatform: o.attributedPlatform || '-',
      attributedSpend,
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
const totalCOGS = calculateCOGS(ordersForCOGS, skuCosts);
  const averageCOGS = totalOrders > 0 ? totalCOGS / totalOrders : 0;

  // Payment Processing Fee calculation using global store
  const totalPaymentProcessingFees = filteredOrders.reduce((sum, o) => {
    const paySource = (o.paySource || o.paymentMethod || '').toLowerCase();
    // Find the best matching fee (case-insensitive, fallback to 0)
    let feePercent = 0;
    // Try exact match first
    if (feePercentages[paySource] !== undefined) {
      feePercent = feePercentages[paySource];
    } else {
      // Try partial match (e.g., 'paypal express' should match 'paypal')
      const found = Object.keys(feePercentages).find(key => paySource.includes(key));
      if (found) feePercent = feePercentages[found];
    }
    return sum + ((o.usdAmount || 0) * (feePercent / 100));
  }, 0);

  // Remove ccSummaryData and all summary endpoint logic
  // Calculate all KPIs from filteredOrders (raw orders)
  const kpiGrossRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  // Net Revenue = Gross Revenue - Payment Fees
  const kpiNetRevenue = kpiGrossRevenue - totalPaymentProcessingFees;
  const kpiRefunds = filteredOrders.reduce((sum, o) => sum + (o.refund || 0), 0);
  const kpiChargebacks = filteredOrders.reduce((sum, o) => sum + (o.chargeback || 0), 0);
  const kpiTotalOrders = filteredOrders.length;

  // Add local breakdown calculations using useMemo
  const productBreakdown = useMemo(() => {
    const map: Record<string, any> = {};
    filteredOrders.forEach(o => {
      const skus = o.sku.split(',').map((sku: string) => sku.trim());
      skus.forEach(sku => {
        if (!sku) return;
        if (!map[sku]) {
          map[sku] = {
            sku,
            product: o.brand || sku,
            newSaleCnt: 0,
            grossRevenue: 0,
            refundRev: 0,
            chargebackRev: 0,
            netRevenue: 0,
          };
        }
        map[sku].newSaleCnt += 1;
        map[sku].grossRevenue += o.usdAmount || 0;
        map[sku].refundRev += o.refund || 0;
        map[sku].chargebackRev += o.chargeback || 0;
        map[sku].netRevenue = map[sku].grossRevenue - map[sku].refundRev - map[sku].chargebackRev;
      });
    });
    return Object.values(map);
  }, [filteredOrders]);

  // Campaign Breakdown
  const campaignBreakdown = useMemo(() => {
    const map: Record<string, any> = {};
    filteredOrders.forEach(o => {
      const campaign = o.brand || '-';
      if (!map[campaign]) {
        map[campaign] = {
          campaign,
          newSaleCnt: 0,
          grossRevenue: 0,
          refundRev: 0,
          chargebackRev: 0,
          netRevenue: 0,
        };
      }
      map[campaign].newSaleCnt += 1;
      map[campaign].grossRevenue += o.usdAmount || 0;
      map[campaign].refundRev += o.refund || 0;
      map[campaign].chargebackRev += o.chargeback || 0;
      map[campaign].netRevenue = map[campaign].grossRevenue - map[campaign].refundRev - map[campaign].chargebackRev;
    });
    return Object.values(map);
  }, [filteredOrders]);

  // Source Breakdown
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, any> = {};
    filteredOrders.forEach(o => {
      const source = o.utmSource || '-';
      if (!map[source]) {
        map[source] = {
          source,
          newSaleCnt: 0,
          grossRevenue: 0,
          refundRev: 0,
          chargebackRev: 0,
          netRevenue: 0,
        };
      }
      map[source].newSaleCnt += 1;
      map[source].grossRevenue += o.usdAmount || 0;
      map[source].refundRev += o.refund || 0;
      map[source].chargebackRev += o.chargeback || 0;
      map[source].netRevenue = map[source].grossRevenue - map[source].refundRev - map[source].chargebackRev;
    });
    return Object.values(map);
  }, [filteredOrders]);

  // Only declare these once, at the top-level scope:
  const productColumns = [
    { key: 'sku', label: 'SKU', visible: true },
    { key: 'product', label: 'Product', visible: true },
    { key: 'newSaleCnt', label: 'Orders', visible: true },
    { key: 'grossRevenue', label: 'Gross Revenue', visible: true },
    { key: 'refundRev', label: 'Refunds', visible: true },
    { key: 'chargebackRev', label: 'Chargebacks', visible: true },
    { key: 'netRevenue', label: 'Net Revenue', visible: true },
  ];
  const campaignColumns = [
    { key: 'campaign', label: 'Campaign', visible: true },
    { key: 'newSaleCnt', label: 'Orders', visible: true },
    { key: 'grossRevenue', label: 'Gross Revenue', visible: true },
    { key: 'refundRev', label: 'Refunds', visible: true },
    { key: 'chargebackRev', label: 'Chargebacks', visible: true },
    { key: 'netRevenue', label: 'Net Revenue', visible: true },
  ];
  const sourceColumns = [
    { key: 'source', label: 'Source', visible: true },
    { key: 'newSaleCnt', label: 'Orders', visible: true },
    { key: 'grossRevenue', label: 'Gross Revenue', visible: true },
    { key: 'refundRev', label: 'Refunds', visible: true },
    { key: 'chargebackRev', label: 'Chargebacks', visible: true },
    { key: 'netRevenue', label: 'Net Revenue', visible: true },
  ];

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
    if (field === 'from') {
      setDateRange(value, to);
    } else {
      setDateRange(from, value);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setDateRange(new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 10), new Date().toISOString().slice(0, 10));
    setSkuFilter("__ALL__");
    setPaymentMethodFilter("__ALL__");
    setPlatformFilter("__ALL__");
  };

  useEffect(() => { loadDateRange(); }, [loadDateRange]);

  const isLoading = ordersLoading || adSpendLoading;
  const error = ordersError || adSpendError;

  // Dialog state for payment processing fee breakdown
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);

  // Unique payment methods and their order counts
  const paymentMethodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const method = (o.paySource || o.paymentMethod || '-').toString();
      if (!counts[method]) counts[method] = 0;
      counts[method] += 1;
    });
    return Object.entries(counts).map(([method, count]) => ({ method, count }));
  }, [filteredOrders]);

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
          {/* KPI Cards - Each KPI in its own card */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 my-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-300" />
                <CardTitle className="text-base">Total Order Revenue</CardTitle>
                {ordersRefetching && <div className="ml-auto w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
            </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <span className={"font-semibold " + (kpiGrossRevenue > 0 ? "text-green-500" : "text-red-500")}>{formatCurrency(kpiGrossRevenue)}</span>
                )}
            </CardContent>
          </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-300" />
                <CardTitle className="text-base">Net Revenue</CardTitle>
                {ordersRefetching && <div className="ml-auto w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <span>{formatCurrency(kpiNetRevenue)}</span>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-base">Total Orders</CardTitle>
                {ordersRefetching && <div className="ml-auto w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <span>{formatNumber(kpiTotalOrders)}</span>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-base">Unique Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <span>{formatNumber(new Set(filteredOrders.map(o => o.orderId)).size)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-base">Refunds</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-red-500 font-semibold">{formatCurrency(kpiRefunds)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-base">Chargebacks</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-red-500 font-semibold">{formatCurrency(kpiChargebacks)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-base">Attributed Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <span>{formatNumber(attributedOrders)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-base">Attributed Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <span className={totalAttributedSpend > 0 ? "text-red-500" : ""}>{formatCurrency(totalAttributedSpend)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-base">Avg. ROAS</CardTitle>
              </CardHeader>
              <CardContent>
                <span className={averageROAS > 1 ? "text-green-500" : averageROAS < 1 ? "text-red-500" : ""}>{averageROAS.toFixed(2)}x</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                <CardTitle className="text-base">Avg. Order Value</CardTitle>
            </CardHeader>
              <CardContent>
                <span className={totalOrders > 0 && totalRevenue > 0 ? "text-green-500" : ""}>{totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : "$0.00"}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              <CardTitle className="text-base">Total COGS</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={totalCogs > 0 ? "text-red-500 font-semibold" : ""}>{formatCurrency(totalCogs)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              <CardTitle className="text-base">Avg. COGS per Order</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={averageCOGS > 0 ? "text-red-500 font-semibold" : ""}>{formatCurrency(averageCOGS)}</span>
            </CardContent>
          </Card>
          {/* Payment Processing Fee KPI Card with Dialog */}
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
          {/* Platform Attribution */}
          <Card>
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

          {/* Product Breakdown */}
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <span>Product Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={productBreakdown}
                columns={productColumns}
                onColumnToggle={() => {}}
              />
            </CardContent>
          </Card>
          {/* Campaign Breakdown */}
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <span>Campaign Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={campaignBreakdown}
                columns={campaignColumns}
                onColumnToggle={() => {}}
              />
            </CardContent>
          </Card>
          {/* Source Breakdown */}
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <span>Source Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={sourceBreakdown}
                columns={sourceColumns}
                onColumnToggle={() => {}}
              />
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
                          From: {from}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={new Date(from)}
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
                          To: {to}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={new Date(to)}
                          onSelect={date =>
                            date &&
                            handleDateRangeChange("to", date.toISOString().slice(0, 10))
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {/* Manual Refresh Button */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Actions</label>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      console.log('🔄 Manual refresh triggered for CheckoutChamp');
                      refetchOrders();
                    }}
                    disabled={ordersRefetching}
                    className="w-full flex items-center gap-2"
                  >
                    {ordersRefetching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <History className="w-4 h-4" />
                        Refresh Data
                      </>
                    )}
                  </Button>
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

          {/* Payment Processing Fee KPI Card with Dialog */}
          {/* Dialog for payment method breakdown */}
          <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Payment Methods Breakdown</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {paymentMethodCounts.length === 0 ? (
                  <div className="text-muted-foreground">No payment methods found.</div>
                ) : (
                  <ul className="space-y-1">
                    {paymentMethodCounts.map(({ method, count }) => (
                      <li key={method} className="flex justify-between border-b pb-1">
                        <span className="font-medium">{method}</span>
                        <span className="text-sm text-muted-foreground">{count} order{count !== 1 ? 's' : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}