'use client'
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const fetchMarketers = async () => {
  const res = await fetch('/api/outbrain/marketers');
  if (!res.ok) throw new Error('Failed to fetch marketers');
  return res.json();
};

export default function MarketersList({ onSelect, selectedMarketerId }: { onSelect: (marketerId: string) => void, selectedMarketerId?: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['outbrain', 'marketers'],
    queryFn: fetchMarketers,
  });

  const [search, setSearch] = useState('');
  const marketers = (data?.marketers ?? []).filter((m: any) => m.name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return (
    <CardContent className="flex flex-col gap-2 animate-pulse">
      <div className="h-6 bg-muted rounded w-1/3 mb-2" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-4 bg-muted/50 rounded w-full" />
      ))}
    </CardContent>
  );
  if (error) return <CardContent className="bg-red-100 text-red-700 p-3 rounded mb-4">Error loading marketers: {(error as Error).message}</CardContent>;
  if (marketers.length === 0) return <CardContent className="bg-yellow-100 text-yellow-700 p-3 rounded mb-4 flex items-center gap-2"><span>⚠️</span>No marketers found.</CardContent>;

  return (
    <CardContent>
      <div className="mb-2 flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search marketers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border px-2 py-1 rounded text-sm w-full max-w-xs"
        />
      </div>
      <ScrollArea className="max-h-120">
        <ul className="space-y-1">
          {marketers.map((marketer: any) => (
            <li key={marketer.id}>
              <button
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded transition border ${selectedMarketerId === marketer.id ? 'bg-primary/10 border-primary text-primary font-bold' : 'hover:bg-muted border-transparent'}`}
                onClick={() => onSelect(marketer.id)}
              >
                <User className="h-4 w-4" />
                <span className="font-medium truncate">{marketer.name}</span>
                {/* <span className="ml-2 text-xs text-muted-foreground truncate">ID: {marketer.id}</span> */}
                {selectedMarketerId === marketer.id && <Badge variant="default" className="ml-auto flex items-center gap-1"><CheckCircle className="h-3 w-3" />Selected</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </CardContent>
  );
} 