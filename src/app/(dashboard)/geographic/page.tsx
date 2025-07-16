'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { DataTable } from '@/components/dashboard/DataTable';
import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { 
  Globe,
  TrendingUp,
  Search,
  Target,
  DollarSign,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Users,
  Eye
} from 'lucide-react';
import { 
  calculateKPIs, 
  calculateGeographicData,
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

export default function GeographicPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: '2025-01-01',
      to: '2025-01-31',
    },
  });
  
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allAdSpend, setAllAdSpend] = useState<AdSpendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'orders'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['country', 'revenue', 'profit', 'orders', 'aov']);

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

  const kpis = calculateKPIs(filteredOrders, filteredAdSpend, [], []);
  const geographicData = calculateGeographicData(filteredOrders);

  console.log('Geographic data:', geographicData); // Debug log

  // Filter and sort geographic data
  const filteredGeographic = geographicData
    .filter(geo => 
      geo.country.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const handleExportAll = () => {
    exportDashboardData(
      filteredOrders,
      filteredAdSpend,
      kpis,
      [],
      [],
      geographicData,
      filters.dateRange
    );
  };

  const handleExportGeographic = () => {
    const csvData = [
      ['Country', 'Revenue', 'Profit', 'Orders', 'AOV', 'Profit Margin'],
      ...filteredGeographic.map(geo => [
        geo.country,
        geo.revenue,
        geo.profit,
        geo.orders,
        geo.aov,
        geo.profitMargin
      ])
    ];
    downloadCSV(csvData.map(row => row.join(',')).join('\n'), `geographic_insights_${filters.dateRange.from}_to_${filters.dateRange.to}.csv`);
  };

  // Determine Outbrain data status
  const outbrainSuccess = allAdSpend.some(entry => entry.platform === 'outbrain');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading geographic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Geographic Insights</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Performance analysis by geographic regions and countries
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ExportButton onClick={handleExportGeographic} icon="file" className="w-full sm:w-auto">
            Export Geographic
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

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'revenue' | 'profit' | 'orders')}
            className="text-xs border rounded px-2 py-1 w-full sm:w-auto"
          >
            <option value="revenue">Sort by Revenue</option>
            <option value="profit">Sort by Profit</option>
            <option value="orders">Sort by Orders</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-xs w-full sm:w-auto"
          >
            {sortOrder === 'asc' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>Countries</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{geographicData.length}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Active markets
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span>Top Market Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {geographicData.length > 0 ? formatCurrency(geographicData[0].revenue) : '$0'}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              {geographicData.length > 0 ? geographicData[0].country : 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Total Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {formatNumber(geographicData.reduce((sum, geo) => sum + geo.orders, 0))}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Across all markets
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Target className="h-4 w-4 text-orange-500" />
              <span>Avg AOV</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {geographicData.length > 0 
                ? formatCurrency(geographicData.reduce((sum, geo) => sum + geo.aov, 0) / geographicData.length)
                : '$0'
              }
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Average order value
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
                <CardTitle className="text-sm sm:text-base font-semibold">Top Markets by Revenue</CardTitle>
                <p className="text-xs text-muted-foreground">Revenue performance by country</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">Top 10</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const chartData = geographicData.slice(0, 10).map(geo => ({
                name: geo.country,
                value: geo.revenue
              }));
              console.log('Geographic chart data:', chartData); // Debug log
              return (
            <BarChart 
                  data={chartData}
                  dataKey="value"
                  xAxisDataKey="name"
                />
              );
            })()}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm sm:text-base font-semibold">Geographic Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Revenue breakdown by region</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">{geographicData.length} countries</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const pieData = geographicData.slice(0, 8).map(geo => ({
                name: geo.country,
                value: geo.revenue
              }));
              console.log('Geographic pie chart data:', pieData); // Debug log
              return (
                <PieChart 
                  data={pieData}
                />
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Geographic Details Table */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-semibold">Geographic Performance Details</CardTitle>
              <p className="text-xs text-muted-foreground">Comprehensive geographic analysis with filtering and export</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                <Eye className="h-3 w-3 mr-1" />
                Columns
              </Button>
              <ExportButton onClick={handleExportGeographic} icon="file" size="sm" className="w-full sm:w-auto">
                Export
              </ExportButton>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <DataTable 
            data={filteredGeographic}
            columns={[
              { key: 'country', label: 'Country', visible: visibleColumns.includes('country') },
              { key: 'revenue', label: 'Revenue', visible: visibleColumns.includes('revenue') },
              { key: 'profit', label: 'Profit', visible: visibleColumns.includes('profit') },
              { key: 'orders', label: 'Orders', visible: visibleColumns.includes('orders') },
              { key: 'aov', label: 'AOV', visible: visibleColumns.includes('aov') },
              { key: 'profitMargin', label: 'Profit Margin', visible: visibleColumns.includes('profitMargin') },
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

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Top Markets</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {geographicData.slice(0, 5).map((geo, index) => (
              <div key={geo.country} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium truncate">{geo.country}</span>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(geo.revenue)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span>Market Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {geographicData.slice(0, 5).map((geo, index) => (
              <div key={geo.country} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium truncate">{geo.country}</span>
                </div>
                <div className="text-sm font-semibold">{geo.orders} orders</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 