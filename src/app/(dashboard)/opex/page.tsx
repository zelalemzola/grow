"use client"

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Trash2,
  Calendar
} from "lucide-react";
import { calculateKPIs, formatCurrency, formatPercentage } from "@/lib/calculations";
import { Order, AdSpendEntry, FixedExpense, DashboardFilters } from "@/lib/types";
import { getEurToUsdRate } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface FixedExpenseInput {
  date: string;
  category: string;
  amount: number;
}

export default function OPEXPage() {
  // Date range state
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    },
  });

  // Fetch EUR to USD rate
  const { data: eurToUsdRateData } = useQuery<number>({
    queryKey: ['eur-usd-rate'],
    queryFn: getEurToUsdRate,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    retry: 1,
  });
  const EUR_TO_USD = typeof eurToUsdRateData === 'number' && !isNaN(eurToUsdRateData) ? eurToUsdRateData : 1.10;

  // Fetch all data needed for OPEX calculation with date filters
  const { data: ordersData } = useQuery<any[]>({
    queryKey: ["checkoutchamp-orders", filters],
    queryFn: async () => {
      const startDate = new Date(filters.dateRange.from).toLocaleDateString('en-US');
      const endDate = new Date(filters.dateRange.to).toLocaleDateString('en-US');
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const res = await fetch(`/api/checkoutchamp?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

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

  // Date range handlers
  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  // State for manual fixed expenses
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseInput[]>([
    { date: new Date().toISOString().slice(0, 10), category: "Rent", amount: 0 },
    { date: new Date().toISOString().slice(0, 10), category: "Utilities", amount: 0 },
    { date: new Date().toISOString().slice(0, 10), category: "Software Subscriptions", amount: 0 },
    { date: new Date().toISOString().slice(0, 10), category: "Employee Salaries", amount: 0 },
    { date: new Date().toISOString().slice(0, 10), category: "Other", amount: 0 },
  ]);

  // Function to update fixed expense
  const updateFixedExpense = (index: number, field: keyof FixedExpenseInput, value: string | number) => {
    const updatedExpenses = [...fixedExpenses];
    updatedExpenses[index] = { ...updatedExpenses[index], [field]: value };
    setFixedExpenses(updatedExpenses);
  };

  // Function to add new expense category
  const addExpenseCategory = () => {
    setFixedExpenses([...fixedExpenses, { 
      date: new Date().toISOString().slice(0, 10), 
      category: "New Category", 
      amount: 0 
    }]);
  };

  // Function to remove expense category
  const removeExpenseCategory = (index: number) => {
    if (fixedExpenses.length > 1) {
      const updatedExpenses = fixedExpenses.filter((_, i) => i !== index);
      setFixedExpenses(updatedExpenses);
    }
  };

  // Data normalization functions (same as dashboard)
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

  function normalizeOrder(entry: any): Order {
    const isEUR = entry.currencyCode === "EUR" || entry.currencySymbol === "€";
    let rawTotal = (() => {
      if (entry.totalAmount && !isNaN(Number(entry.totalAmount))) {
        return Number(entry.totalAmount);
      }
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
    let rawUsdAmount = entry.usdAmount || rawTotal;
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
      shippingCost: entry.shippingCost ? Number(entry.shippingCost) : undefined,
      items: entry.items,
    };
  }

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

  // Calculate OPEX
  const opexCalculation = useMemo(() => {
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

  // Calculate OPEX breakdown
  const opexBreakdown = useMemo(() => {
    if (!opexCalculation) return null;
    
    const paymentFees = opexCalculation.paymentFees || 0;
    const marketingSpend = opexCalculation.marketingSpend || 0;
    const manualFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalOpex = opexCalculation.opex || 0;
    const shippingCosts = totalOpex - paymentFees - marketingSpend - manualFixedExpenses;
    
    return {
      paymentFees,
      shippingCosts: Math.max(0, shippingCosts), // Ensure non-negative
      marketingSpend,
      manualFixedExpenses,
      totalOpex,
    };
  }, [opexCalculation, fixedExpenses]);

  return (
    <div className="container-responsive space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operating Expenses (OPEX)</h1>
          <p className="text-muted-foreground">
            Manage and track all your business operating expenses
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          EUR to USD: {EUR_TO_USD.toFixed(4)}
        </Badge>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
          <CardDescription>
            Select the date range for OPEX calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      new Date(filters.dateRange.from).toLocaleDateString()
                    ) : (
                      <span>Pick a start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateRange.from ? new Date(filters.dateRange.from) : undefined}
                    onSelect={(date) => handleDateRangeChange('from', date ? date.toISOString().slice(0, 10) : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !filters.dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? (
                      new Date(filters.dateRange.to).toLocaleDateString()
                    ) : (
                      <span>Pick an end date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateRange.to ? new Date(filters.dateRange.to) : undefined}
                    onSelect={(date) => handleDateRangeChange('to', date ? date.toISOString().slice(0, 10) : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OPEX Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <CardTitle className="text-base">Total OPEX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(opexBreakdown?.totalOpex || 0)}</div>
            <p className="text-xs text-muted-foreground">All operating expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-base">Marketing Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(opexBreakdown?.marketingSpend || 0)}</div>
            <p className="text-xs text-muted-foreground">Ad platform costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-base">Payment Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(opexBreakdown?.paymentFees || 0)}</div>
            <p className="text-xs text-muted-foreground">Processing fees (2.9%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-base">Fixed Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(opexBreakdown?.manualFixedExpenses || 0)}</div>
            <p className="text-xs text-muted-foreground">Manual entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Expenses Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fixed Expenses</CardTitle>
              <CardDescription>
                Add your monthly fixed expenses. These will be included in your OPEX calculations.
              </CardDescription>
            </div>
            <Button onClick={addExpenseCategory} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixedExpenses.map((expense, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`category-${index}`}>Category</Label>
                  {fixedExpenses.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpenseCategory(index)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Input
                  id={`category-${index}`}
                  value={expense.category}
                  onChange={(e) => updateFixedExpense(index, 'category', e.target.value)}
                  placeholder="e.g., Rent, Utilities"
                />
                <Label htmlFor={`amount-${index}`}>Monthly Amount ($)</Label>
                <Input
                  id={`amount-${index}`}
                  type="number"
                  value={expense.amount}
                  onChange={(e) => updateFixedExpense(index, 'amount', Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed OPEX Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>OPEX Breakdown</CardTitle>
          <CardDescription>
            Detailed breakdown of all operating expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Automatic OPEX */}
              <div>
                <h3 className="font-semibold mb-3 text-green-600">Automatic OPEX</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium">Payment Processing Fees</div>
                      <div className="text-sm text-muted-foreground">2.9% of order amounts</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(opexBreakdown?.paymentFees || 0)}</div>
                      <div className="text-xs text-muted-foreground">
                        {opexBreakdown?.totalOpex ? formatPercentage((opexBreakdown.paymentFees / opexBreakdown.totalOpex) * 100) : '0%'} of total
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium">Shipping Costs</div>
                      <div className="text-sm text-muted-foreground">From Checkout Champ orders</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(opexBreakdown?.shippingCosts || 0)}</div>
                      <div className="text-xs text-muted-foreground">
                        {opexBreakdown?.totalOpex ? formatPercentage((opexBreakdown.shippingCosts / opexBreakdown.totalOpex) * 100) : '0%'} of total
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <div className="font-medium">Marketing Spend</div>
                      <div className="text-sm text-muted-foreground">Ad platforms (Taboola, Outbrain, AdUp)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(opexBreakdown?.marketingSpend || 0)}</div>
                      <div className="text-xs text-muted-foreground">
                        {opexBreakdown?.totalOpex ? formatPercentage((opexBreakdown.marketingSpend / opexBreakdown.totalOpex) * 100) : '0%'} of total
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual OPEX */}
              <div>
                <h3 className="font-semibold mb-3 text-orange-600">Manual Fixed Expenses</h3>
                <div className="space-y-3">
                  {fixedExpenses.map((expense, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <div>
                        <div className="font-medium">{expense.category}</div>
                        <div className="text-sm text-muted-foreground">Monthly fixed expense</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(expense.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {opexBreakdown?.totalOpex ? formatPercentage((expense.amount / opexBreakdown.totalOpex) * 100) : '0%'} of total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Total Summary */}
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <div>
                <div className="text-lg font-semibold">Total OPEX</div>
                <div className="text-sm text-muted-foreground">All operating expenses combined</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{formatCurrency(opexBreakdown?.totalOpex || 0)}</div>
                <div className="text-sm text-muted-foreground">
                  {opexCalculation?.grossRevenue ? formatPercentage((opexBreakdown?.totalOpex || 0) / opexCalculation.grossRevenue * 100) : '0%'} of revenue
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 