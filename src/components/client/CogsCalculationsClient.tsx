"use client"
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCogsStore, COGSProduct } from "@/lib/cogsStore";
import { useDateRangeStore } from "@/lib/dateRangeStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";
import { History } from "lucide-react";

// Types for the props
interface CogsCalculationsClientProps {
  initialOrders: any[];
}

function aggregateProducts(orders: any[]): COGSProduct[] {
  const map: Record<string, COGSProduct> = {};
  for (const order of orders) {
    if (!order.items) continue;
    for (const item of Object.values(order.items) as any[]) {
      const sku = (item.productSku || '').trim().toUpperCase();
      if (!sku) continue;
      if (!map[sku]) {
        map[sku] = {
          sku,
          name: item.name || sku,
          price: Number(item.price) || 0,
          productCost: 0,
          qty: 0,
        };
      }
      map[sku].qty += Number(item.qty) || 1;
    }
  }
  return Object.values(map);
}

export default function CogsCalculationsClient({ initialOrders }: CogsCalculationsClientProps) {
  const { from, to, setDateRange, load: loadDateRange } = useDateRangeStore();
  const { products: dbProducts, setProduct, setProducts, totalCogs, loadCogsProducts, saveCogsProduct } = useCogsStore();
  const [calendarOpen, setCalendarOpen] = useState<{ from: boolean; to: boolean }>({ from: false, to: false });
  const [saveStatus, setSaveStatus] = useState<{ [sku: string]: 'idle' | 'saving' | 'saved' | 'error' }>({});
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  // Initialize date range from URL params
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadDateRange();
    }
  }, [loadDateRange]);

  // React Query for orders data with proper caching
  const { data: ordersData, isLoading: ordersLoading, isRefetching: ordersRefetching, refetch: refetchOrders } = useQuery<any[]>({
    queryKey: ['cogs-orders', { from, to }],
    queryFn: async () => {
      console.log('🔄 Refetching COGS orders for date range:', { from, to });
      const res = await fetch(`/api/checkoutchamp?startDate=${from}&endDate=${to}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    },
    initialData: initialOrders, // Use server-fetched data as initial data
    enabled: false, // Disable automatic refetching
    staleTime: Infinity, // Data never becomes stale automatically
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  // React Query for COGS products data
  const { data: cogsProductsData, isLoading: cogsLoading } = useQuery<any[]>({
    queryKey: ['cogs-products'],
    queryFn: async () => {
      const res = await fetch('/api/cogs-products');
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: false, // Disable automatic refetching
    staleTime: Infinity, // Data never becomes stale automatically
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Manual refetch when date range changes
  useEffect(() => {
    if (from && to && ordersData && ordersData.length > 0) {
      console.log('📅 Date range changed, manually refetching COGS orders:', { from, to });
      refetchOrders();
    }
  }, [from, to, refetchOrders]);

  // Process orders and products when data changes
  useEffect(() => {
    const processData = async () => {
      try {
        await loadCogsProducts(); // Load COGS products from store
        
        if (ordersData && ordersData.length > 0 && cogsProductsData) {
          // Create a map of existing COGS products
          const cogsProductsMap = cogsProductsData.reduce((acc: Record<string, any>, p: any) => {
            acc[p.sku] = p;
            return acc;
          }, {});
          
          // Aggregate products from orders
          const aggregated = aggregateProducts(ordersData);
          const productsWithCosts = aggregated.map(p => ({
            ...p,
            productCost: cogsProductsMap[p.sku]?.productCost ?? 0, // Use existing COGS values
          }));
          setProducts(productsWithCosts);
        }
      } catch (error) {
        console.error('Error processing COGS data:', error);
        setError('Failed to process data');
      }
    };
    
    processData();
  }, [ordersData, cogsProductsData, loadCogsProducts, setProducts]);

  // Handlers for calendar
  const handleDateChange = useCallback((field: 'from' | 'to', date: Date | undefined) => {
    if (!date) return;
    const newFrom = field === 'from' ? date.toISOString().slice(0, 10) : from;
    const newTo = field === 'to' ? date.toISOString().slice(0, 10) : to;
    
    // Navigate to trigger server-side refetch
    window.location.href = `/cogs-calculations?from=${newFrom}&to=${newTo}`;
  }, [from, to]);

  // Memoize popover state handlers
  const handleFromOpenChange = useCallback((open: boolean) => {
    setCalendarOpen(c => ({ ...c, from: open }));
  }, []);

  const handleToOpenChange = useCallback((open: boolean) => {
    setCalendarOpen(c => ({ ...c, to: open }));
  }, []);

  // Render table rows
  const productRows = useMemo(() => Object.values(dbProducts), [dbProducts]);

  // Show loading state
  if (ordersLoading || cogsLoading) {
    return (
      <div className="container-responsive space-y-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>COGS Calculations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container-responsive space-y-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>COGS Calculations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-red-500 mb-4">⚠️</div>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-responsive space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            COGS Calculations
            {ordersRefetching && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            {/* Start Date Calendar */}
            <Popover open={calendarOpen.from} onOpenChange={handleFromOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start text-left">
                  {from ? format(new Date(from), 'yyyy-MM-dd') : 'Start Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={from ? new Date(from) : undefined}
                  onSelect={date => handleDateChange('from', date)}
                  initialFocus
                  toDate={to ? new Date(to) : undefined}
                />
              </PopoverContent>
            </Popover>
            {/* End Date Calendar */}
            <Popover open={calendarOpen.to} onOpenChange={handleToOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start text-left">
                  {to ? format(new Date(to), 'yyyy-MM-dd') : 'End Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={to ? new Date(to) : undefined}
                  onSelect={date => handleDateChange('to', date)}
                  initialFocus
                  fromDate={from ? new Date(from) : undefined}
                  toDate={new Date()}
                />
              </PopoverContent>
            </Popover>
            {/* Manual Refresh Button */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                console.log('🔄 Manual refresh triggered for COGS calculations');
                refetchOrders();
              }}
              disabled={ordersRefetching}
              className="flex items-center gap-2"
            >
              {ordersRefetching ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <History className="w-4 h-4" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Product Name</th>
                  <th className="p-2 text-left">SKU</th>
                  <th className="p-2 text-left">Price</th>
                  <th className="p-2 text-left">Product Cost</th>
                  <th className="p-2 text-left">Qty</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map(product => (
                  <tr key={product.sku} className="border-b">
                    <td className="p-2">{product.name}</td>
                    <td className="p-2">{product.sku}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={product.price}
                        onChange={e => setProduct(product.sku, { price: Number(e.target.value) })}
                        className="w-24"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={product.productCost}
                        onChange={async e => {
                          setSaveStatus(s => ({ ...s, [product.sku]: 'saving' }));
                          try {
                            await saveCogsProduct(product.sku, Number(e.target.value), product.name);
                            setSaveStatus(s => ({ ...s, [product.sku]: 'saved' }));
                            setTimeout(() => setSaveStatus(s => ({ ...s, [product.sku]: 'idle' })), 1200);
                          } catch {
                            setSaveStatus(s => ({ ...s, [product.sku]: 'error' }));
                          }
                        }}
                        className="w-24"
                      />
                      {saveStatus[product.sku] === 'saving' && <span className="text-xs text-blue-500 ml-2">Saving...</span>}
                      {saveStatus[product.sku] === 'saved' && <span className="text-xs text-green-600 ml-2">Saved!</span>}
                      {saveStatus[product.sku] === 'error' && <span className="text-xs text-red-500 ml-2">Error!</span>}
                    </td>
                    <td className="p-2">{product.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end">
            <Card className="w-64 border-2 border-purple-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total COGS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">$ {totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 