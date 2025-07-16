'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { BarChart } from '@/components/dashboard/BarChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { DataTable } from '@/components/dashboard/DataTable';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Target,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  calculateKPIs, 
  calculateSKUBreakdown, 
  calculatePlatformSpend, 
  calculateGeographicData,
  generateChartData,
  formatCurrency,
  formatPercentage,
  formatNumber,
  filterData,
  filterAdSpendData
} from '@/lib/calculations';
import { 
  exportDashboardData,
  downloadCSV,
  exportOrdersToCSV
} from '@/lib/export';
import { DashboardFilters, Order, AdSpendEntry } from '@/lib/types';

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: '2025-01-01',
      to: '2025-01-31',
    },
  });
  
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allAdSpend, setAllAdSpend] = useState<AdSpendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'profit' | 'spend'>('revenue');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'orderId', 'date', 'sku', 'revenue', 'profit', 'country', 'paymentMethod'
  ]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Enhanced columns with tooltips and sorting - only include properties that exist in Order interface
  const enhancedColumns = [
    { key: 'orderId', label: 'Order ID', visible: visibleColumns.includes('orderId'), sortable: true, tooltip: 'Unique order identifier' },
    { key: 'date', label: 'Date', visible: visibleColumns.includes('date'), sortable: true, tooltip: 'Order date' },
    { key: 'sku', label: 'SKU', visible: visibleColumns.includes('sku'), sortable: true, tooltip: 'Stock keeping unit' },
    { key: 'revenue', label: 'Revenue', visible: visibleColumns.includes('revenue'), sortable: true, tooltip: 'Total revenue from order' },
    { key: 'profit', label: 'Profit', visible: visibleColumns.includes('profit'), sortable: true, tooltip: 'Net profit after costs' },
    { key: 'quantity', label: 'Quantity', visible: visibleColumns.includes('quantity'), sortable: true, tooltip: 'Number of items ordered' },
    { key: 'country', label: 'Country', visible: visibleColumns.includes('country'), sortable: true, tooltip: 'Customer country' },
    { key: 'paymentMethod', label: 'Payment', visible: visibleColumns.includes('paymentMethod'), sortable: true, tooltip: 'Payment method used' },
    { key: 'brand', label: 'Brand', visible: visibleColumns.includes('brand'), sortable: true, tooltip: 'Product brand' },
    { key: 'refund', label: 'Refund', visible: visibleColumns.includes('refund'), sortable: true, tooltip: 'Refund amount' },
    { key: 'chargeback', label: 'Chargeback', visible: visibleColumns.includes('chargeback'), sortable: true, tooltip: 'Chargeback amount' },
    { key: 'upsell', label: 'Upsell', visible: visibleColumns.includes('upsell'), sortable: true, tooltip: 'Whether order included upsell' },
  ];

  const handleRowToggle = (rowId: string) => {
    setExpandedRows(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId)
        : [...prev, rowId]
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // TODO: Replace with real API calls for orders and ad spend
        setAllOrders([]); // Set to empty until real API is connected
        setAllAdSpend([]); // Set to empty until real API is connected
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Apply filters to data
  const filteredOrders = filterData(allOrders, filters);
  const filteredAdSpend = filterAdSpendData(allAdSpend, filters);

  // Calculate profit and revenue for orders
  const ordersWithCalculations = filteredOrders.map(order => {
    // Revenue is the usdAmount
    const revenue = order.usdAmount;
    // Simplified profit calculation (revenue - estimated costs)
    const estimatedCosts = order.usdAmount * 0.3; // Assume 30% costs
    const profit = revenue - estimatedCosts;
    
    return {
      ...order,
      revenue,
      profit
    };
  });

  const kpis = calculateKPIs(filteredOrders, filteredAdSpend, [], []);
  const skuBreakdown = calculateSKUBreakdown(filteredOrders, kpis);
  const platformSpend = calculatePlatformSpend(filteredAdSpend);
  const geographicData = calculateGeographicData(filteredOrders);
  const chartData = generateChartData(filteredOrders, filteredAdSpend, 30);

  const handleExportAll = () => {
    exportDashboardData(
      filteredOrders,
      filteredAdSpend,
      kpis,
      skuBreakdown,
      platformSpend,
      geographicData,
      filters.dateRange
    );
  };

  const handleExportOrders = () => {
    downloadCSV(exportOrdersToCSV(filteredOrders), `orders_${filters.dateRange.from}_to_${filters.dateRange.to}.csv`);
  };

  const getChartData = () => {
    switch (chartMetric) {
      case 'revenue':
        return chartData.revenueData;
      case 'profit':
        return chartData.profitData;
      case 'spend':
        return chartData.spendData;
      default:
        return chartData.revenueData;
    }
  };

  const renderChart = () => {
    const data = getChartData();
    switch (chartType) {
      case 'line':
        return <RevenueChart data={data} />;
      case 'bar':
        return <BarChart data={data} dataKey="value" xAxisDataKey="date" />;
      case 'area':
        return <AreaChart data={data} dataKey="value" xAxisDataKey="date" />;
      default:
        return <RevenueChart data={data} />;
    }
  };

  // Generate breakdown data for KPI cards
  const generateKPIBreakdown = (metric: string, data: (Order | AdSpendEntry)[]) => {
    const byDate = data.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += (item as any)[metric] || 0;
      return acc;
    }, {} as Record<string, number>);

    const byCountry = data.reduce((acc, item) => {
      const country = (item as any).country;
      if (!acc[country]) acc[country] = 0;
      acc[country] += (item as any)[metric] || 0;
      return acc;
    }, {} as Record<string, number>);

    const bySKU = data.reduce((acc, item) => {
      const sku = (item as any).sku;
      if (!acc[sku]) acc[sku] = 0;
      acc[sku] += (item as any)[metric] || 0;
      return acc;
    }, {} as Record<string, number>);

    const byPlatform = data.reduce((acc, item) => {
      const platform = (item as any).platform;
      if (!acc[platform]) acc[platform] = 0;
      acc[platform] += (item as any)[metric] || 0;
      return acc;
    }, {} as Record<string, number>);

    return {
      byDate: Object.entries(byDate).map(([date, value]) => ({ date, value: value as number })),
      byCountry: Object.entries(byCountry).map(([country, value]) => ({ country, value: value as number })),
      bySKU: Object.entries(bySKU).map(([sku, value]) => ({ sku, value: value as number })),
      byPlatform: Object.entries(byPlatform).map(([platform, value]) => ({ platform, value: value as number }))
    };
  };

  const revenueBreakdown = generateKPIBreakdown('revenue', filteredOrders);
  const profitBreakdown = generateKPIBreakdown('profit', filteredOrders);
  const ordersBreakdown = generateKPIBreakdown('quantity', filteredOrders);
  const spendBreakdown = generateKPIBreakdown('spend', filteredAdSpend);

  // Generate raw data for KPI cards
  const generateRawData = (metric: string, data: (Order | AdSpendEntry)[]) => {
    return data.map((item, index) => ({
      id: (item as any).orderId || `item-${index}`,
      date: item.date,
      value: (item as any)[metric] || 0,
      country: (item as any).country,
      sku: (item as any).sku,
      platform: (item as any).platform
    }));
  };

  const revenueRawData = generateRawData('revenue', filteredOrders);
  const profitRawData = generateRawData('profit', filteredOrders);
  const ordersRawData = generateRawData('quantity', filteredOrders);
  const spendRawData = generateRawData('spend', filteredAdSpend);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real-time insights into your business performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ExportButton onClick={handleExportOrders} icon="file" className="w-full sm:w-auto">
            Export Orders
          </ExportButton>
          <ExportButton onClick={handleExportAll} icon="chart" className="w-full sm:w-auto">
            Export All Data
          </ExportButton>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel 
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => setFilters({
          dateRange: {
            from: '2025-01-01',
            to: '2025-01-31',
          },
        })}
      />

      {/* KPI Cards with Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="sm:col-span-2 lg:col-span-1">
        <KPICard
          title="Gross Revenue"
          value={kpis.grossRevenue}
          format="currency"
          icon={<DollarSign className="h-4 w-4" />}
          change={5.2}
          trend="up"
          breakdown={revenueBreakdown}
          rawData={revenueRawData}
          onExport={() => handleExportOrders()}
        />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
        <KPICard
          title="Net Profit"
          value={kpis.netProfit}
          format="currency"
          icon={<TrendingUp className="h-4 w-4" />}
          change={-2.1}
          trend="down"
          breakdown={profitBreakdown}
          rawData={profitRawData}
          onExport={() => handleExportOrders()}
        />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
        <KPICard
          title="ROAS"
          value={kpis.roas}
          format="number"
          icon={<Target className="h-4 w-4" />}
          description="Return on Ad Spend"
          change={12.5}
          trend="up"
        />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
        <KPICard
          title="Total Orders"
          value={kpis.totalOrders}
          format="number"
          icon={<ShoppingCart className="h-4 w-4" />}
          change={8.7}
          trend="up"
          breakdown={ordersBreakdown}
          rawData={ordersRawData}
          onExport={() => handleExportOrders()}
        />
      </div>
        <div className="sm:col-span-2 lg:col-span-1">
        <KPICard
          title="Marketing Spend"
          value={kpis.marketingSpend}
          format="currency"
          icon={<Activity className="h-4 w-4" />}
          change={8.7}
          trend="up"
          breakdown={spendBreakdown}
          rawData={spendRawData}
          onExport={() => handleExportAll()}
        />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
        <KPICard
          title="AOV"
          value={kpis.aov}
          format="currency"
          icon={<DollarSign className="h-4 w-4" />}
          description="Average Order Value"
          change={2.3}
          trend="up"
        />
        </div>
      </div>

      {/* Charts Section with Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm sm:text-base font-semibold">Revenue Analytics</CardTitle>
                <p className="text-xs text-muted-foreground">Performance over time</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select 
                  value={chartMetric}
                  onChange={(e) => setChartMetric(e.target.value as 'revenue' | 'profit' | 'spend')}
                  className="text-xs border rounded px-2 py-1 w-full sm:w-auto bg-background"
                >
                  <option value="revenue">Revenue</option>
                  <option value="profit">Profit</option>
                  <option value="spend">Spend</option>
                </select>
                <select 
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'line' | 'bar' | 'area')}
                  className="text-xs border rounded px-2 py-1 w-full sm:w-auto bg-background"
                >
                  <option value="line">Line</option>
                  <option value="bar">Bar</option>
                  <option value="area">Area</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart()}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm sm:text-base font-semibold">Platform Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Spend across platforms</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">{platformSpend.length} platforms</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <PieChart data={platformSpend} />
          </CardContent>
        </Card>
      </div>

      {/* Interactive Data Table */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-semibold">Order Details</CardTitle>
              <p className="text-xs text-muted-foreground">Detailed order information with filtering</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                <Eye className="h-3 w-3 mr-1" />
                Columns
              </Button>
              <ExportButton onClick={handleExportOrders} icon="file" size="sm" className="w-full sm:w-auto">
                Export
              </ExportButton>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <DataTable 
            data={ordersWithCalculations}
            columns={enhancedColumns}
            onColumnToggle={(column) => {
              if (visibleColumns.includes(column)) {
                setVisibleColumns(visibleColumns.filter(c => c !== column));
              } else {
                setVisibleColumns([...visibleColumns, column]);
              }
            }}
            expandable={true}
            expandedRows={expandedRows}
            onRowToggle={handleRowToggle}
          />
        </CardContent>
      </Card>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>Refunds & Chargebacks</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Refund Total</span>
              <span className="font-medium text-red-600">{formatCurrency(kpis.refundTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Refund Rate</span>
              <span className="font-medium text-red-600">{formatPercentage(kpis.refundRate)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Chargeback Total</span>
              <span className="font-medium text-orange-600">{formatCurrency(kpis.chargebackTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Chargeback Rate</span>
              <span className="font-medium text-orange-600">{formatPercentage(kpis.chargebackRate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Cost Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">COGS</span>
              <span className="font-medium">{formatCurrency(kpis.cogs)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">OPEX</span>
              <span className="font-medium">{formatCurrency(kpis.opex)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment Fees</span>
              <span className="font-medium">{formatCurrency(kpis.paymentFees)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Net Profit</span>
              <span className="text-green-600">{formatCurrency(kpis.netProfit)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span>Customer Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost per Customer</span>
              <span className="font-medium">{formatCurrency(kpis.costPerCustomer)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Upsell Rate</span>
              <span className="font-medium">{formatPercentage(kpis.upsellRate)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ROAS</span>
              <span className="font-medium">{kpis.roas.toFixed(2)}x</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AOV</span>
              <span className="font-medium">{formatCurrency(kpis.aov)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 