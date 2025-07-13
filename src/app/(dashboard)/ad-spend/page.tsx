'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { DataTable } from '@/components/dashboard/DataTable';
import { PieChart } from '@/components/dashboard/PieChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { 
  DollarSign, 
  TrendingUp, 
  Search,
  Eye,
  Target,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  MousePointer,
  Eye as EyeIcon,
  Zap
} from 'lucide-react';
import { 
  getMockData 
} from '@/lib/api';
import { 
  calculateKPIs, 
  calculatePlatformSpend,
  formatCurrency,
  formatNumber,
  filterData,
  filterAdSpendData
} from '@/lib/calculations';
import { 
  exportDashboardData,
  downloadCSV,
  exportAdSpendToCSV
} from '@/lib/export';
import { DashboardFilters, Order, AdSpendEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function AdSpendPage() {
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
  const [sortBy, setSortBy] = useState<'date' | 'spend' | 'clicks' | 'impressions'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['date', 'platform', 'campaignId', 'campaignName', 'spend', 'clicks', 'impressions', 'cpc', 'cpm', 'ctr', 'roas', 'country', 'device', 'adType', 'campaign', 'revenue', 'conversions']);

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
  const platformSpend = calculatePlatformSpend(filteredAdSpend);

  // Filter and sort ad spend data
  const filteredAndSortedAdSpend = filteredAdSpend
    .filter(entry => 
      entry.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.campaignId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.campaignName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortBy === 'date') {
        return sortOrder === 'asc' 
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }
      
      // Convert to numbers for numeric sorting
      const aNum = Number(aValue) || 0;
      const bNum = Number(bValue) || 0;
      
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });

  // Calculate metrics
  const totalSpend = filteredAdSpend.reduce((sum, entry) => sum + entry.spend, 0);
  const totalClicks = filteredAdSpend.reduce((sum, entry) => sum + entry.clicks, 0);
  const totalImpressions = filteredAdSpend.reduce((sum, entry) => sum + entry.impressions, 0);
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const handleExportAll = () => {
    exportDashboardData(
      filteredOrders,
      filteredAdSpend,
      kpis,
      [],
      platformSpend,
      [],
      filters.dateRange
    );
  };

  const handleExportAdSpend = () => {
    downloadCSV(exportAdSpendToCSV(filteredAdSpend), `ad_spend_${filters.dateRange.from}_to_${filters.dateRange.to}.csv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading ad spend data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive max-w-screen-xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Ad Spend Analytics</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Comprehensive analysis of advertising spend across all platforms
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ExportButton onClick={handleExportAdSpend} icon="file" className="w-full sm:w-auto">
            Export Ad Spend
          </ExportButton>
          <ExportButton onClick={handleExportAll} icon="chart" className="w-full sm:w-auto">
            Export All Data
          </ExportButton>
        </div>
      </div>

      {/* Filters */}
      <div className="w-full">
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
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search platforms, campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'spend' | 'clicks' | 'impressions')}
            className="text-xs border rounded px-2 py-1 w-full sm:w-auto"
          >
            <option value="date">Sort by Date</option>
            <option value="spend">Sort by Spend</option>
            <option value="clicks">Sort by Clicks</option>
            <option value="impressions">Sort by Impressions</option>
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
              <DollarSign className="h-4 w-4 text-green-500" />
              <span>Total Spend</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Across all platforms
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <MousePointer className="h-4 w-4 text-blue-500" />
              <span>Total Clicks</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatNumber(totalClicks)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Total clicks received
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <EyeIcon className="h-4 w-4 text-purple-500" />
              <span>Total Impressions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatNumber(totalImpressions)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Total impressions
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Target className="h-4 w-4 text-orange-500" />
              <span>Avg CPC</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(avgCPC)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Cost per click
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Avg CPM</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(avgCPM)}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Cost per 1000 impressions
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Activity className="h-4 w-4 text-red-500" />
              <span>Avg CTR</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{avgCTR.toFixed(2)}%</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Click-through rate
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>ROAS</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold">{kpis.roas.toFixed(2)}x</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Return on ad spend
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
                <CardTitle className="text-sm sm:text-base font-semibold">Daily Spend Trends</CardTitle>
                <p className="text-xs text-muted-foreground">Spend over time by platform</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">30 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <AreaChart 
              data={filteredAdSpend.map(entry => ({
                date: entry.date,
                value: entry.spend,
                platform: entry.platform
              }))}
              dataKey="value"
              xAxisDataKey="date"
            />
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm sm:text-base font-semibold">Platform Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Spend breakdown by platform</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">{platformSpend.length} platforms</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <PieChart data={platformSpend} />
          </CardContent>
        </Card>
      </div>

      {/* Ad Spend Details Table */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-semibold">Ad Spend Details</CardTitle>
              <p className="text-xs text-muted-foreground">Comprehensive ad spend data with filtering and export</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                <Eye className="h-3 w-3 mr-1" />
                Columns
              </Button>
              <ExportButton onClick={handleExportAdSpend} icon="file" size="sm" className="w-full sm:w-auto">
                Export
              </ExportButton>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto w-full">
            <DataTable 
              data={filteredAndSortedAdSpend}
              columns={[
                { key: 'date', label: 'Date', visible: visibleColumns.includes('date') },
                { key: 'platform', label: 'Platform', visible: visibleColumns.includes('platform') },
                { key: 'campaignId', label: 'Campaign ID', visible: visibleColumns.includes('campaignId') },
                { key: 'campaignName', label: 'Campaign Name', visible: visibleColumns.includes('campaignName') },
                { key: 'spend', label: 'Spend', visible: visibleColumns.includes('spend') },
                { key: 'clicks', label: 'Clicks', visible: visibleColumns.includes('clicks') },
                { key: 'impressions', label: 'Impressions', visible: visibleColumns.includes('impressions') },
                { key: 'cpc', label: 'CPC', visible: visibleColumns.includes('cpc') },
                { key: 'cpm', label: 'CPM', visible: visibleColumns.includes('cpm') },
                { key: 'ctr', label: 'CTR', visible: visibleColumns.includes('ctr') },
                { key: 'roas', label: 'ROAS', visible: visibleColumns.includes('roas') },
                { key: 'country', label: 'Country', visible: visibleColumns.includes('country') },
                { key: 'device', label: 'Device', visible: visibleColumns.includes('device') },
                { key: 'adType', label: 'Ad Type', visible: visibleColumns.includes('adType') },
                { key: 'campaign', label: 'Campaign', visible: visibleColumns.includes('campaign') },
                { key: 'revenue', label: 'Revenue', visible: visibleColumns.includes('revenue') },
                { key: 'conversions', label: 'Conversions', visible: visibleColumns.includes('conversions') },
              ]}
              onColumnToggle={(column) => {
                if (visibleColumns.includes(column)) {
                  setVisibleColumns(visibleColumns.filter(c => c !== column));
                } else {
                  setVisibleColumns([...visibleColumns, column]);
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Platform Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Top Performing Platforms</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {platformSpend.slice(0, 5).map((platform, index) => (
              <div key={platform.platform} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium truncate">{platform.platform}</span>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(platform.spend)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Campaigns</span>
              <span className="font-medium">{filteredAdSpend.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Platforms</span>
              <span className="font-medium">{platformSpend.length}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg Daily Spend</span>
              <span className="font-medium">{formatCurrency(totalSpend / 30)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total ROAS</span>
              <span className="font-medium">{kpis.roas.toFixed(2)}x</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 