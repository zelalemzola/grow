'use client'
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Info, CheckCircle, XCircle, Clock, Calendar, Target, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const fetchBudgets = async (marketerId: string) => {
  const res = await fetch(`/api/outbrain/budgets?marketerId=${marketerId}`);
  if (!res.ok) throw new Error('Failed to fetch budgets');
  return res.json();
};

export default function BudgetsList({ marketerId, onDetails }: { marketerId: string, onDetails?: (data: any) => void }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['outbrain', 'budgets', marketerId],
    queryFn: () => fetchBudgets(marketerId),
    enabled: !!marketerId,
  });

  const [filters, setFilters] = useState({ 
    search: '', 
    type: 'all', 
    pacing: 'all', 
    shared: 'all',
    runForever: 'all',
    currency: 'all'
  });
  const budgets = useMemo(() => data?.budgets ?? [], [data]);

  // Filtering logic
  const filtered = useMemo(() => {
    return budgets.filter((b: any) => {
      if (filters.search && !b.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.type !== 'all' && (b.type || '').toLowerCase() !== filters.type) return false;
      if (filters.pacing !== 'all' && (b.pacing || '').toLowerCase() !== filters.pacing) return false;
      if (filters.shared !== 'all') {
        const isShared = b.shared ? 'yes' : 'no';
        if (isShared !== filters.shared) return false;
      }
      if (filters.runForever !== 'all') {
        const runsForever = b.runForever ? 'yes' : 'no';
        if (runsForever !== filters.runForever) return false;
      }
      if (filters.currency !== 'all' && (b.currency || '').toLowerCase() !== filters.currency) return false;
      return true;
    });
  }, [budgets, filters]);

  const columns = [
    { key: 'name', label: 'Name', visible: true, sortable: true },
    { key: 'id', label: 'ID', visible: false },
    { key: 'amount', label: 'Amount', visible: true },
    { key: 'amountSpent', label: 'Spent', visible: true },
    { key: 'amountRemaining', label: 'Remaining', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'currency', label: 'Currency', visible: true },
    { key: 'creationTime', label: 'Created', visible: true },
    { key: 'lastModified', label: 'Modified', visible: true },
    { key: 'pacing', label: 'Pacing', visible: true },
    { key: 'runForever', label: 'Run Forever', visible: true },
    { key: 'shared', label: 'Shared', visible: true },
    { key: 'startDate', label: 'Start Date', visible: true },
  ];

  const formatRow = (row: any) => ({
    ...row,
    // Pass raw numbers, let DataTable format as currency
    // amount: typeof row.amount === 'number' ? `$${row.amount}` : '-',
    // amountSpent: typeof row.amountSpent === 'number' ? `$${row.amountSpent}` : '-',
    // amountRemaining: typeof row.amountRemaining === 'number' ? `$${row.amountRemaining}` : '-',
    type: row.type ? <Badge variant="outline" className="flex items-center gap-1"><Info className="h-3 w-3" />{row.type}</Badge> : '-',
    pacing: row.pacing ? <Badge variant="outline" className="flex items-center gap-1"><Target className="h-3 w-3" />{row.pacing}</Badge> : '-',
    currency: row.currency ? <Badge variant="outline" className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{row.currency}</Badge> : '-',
    runForever: row.runForever ? <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Yes</Badge> : <Badge variant="secondary" className="bg-gray-100 text-gray-800 flex items-center gap-1"><XCircle className="h-3 w-3" />No</Badge>,
    shared: row.shared ? <Badge variant="default" className="bg-blue-100 text-blue-800 flex items-center gap-1"><Users className="h-3 w-3" />Yes</Badge> : <Badge variant="secondary" className="bg-gray-100 text-gray-800 flex items-center gap-1"><XCircle className="h-3 w-3" />No</Badge>,
    name: <span>{row.name}</span>,
  });

  if (!marketerId) return null;
  if (isLoading) return (
    <div className="bg-white rounded shadow p-4 mb-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded w-full" />
        ))}
      </div>
    </div>
  );
  if (error) return <div className="bg-red-100 text-red-700 p-3 rounded mb-4">Error loading budgets: {(error as Error).message}</div>;
  if (budgets.length === 0) return <div className="bg-yellow-100 text-yellow-700 p-3 rounded mb-4 flex items-center gap-2"><span>⚠️</span>No budgets found.</div>;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          type="text"
          placeholder="Search budgets..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="w-48"
        />
        <Select
          value={filters.type}
          onValueChange={value => setFilters(f => ({ ...f, type: value }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="lifetime">Lifetime</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.pacing}
          onValueChange={value => setFilters(f => ({ ...f, pacing: value }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Pacing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pacing</SelectItem>
            <SelectItem value="spend_asap">Spend ASAP</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.shared}
          onValueChange={value => setFilters(f => ({ ...f, shared: value }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Shared" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shared</SelectItem>
            <SelectItem value="yes">Shared</SelectItem>
            <SelectItem value="no">Not Shared</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.runForever}
          onValueChange={value => setFilters(f => ({ ...f, runForever: value }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Run Forever" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Run Forever</SelectItem>
            <SelectItem value="yes">Run Forever</SelectItem>
            <SelectItem value="no">Limited Time</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.currency}
          onValueChange={value => setFilters(f => ({ ...f, currency: value }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Currencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            <SelectItem value="usd">USD</SelectItem>
            <SelectItem value="eur">EUR</SelectItem>
            <SelectItem value="gbp">GBP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        data={filtered.map(formatRow)}
        columns={columns}
        onColumnToggle={() => {}}
        searchable={false}
        filterable={false}
        exportable={true}
        expandable={true}
        onRowToggle={id => {
          const budget = budgets.find((b: any) => b.id === id);
          if (onDetails && budget) onDetails(budget);
        }}
      />
    </div>
  );
} 