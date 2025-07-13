'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { DataTable } from '@/components/dashboard/DataTable';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart,
  Download,
  Eye,
  EyeOff,
  Calendar,
  Globe,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  X
} from 'lucide-react';
import { 
  formatCurrency,
  formatPercentage,
  formatNumber
} from '@/lib/calculations';

interface KPIBreakdown {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  change?: number;
  trend?: 'up' | 'down';
  description?: string;
  breakdown: {
    byDate: Array<{ date: string; value: number }>;
    byCountry: Array<{ country: string; value: number }>;
    bySKU: Array<{ sku: string; value: number }>;
    byPlatform: Array<{ platform: string; value: number }>;
  };
  rawData: Array<{
    id: string;
    date: string;
    value: number;
    country?: string;
    sku?: string;
    platform?: string;
  }>;
}

interface KPIModalProps {
  children: React.ReactNode;
  breakdown: KPIBreakdown;
  onExport?: () => void;
}

export function KPIModal({ children, breakdown, onExport }: KPIModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const getTrendIcon = (trend?: 'up' | 'down') => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'number':
        return formatNumber(value);
      default:
        return value.toString();
    }
  };

  const getChartData = (type: 'date' | 'country' | 'sku' | 'platform') => {
    switch (type) {
      case 'date':
        return breakdown.breakdown.byDate.map(item => ({
          name: item.date,
          value: item.value
        }));
      case 'country':
        return breakdown.breakdown.byCountry.map(item => ({
          name: item.country,
          value: item.value
        }));
      case 'sku':
        return breakdown.breakdown.bySKU.map(item => ({
          name: item.sku,
          value: item.value
        }));
      case 'platform':
        return breakdown.breakdown.byPlatform.map(item => ({
          name: item.platform,
          value: item.value
        }));
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-20xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold">{breakdown.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">{breakdown.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {breakdown.change && (
                <Badge variant={breakdown.trend === 'up' ? 'default' : 'secondary'}>
                  {getTrendIcon(breakdown.trend)}
                  {breakdown.change > 0 ? '+' : ''}{breakdown.change}%
                </Badge>
              )}
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main KPI Display */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-3xl font-bold">{formatValue(breakdown.value, breakdown.format)}</p>
                  <p className="text-sm text-muted-foreground">Current Value</p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-sm text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-semibold">{breakdown.rawData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Different Views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="data">Raw Data</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <AreaChart data={getChartData('date')} dataKey="value" xAxisDataKey="name" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <PieChart data={getChartData('platform')} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Time Series Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <AreaChart data={getChartData('date')} dataKey="value" xAxisDataKey="name" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Country</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <BarChart data={getChartData('country')} dataKey="value" xAxisDataKey="name" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By SKU</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <BarChart data={getChartData('sku')} dataKey="value" xAxisDataKey="name" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Raw Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">ID</th>
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Value</th>
                          <th className="text-left p-3">Country</th>
                          <th className="text-left p-3">SKU</th>
                          <th className="text-left p-3">Platform</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.rawData.slice(0, 50).map((item, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-3">{item.id}</td>
                            <td className="p-3">{item.date}</td>
                            <td className="p-3 font-medium">{formatValue(item.value, breakdown.format)}</td>
                            <td className="p-3">{item.country || '-'}</td>
                            <td className="p-3">{item.sku || '-'}</td>
                            <td className="p-3">{item.platform || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {breakdown.rawData.length > 50 && (
                      <p className="text-xs text-muted-foreground mt-4 text-center">
                        Showing first 50 records of {breakdown.rawData.length} total
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
} 