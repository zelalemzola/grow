'use client'
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const fetchLocations = async (term: string) => {
  const res = await fetch(`/api/outbrain/locations?term=${encodeURIComponent(term)}`);
  if (!res.ok) throw new Error('Failed to fetch locations');
  return res.json();
};

export default function LocationsSearch() {
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const { data, error, isLoading } = useQuery({
    queryKey: ['outbrain', 'locations', search],
    queryFn: () => fetchLocations(search),
    enabled: !!search,
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Search Locations</h2>
      <form
        onSubmit={e => {
          e.preventDefault();
          setSearch(term);
        }}
        className="mb-2"
      >
        <input
          type="text"
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="Enter location term..."
          className="border px-2 py-1 mr-2"
        />
        <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded">Search</button>
      </form>
      {isLoading && <div>Loading locations...</div>}
      {error && <div>Error loading locations: {(error as Error).message}</div>}
      {data && Array.isArray(data) && (
        <ul>
          {data.map((loc: any) => (
            <li key={loc.id}>{loc.name} (ID: {loc.id})</li>
          ))}
        </ul>
      )}
    </div>
  );
} 