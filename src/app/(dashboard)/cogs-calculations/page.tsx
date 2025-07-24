"use client"
import { useEffect, useMemo, useState, useRef } from "react";
import { useCogsStore, COGSProduct } from "@/lib/cogsStore";
import { useDateRangeStore } from "@/lib/dateRangeStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";

// Dummy fetchOrders function (replace with real API call)
async function fetchOrders(from: string, to: string) {
  const res = await fetch(`/api/checkoutchamp?startDate=${from}&endDate=${to}`);
  if (!res.ok) return [];
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
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

export default function CogsCalculationsPage() {
  const { from, to, setDateRange, load: loadDateRange } = useDateRangeStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aggregatedProducts, setAggregatedProducts] = useState<COGSProduct[]>([]);
  const { products: dbProducts, setProduct, setProducts, totalCogs, loadCogsProducts, saveCogsProduct } = useCogsStore();
  const [calendarOpen, setCalendarOpen] = useState<{ from: boolean; to: boolean }>({ from: false, to: false });
  const [saveStatus, setSaveStatus] = useState<{ [sku: string]: 'idle' | 'saving' | 'saved' | 'error' }>({});

  // Load DB products on mount
  useEffect(() => {
    loadCogsProducts();
    loadDateRange();
  }, [loadCogsProducts, loadDateRange]);

  // Fetch orders and aggregate products when date range changes
  useEffect(() => {
    setLoading(true);
    fetchOrders(from, to).then(data => {
      setOrders(data);
      setLoading(false);
      setAggregatedProducts(aggregateProducts(data));
    });
  }, [from, to]);

  // Merge DB product costs into aggregated products whenever aggregatedProducts changes
  useEffect(() => {
    setProducts(
      aggregatedProducts.map(p => ({
        ...p,
        productCost: dbProducts[p.sku]?.productCost ?? 0,
      }))
    );
  }, [aggregatedProducts, setProducts]);

  // Handlers for calendar
  const handleDateChange = (field: 'from' | 'to', date: Date | undefined) => {
    if (!date) return;
    setDateRange(field === 'from' ? date.toISOString().slice(0, 10) : from, field === 'to' ? date.toISOString().slice(0, 10) : to);
  };

  // Render table rows
  const productRows = useMemo(() => Object.values(dbProducts), [dbProducts]);

  return (
    <div className="container-responsive space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>COGS Calculations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            {/* Start Date Calendar */}
            <Popover open={calendarOpen.from} onOpenChange={open => setCalendarOpen(c => ({ ...c, from: open }))}>
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
            <Popover open={calendarOpen.to} onOpenChange={open => setCalendarOpen(c => ({ ...c, to: open }))}>
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
            {/* Save button removed: changes are saved instantly when edited */}
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
                <div className="text-2xl font-bold text-purple-600">€ {totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 