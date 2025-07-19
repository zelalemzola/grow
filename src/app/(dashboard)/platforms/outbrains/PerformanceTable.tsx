"use client";
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Eye, Info, DollarSign, Target, Calendar } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const alwaysShow = [
  { key: 'name', label: 'Campaign Name', tooltip: 'The name of the campaign.' },
  { key: 'id', label: 'Campaign ID', tooltip: 'Unique identifier for the campaign.' },
];

export default function PerformanceTable({ marketerId, campaignId, budgetId, from, to }: { marketerId: string, campaignId?: string, budgetId?: string, from: Date, to: Date }) {
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    hasConversions: 'all'
  });

  const fetchPerformance = async (params: Record<string, string | undefined>) => {
    const url = new URL('/api/outbrain/performance', window.location.origin);
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch performance');
    return res.json();
  };

  const { data, error, isLoading } = useQuery({
    queryKey: ['outbrain', 'performance', marketerId, campaignId, budgetId, from?.toISOString().slice(0,10), to?.toISOString().slice(0,10)],
    queryFn: () => fetchPerformance({
      marketerId,
      campaignId,
      budgetId,
      from: from ? from.toISOString().slice(0, 10) : undefined,
      to: to ? to.toISOString().slice(0, 10) : undefined,
    }),
    enabled: !!marketerId,
  });

  // Flatten metadata and metrics for each row, and collect all possible keys
  const { rows, allKeys } = useMemo(() => {
    if (!data || !Array.isArray(data.results)) return { rows: [], allKeys: [] };
    const keys = new Set<string>();
    const rows = data.results.map((item: any) => {
      const flat: Record<string, any> = { ...item.metadata, ...item.metrics };
      // Flatten budget fields
      if (item.metadata?.budget) {
        Object.entries(item.metadata.budget).forEach(([k, v]) => {
          flat[`budget.${k}`] = v;
        });
      }
      // Add all keys
      Object.keys(flat).forEach(k => keys.add(k));
      return flat;
    }).filter((row: any) => {
      // Has conversions filter
      const conversions = Number(row.conversions || 0);
      if (filters.hasConversions === 'yes' && conversions === 0) return false;
      if (filters.hasConversions === 'no' && conversions > 0) return false;
      
      return true;
    });
    return { rows, allKeys: Array.from(keys) };
  }, [data, filters]);

  // Build columns: always show a few, then all others found in data, but exclude raw 'budget'
  const columns = [
    ...alwaysShow.map(col => ({ ...col, visible: true })),
    ...allKeys.filter(k => !alwaysShow.some(col => col.key === k) && k !== 'budget').map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim(),
      visible: true,
      tooltip: `Field from Outbrain API: ${key}`,
    })),
  ];

  // Custom cell rendering for all types
  const formatRow = (row: any) => {
    const formatted: Record<string, any> = {};
    for (const key of allKeys) {
      if (key === 'budget') continue; // skip raw budget object
      let value = row[key];
      if (typeof value === 'boolean') {
        formatted[key] = value ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>;
      } else if (typeof value === 'object' && value !== null) {
        formatted[key] = <pre className="text-xs bg-muted p-1 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
      } else if (value === 0) {
        formatted[key] = 0;
      } else if (value === '' || value === undefined || value === null) {
        formatted[key] = '-';
      } else {
        formatted[key] = value;
      }
    }
    // Special: show conversionMetrics if present
    if (row.conversionMetrics && Array.isArray(row.conversionMetrics) && row.conversionMetrics.length > 0) {
      formatted['conversionMetrics'] = <details><summary>Details</summary><ul className="text-xs space-y-1">{row.conversionMetrics.map((cm: any, i: number) => <li key={i}><b>{cm.name}:</b> {cm.conversions} conv, CPA: {cm.cpa}, ROAS: {cm.roas}</li>)}</ul></details>;
    }
    return formatted;
  };

  // Handle row expand/collapse
  const handleRowToggle = (rowId: string) => {
    setExpandedRows(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
  };

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Date pickers are now controlled by parent, so just display the range */}
        <span className="text-sm text-muted-foreground">Showing data from <b>{from ? from.toISOString().slice(0,10) : ''}</b> to <b>{to ? to.toISOString().slice(0,10) : ''}</b></span>
        <Select
          value={filters.hasConversions}
          onValueChange={value => setFilters(f => ({ ...f, hasConversions: value }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Conversions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conversions</SelectItem>
            <SelectItem value="yes">Has Conversions</SelectItem>
            <SelectItem value="no">No Conversions</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        data={rows.map(formatRow)}
        columns={columns}
        onColumnToggle={() => {}}
        searchable={false}
        filterable={false}
        exportable={true}
        expandable={true}
        expandedRows={expandedRows}
        onRowToggle={handleRowToggle}
      />
      {isLoading && <div className="text-muted-foreground mt-2">Loading performance data...</div>}
      {error && <div className="text-red-600 mt-2">Error: {(error as Error).message}</div>}
    </div>
  );
} 