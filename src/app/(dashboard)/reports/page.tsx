'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { DataTable } from '@/components/dashboard/DataTable';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { BarChart } from '@/components/dashboard/BarChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { 
  TrendingUp,
  DollarSign,
  Activity,
  BarChart3,
  Target,
  Globe
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
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
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
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['orderId', 'date', 'sku', 'revenue', 'profit']);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      let allOrders: any[] = [];
      let allAdSpend: any[] = [];
      let failedPlatforms: string[] = [];
      let succeededPlatforms: string[] = [];
      const fromDate = filters.dateRange.from;
      const toDate = filters.dateRange.to;
      // Fetch Checkout Champ Orders
      let ordersData: any[] = [];
      try {
        const response = await fetch(`/api/checkoutchamp?from=${fromDate}&to=${toDate}`);
        if (response.ok) {
          ordersData = await response.json();
          if (ordersData && ordersData.length > 0) succeededPlatforms.push('Checkout Champ');
          else failedPlatforms.push('Checkout Champ');
        } else {
          failedPlatforms.push('Checkout Champ');
        }
      } catch (e) {
        failedPlatforms.push('Checkout Champ');
      }
      // Fetch Ad Spend (Taboola, AdUp, Outbrain)
      let adSpendData: any[] = [];
      let taboolaData: any[] = [];
      let adupData: any[] = [];
      let outbrainData: any[] = [];
      // Taboola
      try {
        const response = await fetch(`/api/taboola?fromDate=${fromDate}&toDate=${toDate}`);
        if (response.ok) {
          taboolaData = await response.json();
          if (taboolaData && taboolaData.length > 0) succeededPlatforms.push('Taboola');
          else failedPlatforms.push('Taboola');
        } else {
          failedPlatforms.push('Taboola');
        }
      } catch (e) {
        failedPlatforms.push('Taboola');
      }
      // AdUp
      try {
        const response = await fetch(`/api/adup?fromDate=${fromDate}&toDate=${toDate}`);
        if (response.ok) {
          adupData = await response.json();
          if (adupData && adupData.length > 0) succeededPlatforms.push('AdUp');
          else failedPlatforms.push('AdUp');
        } else {
          failedPlatforms.push('AdUp');
        }
      } catch (e) {
        failedPlatforms.push('AdUp');
      }
      // Outbrain
      try {
        const marketerId = process.env.NEXT_PUBLIC_OUTBRAIN_MARKETER_ID || '';
        if (marketerId) {
          const response = await fetch(`/api/outbrain?marketerId=${marketerId}&fromDate=${fromDate}&toDate=${toDate}`);
          if (response.ok) {
            outbrainData = await response.json();
            if (outbrainData && outbrainData.length > 0) succeededPlatforms.push('Outbrain');
            else failedPlatforms.push('Outbrain');
          } else {
            failedPlatforms.push('Outbrain');
          }
        } else {
          failedPlatforms.push('Outbrain');
        }
      } catch (e) {
        failedPlatforms.push('Outbrain');
      }
      adSpendData = [...(taboolaData || []), ...(adupData || []), ...(outbrainData || [])];
      setAllOrders(ordersData);
      setAllAdSpend(adSpendData);
      setLoading(false);
      // Log results
      succeededPlatforms.forEach(p => console.log(`[${p}] Showing real data.`));
      failedPlatforms.forEach(p => console.error(`[${p}] API failed or returned no data.`));
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Apply filters to data
  const filteredOrders = filterData(allOrders, filters);
  const filteredAdSpend = filterAdSpendData(allAdSpend, filters);

  // Calculate profit and revenue for orders
  const ordersWithCalculations = filteredOrders.map(order => {
    const revenue = order.usdAmount;
    const estimatedCosts = order.usdAmount * 0.3;
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
    downloadCSV(exportOrdersToCSV(filteredOrders), `reports_${filters.dateRange.from}_to_${filters.dateRange.to}.csv`);
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
    console.log('Chart data:', data); // Debug log
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

  // Determine Outbrain data status
  const outbrainSuccess = allAdSpend.some(entry => entry.platform === 'outbrain');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading reports data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Historical Reports</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Comprehensive analysis of historical performance data
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ExportButton onClick={handleExportOrders} icon="file" className="w-full sm:w-auto">
            Export Reports
          </ExportButton>
          <ExportButton onClick={handleExportAll} icon="chart" className="w-full sm:w-auto">
            Export All Data
          </ExportButton>
        </div>
      </div>
      {/* Outbrain Data Status Messages */}
      {outbrainSuccess && (
        <div className="mb-4 p-3 rounded bg-green-100 text-green-800 border border-green-300 text-sm">
          <strong>Success:</strong> Showing <b>real Outbrain data</b> from the Outbrain API.
        </div>
      )}

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span>Total Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(kpis.grossRevenue)}</div>
            <div className="flex items-center space-x-1 text-xs sm:text-sm text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+5.2% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span>Total Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatNumber(kpis.totalOrders)}</div>
            <div className="flex items-center space-x-1 text-xs sm:text-sm text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+8.7% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span>ROAS</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{kpis.roas.toFixed(2)}x</div>
            <div className="flex items-center space-x-1 text-xs sm:text-sm text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+12.5% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-orange-500" />
              <span>Average AOV</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(kpis.aov)}</div>
            <div className="flex items-center space-x-1 text-xs sm:text-sm text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+2.3% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm sm:text-base font-semibold">Performance Trends</CardTitle>
                <p className="text-xs text-muted-foreground">Historical performance analysis</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select 
                  value={chartMetric}
                  onChange={(e) => setChartMetric(e.target.value as 'revenue' | 'profit' | 'spend')}
                  className="text-xs border rounded px-2 py-1 w-full sm:w-auto"
                >
                  <option value="revenue">Revenue</option>
                  <option value="profit">Profit</option>
                  <option value="spend">Spend</option>
                </select>
                <select 
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'line' | 'bar' | 'area')}
                  className="text-xs border rounded px-2 py-1 w-full sm:w-auto"
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
                <CardTitle className="text-sm sm:text-base font-semibold">SKU Performance</CardTitle>
                <p className="text-xs text-muted-foreground">Top performing products</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">{skuBreakdown.length} SKUs</Badge>
            </div>
        </CardHeader>
        <CardContent>
            <BarChart 
              data={skuBreakdown.slice(0, 10).map(item => ({
                name: item.sku,
                value: item.revenue
              }))}
              dataKey="value"
              xAxisDataKey="name"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports Table */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-semibold">Detailed Order Reports</CardTitle>
              <p className="text-xs text-muted-foreground">Comprehensive order data with filtering and export</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
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
            columns={[
              { key: 'orderId', label: 'Order ID', visible: visibleColumns.includes('orderId') },
              { key: 'date', label: 'Date', visible: visibleColumns.includes('date') },
              { key: 'sku', label: 'SKU', visible: visibleColumns.includes('sku') },
              { key: 'revenue', label: 'Revenue', visible: visibleColumns.includes('revenue') },
              { key: 'profit', label: 'Profit', visible: visibleColumns.includes('profit') },
              { key: 'quantity', label: 'Quantity', visible: visibleColumns.includes('quantity') },
              { key: 'country', label: 'Country', visible: visibleColumns.includes('country') },
            ]}
            onColumnToggle={(column) => {
              if (visibleColumns.includes(column)) {
                setVisibleColumns(visibleColumns.filter(c => c !== column));
              } else {
                setVisibleColumns([...visibleColumns, column]);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Additional Analysis Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span>Platform Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {platformSpend.slice(0, 5).map((platform, index) => (
              <div key={platform.platform} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium">{platform.platform}</span>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(platform.spend)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Globe className="h-4 w-4 text-green-500" />
              <span>Geographic Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {geographicData.slice(0, 5).map((geo, index) => (
              <div key={geo.country} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium">{geo.country}</span>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(geo.revenue)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 