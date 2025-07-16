'use client'
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Info, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useMemo } from 'react';

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

  const [filters, setFilters] = useState({ search: '', type: 'all' });
  const budgets = useMemo(() => data?.budgets ?? [], [data]);

  // Filtering logic
  const filtered = useMemo(() => {
    return budgets.filter((b: any) => {
      if (filters.search && !b.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.type !== 'all' && (b.type || '').toLowerCase() !== filters.type) return false;
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
    runForever: row.runForever ? 'Yes' : 'No',
    shared: row.shared ? 'Yes' : 'No',
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
        <input
          type="text"
          placeholder="Search budgets..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="border px-2 py-1 rounded text-sm"
        />
        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="border px-2 py-1 rounded text-sm"
        >
          <option value="all">All Types</option>
          <option value="daily">Daily</option>
          <option value="lifetime">Lifetime</option>
        </select>
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