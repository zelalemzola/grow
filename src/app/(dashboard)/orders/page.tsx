'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { DataTable } from '@/components/dashboard/DataTable';
import { BarChart } from '@/components/dashboard/BarChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { 
  FileText,
  TrendingUp,
  Search,
  Target,
  DollarSign,
  Activity,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Clock
} from 'lucide-react';
import { 
  getMockData 
} from '@/lib/api';
import { 
  calculateKPIs, 
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

export default function OrdersPage() {
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
  const [sortBy, setSortBy] = useState<'orderId' | 'date' | 'revenue' | 'profit'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'orderId', 'date', 'sku', 'revenue', 'profit', 'quantity', 'country', 'paymentMethod'
  ]);

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

  const kpis = calculateKPIs(filteredOrders, filteredAdSpend);
  const chartData = generateChartData(filteredOrders, filteredAdSpend, 30);

  // Filter and sort orders
  const filteredAndSortedOrders = ordersWithCalculations
    .filter(order => 
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.country?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortBy === 'date') {
        return sortOrder === 'asc' 
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const handleExportAll = () => {
    exportDashboardData(
      filteredOrders,
      filteredAdSpend,
      kpis,
      [],
      [],
      [],
      filters.dateRange
    );
  };

  const handleExportOrders = () => {
    downloadCSV(exportOrdersToCSV(filteredOrders), `orders_${filters.dateRange.from}_to_${filters.dateRange.to}.csv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading orders data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Order Details</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Comprehensive order tracking and analysis
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

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
              placeholder="Search orders, SKUs, or countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'orderId' | 'date' | 'revenue' | 'profit')}
            className="text-xs border rounded px-2 py-1 w-full sm:w-auto"
          >
            <option value="date">Sort by Date</option>
            <option value="orderId">Sort by Order ID</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="profit">Sort by Profit</option>
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
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              <span>Total Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatNumber(filteredOrders.length)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Orders in period
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span>Total Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(kpis.grossRevenue)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Gross revenue
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span>Net Profit</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(kpis.netProfit)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              After all costs
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Target className="h-4 w-4 text-orange-500" />
              <span>Average AOV</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(kpis.aov)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Order value
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
                <CardTitle className="text-sm sm:text-base font-semibold">Order Volume Trends</CardTitle>
                <p className="text-xs text-muted-foreground">Daily order volume over time</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">30 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const volumeChartData = chartData.revenueData.map(item => ({
                date: item.date,
                value: item.value / 100 // Convert to order count approximation
              }));
              console.log('Orders volume chart data:', volumeChartData); // Debug log
              return (
                <AreaChart 
                  data={volumeChartData}
                  dataKey="value"
                  xAxisDataKey="date"
                />
              );
            })()}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm sm:text-base font-semibold">Revenue by Day</CardTitle>
                <p className="text-xs text-muted-foreground">Daily revenue performance</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">30 days</Badge>
            </div>
        </CardHeader>
        <CardContent>
            {(() => {
              const revenueData = chartData.revenueData.slice(-14);
              console.log('Orders revenue chart data:', revenueData); // Debug log
              return (
                <BarChart 
                  data={revenueData}
                  dataKey="value"
                  xAxisDataKey="date"
                />
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Orders Details Table */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-semibold">Order Details</CardTitle>
              <p className="text-xs text-muted-foreground">Comprehensive order data with filtering and export</p>
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
            data={filteredAndSortedOrders}
            columns={enhancedColumns}
            onColumnToggle={(column) => {
              if (visibleColumns.includes(column)) {
                setVisibleColumns(visibleColumns.filter(c => c !== column));
              } else {
                setVisibleColumns([...visibleColumns, column]);
              }
            }}
            expandable={true}
          />
        </CardContent>
      </Card>

      {/* Order Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>High Value Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {ordersWithCalculations
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5)
              .map((order, index) => (
                <div key={order.orderId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm font-medium truncate">{order.orderId}</span>
                  </div>
                  <div className="text-sm font-semibold">{formatCurrency(order.revenue)}</div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Recent Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {filteredOrders
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((order, index) => (
                <div key={order.orderId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm font-medium truncate">{order.orderId}</span>
                  </div>
                  <div className="text-sm font-semibold">{new Date(order.date).toLocaleDateString()}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 