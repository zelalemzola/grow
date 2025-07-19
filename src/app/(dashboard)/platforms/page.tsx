"use client";
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, TrendingUp, TrendingDown, DollarSign, BarChart3, MousePointerClick, Eye, Target, Activity, ArrowRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/calculations';

// Platform data fetching hooks
const usePlatformsSummary = (fromDate: string, toDate: string) => {
  return useQuery({
    queryKey: ['platforms', 'summary', fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/platforms/summary?from=${fromDate}&to=${toDate}`);
      if (!res.ok) {
        throw new Error('Failed to fetch platforms summary');
      }
      const data = await res.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Platform card component
const PlatformCard = ({ 
  platform, 
  data, 
  isLoading, 
  error 
}: { 
  platform: string; 
  data: any; 
  isLoading: boolean; 
  error: any; 
}) => {
  const platformConfig = {
    outbrain: { name: 'Outbrain', color: 'bg-blue-500', icon: '🎯' },
    taboola: { name: 'Taboola', color: 'bg-purple-500', icon: '📊' },
    adup: { name: 'AdUp', color: 'bg-green-500', icon: '🚀' }
  };

  const config = platformConfig[platform as keyof typeof platformConfig];
  
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">{config.icon}</div>
              <CardTitle className="text-lg">{config.name}</CardTitle>
            </div>
            <Badge variant="secondary">Loading...</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-red-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">{config.icon}</div>
              <CardTitle className="text-lg">{config.name}</CardTitle>
            </div>
            <Badge variant="destructive">Error</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">{config.icon}</div>
            <CardTitle className="text-lg">{config.name}</CardTitle>
          </div>
          <Badge className={getStatusColor(data.status)}>
            {data.status === 'active' ? 'Active' : data.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(data.spend)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(data.revenue)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ROAS</p>
            <p className="text-xl font-semibold">{data.roas.toFixed(2)}x</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Campaigns</p>
            <p className="text-xl font-semibold">{data.campaigns}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <MousePointerClick className="h-3 w-3" />
              <span>{formatNumber(data.clicks)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{formatNumber(data.impressions)}</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
};

// Comparison charts data
const prepareChartData = (platformsData: any) => {
  if (!platformsData) return { spendData: [], roasData: [], campaignData: [] };

  const spendData = Object.entries(platformsData).map(([platform, data]: [string, any]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    spend: data.spend,
    revenue: data.revenue,
    roas: data.roas,
    campaigns: data.campaigns
  }));

  const roasData = spendData.map(item => ({
    platform: item.platform,
    roas: item.roas
  }));

  const campaignData = spendData.map(item => ({
    name: item.platform,
    value: item.campaigns
  }));

  return { spendData, roasData, campaignData };
};

export default function PlatformsPage() {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });

  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  const { data: platformsData, isLoading, error } = usePlatformsSummary(fromDate, toDate);
  const chartData = useMemo(() => prepareChartData(platformsData?.platforms), [platformsData?.platforms]);

  const totalSpend = platformsData?.overall?.spend || 0;
  const totalRevenue = platformsData?.overall?.revenue || 0;
  const overallROAS = platformsData?.overall?.roas || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
    <div>
          <h1 className="text-3xl font-bold tracking-tight">Platforms Overview</h1>
          <p className="text-muted-foreground">
            Compare performance across all advertising platforms
          </p>
        </div>
        
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Overall KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall ROAS</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallROAS.toFixed(2)}x</div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PlatformCard 
          platform="outbrain" 
          data={platformsData?.outbrain} 
          isLoading={isLoading} 
          error={error} 
        />
        <PlatformCard 
          platform="taboola" 
          data={platformsData?.taboola} 
          isLoading={isLoading} 
          error={error} 
        />
        <PlatformCard 
          platform="adup" 
          data={platformsData?.adup} 
          isLoading={isLoading} 
          error={error} 
        />
      </div>

      {/* Comparison Charts */}
      <Tabs defaultValue="spend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="spend">Spend Comparison</TabsTrigger>
          <TabsTrigger value="roas">ROAS Comparison</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Distribution</TabsTrigger>
        </TabsList>
        
        <TabsContent value="spend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spend by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.spendData.length > 0 ? (
                <BarChart
                  data={chartData.spendData}
                  dataKey="spend"
                  xAxisDataKey="platform"
                  yAxisFormatter={(value: number) => formatCurrency(value)}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ROAS by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.roasData.length > 0 ? (
                <BarChart
                  data={chartData.roasData}
                  dataKey="roas"
                  xAxisDataKey="platform"
                  yAxisFormatter={(value: number) => `${value.toFixed(2)}x`}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.campaignData.length > 0 ? (
                <PieChart
                  data={chartData.campaignData}
                  dataKey="value"
                  nameKey="name"
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2" asChild>
              <a href="/platforms/outbrains">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🎯</span>
                  <span className="font-semibold">Outbrain Dashboard</span>
                </div>
                <span className="text-sm text-muted-foreground">View detailed Outbrain analytics</span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2" asChild>
              <a href="/platforms/taboola">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📊</span>
                  <span className="font-semibold">Taboola Dashboard</span>
                </div>
                <span className="text-sm text-muted-foreground">View detailed Taboola analytics</span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2" asChild>
              <a href="/platforms/adup">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🚀</span>
                  <span className="font-semibold">AdUp Dashboard</span>
                </div>
                <span className="text-sm text-muted-foreground">View detailed AdUp analytics</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
