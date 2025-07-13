'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Filter, 
  X, 
  Calendar,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { DashboardFilters } from '@/lib/types';

interface FilterPanelProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onReset: () => void;
}

export function FilterPanel({ filters, onFiltersChange, onReset }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Update active filters when filters change
  useEffect(() => {
    const active: string[] = [];
    if (filters.brand) active.push('brand');
    if (filters.sku) active.push('sku');
    if (filters.adPlatform) active.push('adPlatform');
    if (filters.country) active.push('country');
    if (filters.paymentMethod) active.push('paymentMethod');
    if (filters.dateRange.from || filters.dateRange.to) active.push('dateRange');
    setActiveFilters(active);
  }, [filters]);

  const handleFilterChange = (key: keyof DashboardFilters, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value,
    };
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    const newFilters = {
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      },
    };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onReset();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.brand) count++;
    if (filters.sku) count++;
    if (filters.adPlatform) count++;
    if (filters.country) count++;
    if (filters.paymentMethod) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  };

  const activeCount = getActiveFiltersCount();

  return (
    <Card className="w-full border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-muted rounded-lg">
              <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg font-semibold">Filters</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Refine your data view
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-primary/10 rounded-full">
                <span className="text-xs font-medium text-primary">{activeCount}</span>
                <span className="text-xs text-primary">active</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="hover:bg-muted p-2"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-destructive p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Date Range */}
            <div className="space-y-3 sm:col-span-2 lg:col-span-1">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Date Range</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="date-from" className="text-xs text-muted-foreground">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={filters.dateRange.from}
                    onChange={(e) => handleDateRangeChange('from', e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date-to" className="text-xs text-muted-foreground">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={filters.dateRange.to}
                    onChange={(e) => handleDateRangeChange('to', e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-3">
              <Label htmlFor="brand" className="text-sm font-medium">Brand</Label>
              <Input
                id="brand"
                placeholder="Filter by brand..."
                value={filters.brand || ''}
                onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
                className="text-sm h-9"
              />
            </div>

            {/* SKU */}
            <div className="space-y-3">
              <Label htmlFor="sku" className="text-sm font-medium">SKU</Label>
              <Input
                id="sku"
                placeholder="Filter by SKU..."
                value={filters.sku || ''}
                onChange={(e) => handleFilterChange('sku', e.target.value || undefined)}
                className="text-sm h-9"
              />
            </div>

            {/* Country */}
            <div className="space-y-3">
              <Label htmlFor="country" className="text-sm font-medium">Country</Label>
              <Input
                id="country"
                placeholder="Filter by country..."
                value={filters.country || ''}
                onChange={(e) => handleFilterChange('country', e.target.value || undefined)}
                className="text-sm h-9"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label htmlFor="paymentMethod" className="text-sm font-medium">Payment Method</Label>
              <Input
                id="paymentMethod"
                placeholder="Filter by payment method..."
                value={filters.paymentMethod || ''}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value || undefined)}
                className="text-sm h-9"
              />
            </div>

            {/* Ad Platform */}
            <div className="space-y-3">
              <Label htmlFor="adPlatform" className="text-sm font-medium">Ad Platform</Label>
              <select
                id="adPlatform"
                value={filters.adPlatform || ''}
                onChange={(e) => handleFilterChange('adPlatform', e.target.value || undefined)}
                className="w-full h-9 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">All Platforms</option>
                <option value="outbrain">Outbrain</option>
                <option value="taboola">Taboola</option>
                <option value="adup">AdUp</option>
              </select>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 