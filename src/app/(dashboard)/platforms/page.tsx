'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { 
  DollarSign, 
  TrendingUp, 
  Search,
  Target,
  Activity,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MousePointer,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Users
} from 'lucide-react';
import { 
  getMockData 
} from '@/lib/api';
import { 
  calculatePlatformSpend,
  formatCurrency,
  formatPercentage,
  formatNumber,
  filterAdSpendData
} from '@/lib/calculations';
import { 
  downloadCSV,
  exportAdSpendToCSV
} from '@/lib/export';
import { DashboardFilters, AdSpendEntry } from '@/lib/types';

interface PlatformMetrics {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
  conversions: number;
  cpa: number;
  revenue: number;
}

interface PlatformFilter {
  platforms: string[];
  campaigns: string[];
  countries: string[];
  devices: string[];
  adTypes: string[];
  dateRange: {
    from: string;
    to: string;
  };
}

export default function PlatformsPage() {
  const [allAdSpend, setAllAdSpend] = useState<AdSpendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['outbrain', 'taboola', 'adup']);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [filters, setFilters] = useState<PlatformFilter>({
    platforms: ['outbrain', 'taboola', 'adup'],
    campaigns: [],
    countries: [],
    devices: [],
    adTypes: [],
    dateRange: {
      from: '2025-01-01',
      to: '2025-01-31',
    },
  });

  const [chartType, setChartType] = useState<'bar' | 'pie' | 'area'>('bar');
  const [chartMetric, setChartMetric] = useState<'spend' | 'impressions' | 'clicks' | 'ctr' | 'roas' | 'conversions'>('spend');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { adSpend } = getMockData();
        setAllAdSpend(adSpend);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter data based on selected filters
  const filteredData = allAdSpend.filter(entry => {
    if (filters.platforms.length > 0 && !filters.platforms.includes(entry.platform)) return false;
    if (filters.campaigns.length > 0 && !filters.campaigns.includes(entry.campaign || entry.campaignId)) return false;
    if (filters.countries.length > 0 && !filters.countries.includes(entry.country || '')) return false;
    if (filters.devices.length > 0 && !filters.devices.includes(entry.device || '')) return false;
    if (filters.adTypes.length > 0 && !filters.adTypes.includes(entry.adType || '')) return false;
    
    const entryDate = new Date(entry.date);
    const fromDate = new Date(filters.dateRange.from);
    const toDate = new Date(filters.dateRange.to);
    
    return entryDate >= fromDate && entryDate <= toDate;
  });

  // Calculate platform metrics
  const calculatePlatformMetrics = (): PlatformMetrics[] => {
    const platformData = filteredData.reduce((acc, entry) => {
      if (!acc[entry.platform]) {
        acc[entry.platform] = {
          platform: entry.platform,
          spend: 0,
          impressions: 0,
          clicks: 0,
          revenue: 0,
          conversions: 0,
          ctr: 0,
          roas: 0,
          cpa: 0
        };
      }
      
      acc[entry.platform].spend += entry.spend;
      acc[entry.platform].impressions += entry.impressions;
      acc[entry.platform].clicks += entry.clicks;
      acc[entry.platform].revenue += entry.revenue || 0;
      acc[entry.platform].conversions += entry.conversions || 0;
      
      return acc;
    }, {} as Record<string, PlatformMetrics>);

    return Object.values(platformData).map((data) => ({
      ...data,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      roas: data.spend > 0 ? data.revenue / data.spend : 0,
      cpa: data.conversions > 0 ? data.spend / data.conversions : 0
    }));
  };

  const platformMetrics = calculatePlatformMetrics();

  // Get unique values for filters
  const uniquePlatforms = [...new Set(allAdSpend.map(entry => entry.platform))];
  const uniqueCampaigns = [...new Set(allAdSpend.map(entry => entry.campaign || entry.campaignId))];
  const uniqueCountries = [...new Set(allAdSpend.map(entry => entry.country || '').filter(Boolean))];
  const uniqueDevices = [...new Set(allAdSpend.map(entry => entry.device || '').filter(Boolean))];
  const uniqueAdTypes = [...new Set(allAdSpend.map(entry => entry.adType || '').filter(Boolean))];

  const getChartData = () => {
    const data = platformMetrics.filter(metric => 
      selectedPlatforms.includes(metric.platform)
    );

    console.log('Platform metrics:', platformMetrics); // Debug log
    console.log('Selected platforms:', selectedPlatforms); // Debug log
    console.log('Filtered data:', data); // Debug log

    switch (chartMetric) {
      case 'spend':
        return data.map(d => ({ name: d.platform, value: d.spend }));
      case 'impressions':
        return data.map(d => ({ name: d.platform, value: d.impressions }));
      case 'clicks':
        return data.map(d => ({ name: d.platform, value: d.clicks }));
      case 'ctr':
        return data.map(d => ({ name: d.platform, value: d.ctr }));
      case 'roas':
        return data.map(d => ({ name: d.platform, value: d.roas }));
      case 'conversions':
        return data.map(d => ({ name: d.platform, value: d.conversions }));
      default:
        return data.map(d => ({ name: d.platform, value: d.spend }));
    }
  };

  const handleExport = () => {
    const csvData = [
      ['Platform', 'Spend', 'Impressions', 'Clicks', 'CTR', 'ROAS', 'Conversions', 'CPA', 'Revenue'],
      ...platformMetrics.map(m => [
        m.platform,
        m.spend.toString(),
        m.impressions.toString(),
        m.clicks.toString(),
        m.ctr.toFixed(2),
        m.roas.toFixed(2),
        m.conversions.toString(),
        m.cpa.toFixed(2),
        m.revenue.toString()
      ])
    ];
    
    const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading platform data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Deep breakdowns and comparisons across advertising platforms
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ExportButton onClick={handleExport} icon="file" className="w-full sm:w-auto">
            Export Data
          </ExportButton>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Filters & Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Platforms</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {uniquePlatforms.map((platform: string) => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform}
                    checked={selectedPlatforms.includes(platform)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPlatforms([...selectedPlatforms, platform]);
                      } else {
                        setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                      }
                    }}
                  />
                  <Label htmlFor={platform} className="text-sm">{platform}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">From Date</Label>
              <Input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, from: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">To Date</Label>
              <Input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, to: e.target.value }
                })}
              />
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Campaigns</Label>
              <Select
                value={filters.campaigns[0] || ''}
                onValueChange={(value: string) => setFilters({
                  ...filters,
                  campaigns: value ? [value] : []
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All campaigns" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCampaigns.length > 0 ? (
                    uniqueCampaigns.map((campaign: string) => (
                      <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-campaigns" disabled>No campaigns available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Countries</Label>
              <Select
                value={filters.countries[0] || ''}
                onValueChange={(value: string) => setFilters({
                  ...filters,
                  countries: value ? [value] : []
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCountries.length > 0 ? (
                    uniqueCountries.map((country: string) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Devices</Label>
              <Select
                value={filters.devices[0] || ''}
                onValueChange={(value: string) => setFilters({
                  ...filters,
                  devices: value ? [value] : []
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All devices" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDevices.length > 0 ? (
                    uniqueDevices.map((device: string) => (
                      <SelectItem key={device} value={device}>{device}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-devices" disabled>No devices available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Ad Types</Label>
              <Select
                value={filters.adTypes[0] || ''}
                onValueChange={(value: string) => setFilters({
                  ...filters,
                  adTypes: value ? [value] : []
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All ad types" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueAdTypes.length > 0 ? (
                    uniqueAdTypes.map((adType: string) => (
                      <SelectItem key={adType} value={adType}>{adType}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-adtypes" disabled>No ad types available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {platformMetrics.filter(metric => selectedPlatforms.includes(metric.platform)).map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{metric.platform}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {metric.conversions} conv
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Spend</p>
                  <p className="font-semibold">{formatCurrency(metric.spend)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-semibold">{formatCurrency(metric.revenue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ROAS</p>
                  <p className="font-semibold">{metric.roas.toFixed(2)}x</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CTR</p>
                  <p className="font-semibold">{metric.ctr.toFixed(2)}%</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(metric.impressions)} impressions • {formatNumber(metric.clicks)} clicks
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm sm:text-base font-semibold">Platform Performance</CardTitle>
                <p className="text-xs text-muted-foreground">Comparison across platforms</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Select value={chartMetric} onValueChange={(value: string) => setChartMetric(value as 'spend' | 'impressions' | 'clicks' | 'ctr' | 'roas' | 'conversions')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spend">Spend</SelectItem>
                    <SelectItem value="impressions">Impressions</SelectItem>
                    <SelectItem value="clicks">Clicks</SelectItem>
                    <SelectItem value="ctr">CTR</SelectItem>
                    <SelectItem value="roas">ROAS</SelectItem>
                    <SelectItem value="conversions">Conversions</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={chartType} onValueChange={(value: string) => setChartType(value as 'bar' | 'pie' | 'area')}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const chartData = getChartData();
              console.log('Platforms chart data:', chartData); // Debug log
              
              switch (chartType) {
                case 'bar':
                  return <BarChart data={chartData} dataKey="value" xAxisDataKey="name" />;
                case 'pie':
                  return <PieChart data={chartData} />;
                case 'area':
                  return <AreaChart data={chartData} dataKey="value" xAxisDataKey="name" />;
                default:
                  return <BarChart data={chartData} dataKey="value" xAxisDataKey="name" />;
              }
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm sm:text-base font-semibold">Spend Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Platform spend allocation</p>
              </div>
              <Badge variant="outline" className="text-xs w-fit">
                {platformMetrics.length} platforms
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const pieData = platformMetrics.map(m => ({ name: m.platform, value: m.spend }));
              console.log('Platforms spend distribution data:', pieData); // Debug log
              return (
                <PieChart data={pieData} />
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-semibold">Platform Metrics</CardTitle>
              <p className="text-xs text-muted-foreground">Detailed platform performance data</p>
            </div>
            <ExportButton onClick={handleExport} icon="file" size="sm" className="w-full sm:w-auto">
              Export
            </ExportButton>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Platform</th>
                  <th className="text-left p-2">Spend</th>
                  <th className="text-left p-2">Impressions</th>
                  <th className="text-left p-2">Clicks</th>
                  <th className="text-left p-2">CTR</th>
                  <th className="text-left p-2">ROAS</th>
                  <th className="text-left p-2">Conversions</th>
                  <th className="text-left p-2">CPA</th>
                  <th className="text-left p-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {platformMetrics.filter(metric => selectedPlatforms.includes(metric.platform)).map((metric, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{metric.platform}</td>
                    <td className="p-2">{formatCurrency(metric.spend)}</td>
                    <td className="p-2">{formatNumber(metric.impressions)}</td>
                    <td className="p-2">{formatNumber(metric.clicks)}</td>
                    <td className="p-2">{metric.ctr.toFixed(2)}%</td>
                    <td className="p-2">{metric.roas.toFixed(2)}x</td>
                    <td className="p-2">{formatNumber(metric.conversions)}</td>
                    <td className="p-2">{formatCurrency(metric.cpa)}</td>
                    <td className="p-2">{formatCurrency(metric.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 