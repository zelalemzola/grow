'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { DataTable } from '@/components/dashboard/DataTable';
import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { 
  Package,
  TrendingUp,
  TrendingDown, 
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Target,
  DollarSign,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  getMockData 
} from '@/lib/api';
import { 
  calculateKPIs,
  calculateSKUBreakdown,
  calculatePlatformSpend, 
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

export default function SKUBreakdownPage() {
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
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'quantity'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['sku', 'revenue', 'profit', 'quantity', 'aov']);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { orders: mockOrders, adSpend: mockAdSpend } = getMockData();
        setAllOrders(mockOrders);
        setAllAdSpend(mockAdSpend);
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

  const kpis = calculateKPIs(filteredOrders, filteredAdSpend);
  const skuBreakdown = calculateSKUBreakdown(filteredOrders, kpis);

  console.log('SKU breakdown data:', skuBreakdown); // Debug log

  // Filter and sort SKU data
  const filteredSKUs = skuBreakdown
    .filter(sku => 
      sku.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.brand?.toLowerCase().includes(searchTerm.toLowerCase())
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
      skuBreakdown,
      [],
      [],
      filters.dateRange
    );
  };

  const handleExportSKUs = () => {
    const csvData = [
      ['SKU', 'Brand', 'Revenue', 'Profit', 'Quantity', 'AOV', 'Profit Margin'],
      ...filteredSKUs.map(sku => [
        sku.sku,
        sku.brand || '',
        sku.revenue,
        sku.profit,
        sku.quantity,
        sku.aov,
        sku.profitMargin
      ])
    ];
    downloadCSV(csvData.map(row => row.join(',')).join('\n'), `sku_breakdown_${filters.dateRange.from}_to_${filters.dateRange.to}.csv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading SKU breakdown data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">SKU Analysis</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Detailed breakdown of product performance and profitability
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ExportButton onClick={handleExportSKUs} icon="file" className="w-full sm:w-auto">
            Export SKUs
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

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SKUs or brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border rounded px-2 py-1 w-full sm:w-auto"
          >
            <option value="revenue">Sort by Revenue</option>
            <option value="profit">Sort by Profit</option>
            <option value="quantity">Sort by Quantity</option>
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
              <Package className="h-4 w-4 text-blue-500" />
              <span>Total SKUs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{skuBreakdown.length}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Active products
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span>Top SKU Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {skuBreakdown.length > 0 ? formatCurrency(skuBreakdown[0].revenue) : '$0'}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              {skuBreakdown.length > 0 ? skuBreakdown[0].sku : 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span>Avg Profit Margin</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {skuBreakdown.length > 0 
                ? formatPercentage(skuBreakdown.reduce((sum, sku) => sum + sku.profitMargin, 0) / skuBreakdown.length)
                : '0%'
              }
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Across all SKUs
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Target className="h-4 w-4 text-orange-500" />
              <span>Total Quantity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">
              {formatNumber(skuBreakdown.reduce((sum, sku) => sum + sku.quantity, 0))}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Units sold
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
                <CardTitle className="text-sm sm:text-base font-semibold">Top SKUs by Revenue</CardTitle>
                <p className="text-xs text-muted-foreground">Revenue performance by product</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">Top 10</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const chartData = skuBreakdown.slice(0, 10).map(sku => ({
                name: sku.sku,
                value: sku.revenue
              }));
              console.log('SKU chart data:', chartData); // Debug log
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
                <CardTitle className="text-sm sm:text-base font-semibold">Profit Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Profit breakdown by SKU</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">{skuBreakdown.length} SKUs</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const pieData = skuBreakdown.slice(0, 8).map(sku => ({
                name: sku.sku,
                value: sku.profit
              }));
              console.log('SKU pie chart data:', pieData); // Debug log
              return (
                <PieChart 
                  data={pieData}
                />
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* SKU Details Table */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-semibold">SKU Performance Details</CardTitle>
              <p className="text-xs text-muted-foreground">Comprehensive SKU analysis with filtering and export</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                <Eye className="h-3 w-3 mr-1" />
                Columns
              </Button>
              <ExportButton onClick={handleExportSKUs} icon="file" size="sm" className="w-full sm:w-auto">
                Export
              </ExportButton>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <DataTable 
            data={filteredSKUs}
            columns={[
              { key: 'sku', label: 'SKU', visible: visibleColumns.includes('sku') },
              { key: 'brand', label: 'Brand', visible: visibleColumns.includes('brand') },
              { key: 'revenue', label: 'Revenue', visible: visibleColumns.includes('revenue') },
              { key: 'profit', label: 'Profit', visible: visibleColumns.includes('profit') },
              { key: 'quantity', label: 'Quantity', visible: visibleColumns.includes('quantity') },
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
              <span>Top Performers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {skuBreakdown.slice(0, 5).map((sku, index) => (
              <div key={sku.sku} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium truncate">{sku.sku}</span>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(sku.revenue)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span>Low Performers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {skuBreakdown.slice(-5).reverse().map((sku, index) => (
              <div key={sku.sku} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm font-medium truncate">{sku.sku}</span>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(sku.revenue)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 