'use client'
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Eye, Info, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const fetchCampaigns = async (marketerId: string) => {
  const res = await fetch(`/api/outbrain/campaigns?marketerId=${marketerId}`);
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  return res.json();
};

export default function CampaignsList({ marketerId, onSelect, selectedCampaignId, onDetails }: { marketerId: string; onSelect: (campaignId: string) => void, selectedCampaignId?: string, onDetails?: (data: any) => void }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['outbrain', 'campaigns', marketerId],
    queryFn: () => fetchCampaigns(marketerId),
    enabled: !!marketerId,
  });

  const [filters, setFilters] = useState({ search: '', status: 'all', type: 'all' });
  const campaigns = useMemo(() => data?.campaigns ?? [], [data]);

  // Filtering logic
  const filtered = useMemo(() => {
    return campaigns.filter((c: any) => {
      if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.status !== 'all' && (c.enabled ? 'active' : 'inactive') !== filters.status) return false;
      if (filters.type !== 'all' && (c.contentType || '').toLowerCase() !== filters.type) return false;
      return true;
    });
  }, [campaigns, filters]);

  const columns = [
    { key: 'name', label: 'Name', visible: true, sortable: true },
    { key: 'id', label: 'ID', visible: false },
    { key: 'enabled', label: 'Status', visible: true, sortable: true, tooltip: 'Active/Inactive' },
    { key: 'contentType', label: 'Type', visible: true, sortable: true },
    { key: 'objective', label: 'Objective', visible: true },
    { key: 'targetingPlatform', label: 'Targeting Platform', visible: true, sortable: true },
    { key: 'currency', label: 'Currency', visible: true, sortable: true },
    { key: 'cpc', label: 'CPC', visible: true },
    { key: 'creationTime', label: 'Created', visible: false },
    { key: 'lastModified', label: 'Modified', visible: false },
  ];

  const formatRow = (row: any) => ({
    ...row,
    enabled: row.enabled ? <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Active</Badge> : <Badge variant="secondary" className="bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="h-3 w-3" />Inactive</Badge>,
    contentType: row.contentType ? <Badge variant="outline" className="flex items-center gap-1"><Info className="h-3 w-3" />{row.contentType}</Badge> : '-',
    targetingPlatform: row.targeting?.platform && Array.isArray(row.targeting.platform) && row.targeting.platform.length > 0 ? 
      <Badge variant="outline" className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{row.targeting.platform.join(', ')}</Badge> : 
      <Badge variant="outline" className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />All Platforms</Badge>,
    currency: row.currency ? <Badge variant="outline" className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{row.currency}</Badge> : '-',
    cpc: row.cpc ? `$${row.cpc}` : '-',
    name: <span className={selectedCampaignId === row.id ? 'font-bold text-primary' : ''}>{row.name}</span>,
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
  if (error) return <div className="bg-red-100 text-red-700 p-3 rounded mb-4">Error loading campaigns: {(error as Error).message}</div>;
  if (campaigns.length === 0) return <div className="bg-yellow-100 text-yellow-700 p-3 rounded mb-4 flex items-center gap-2"><span>⚠️</span>No campaigns found.</div>;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          type="text"
          placeholder="Search campaigns..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="w-48"
        />
        <Select
          value={filters.status}
          onValueChange={value => setFilters(f => ({ ...f, status: value }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.type}
          onValueChange={value => setFilters(f => ({ ...f, type: value }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="articles">Articles</SelectItem>
            <SelectItem value="video">Video</SelectItem>
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
          const campaign = campaigns.find((c: any) => c.id === id);
          if (onDetails && campaign) onDetails(campaign);
        }}
      />
    </div>
  );
} 