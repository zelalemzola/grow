"use client"
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useCogsStore, COGSProduct } from "@/lib/cogsStore";
import { useDateRangeStore } from "@/lib/dateRangeStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const productsSetRef = useRef(false);

  // Initialize data only once
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      
      const init = async () => {
        try {
          setIsLoading(true);
          await loadDateRange();
          await loadCogsProducts(); // ✅ Wait for DB to load first
          
          // Get fresh DB data directly from API
          const dbRes = await fetch('/api/cogs-products');
          const dbData = dbRes.ok ? await dbRes.json() : [];
          const dbProductsMap = dbData.reduce((acc: Record<string, any>, p: any) => {
            acc[p.sku] = p;
            return acc;
          }, {});
          
          // Process initial orders AFTER DB is loaded
          if (initialOrders.length > 0) {
            const aggregated = aggregateProducts(initialOrders);
            const productsWithCosts = aggregated.map(p => ({
              ...p,
              productCost: dbProductsMap[p.sku]?.productCost ?? 0, // ✅ Use fresh DB values
            }));
            setProducts(productsWithCosts);
          }
        } catch (error) {
          console.error('Error initializing:', error);
          setError('Failed to load data');
        } finally {
          setIsLoading(false);
        }
      };
      
      init();
    }
    
    // Cleanup function to reset refs on unmount
    return () => {
      initialized.current = false;
      productsSetRef.current = false;
    };
  }, []); // ✅ Remove all dependencies to prevent loops

  // Reset productsSetRef when initialOrders change (new data from server)
  useEffect(() => {
    productsSetRef.current = false;
  }, [initialOrders]);

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
  if (isLoading) {
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
          <CardTitle>COGS Calculations</CardTitle>
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