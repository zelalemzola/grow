import { create } from 'zustand';
import { Order } from './types';

export interface COGSProduct {
  sku: string;
  name?: string;
  price: number;
  productCost: number;
  qty: number;
}

interface COGSStoreState {
  products: Record<string, COGSProduct>;
  setProduct: (sku: string, data: Partial<COGSProduct>) => void;
  setProducts: (products: COGSProduct[]) => void;
  totalCogs: number;
  isCalculating: boolean;
  loadCogsProducts: () => Promise<void>;
  saveCogsProduct: (sku: string, productCost: number, name?: string) => Promise<void>;
  calculateCogsFromOrders: (orders: Order[], products: any[]) => Promise<void>;
  save: () => void;
  load: () => void;
}

function calculateTotalCogs(products: Record<string, COGSProduct>) {
  return Object.values(products).reduce((sum, p) => sum + Number(p.productCost) * Number(p.qty), 0);
}

// Helper function to aggregate products from orders
function aggregateProductsFromOrders(orders: Order[]): COGSProduct[] {
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
          productCost: 0, // Will be populated from database
          qty: 0,
        };
      }
      map[sku].qty += Number(item.qty) || 1;
    }
  }
  
  return Object.values(map);
}

export const useCogsStore = create<COGSStoreState>((set, get) => ({
  products: {},
  totalCogs: 0,
  isCalculating: false,
  
  setProduct: (sku, data) => {
    set(state => {
      const updated = {
        ...state.products,
        [sku]: { ...state.products[sku], ...data },
      };
      // If productCost is being updated, persist it
      if (data.productCost !== undefined) {
        get().saveCogsProduct(sku, data.productCost, updated[sku].name);
      }
      return {
        products: updated,
        totalCogs: calculateTotalCogs(updated),
      };
    });
  },
  
  setProducts: (products) => set(state => {
    const map = products.reduce((acc, p) => {
      acc[p.sku] = p;
      return acc;
    }, {} as Record<string, COGSProduct>);
    return {
      products: map,
      totalCogs: calculateTotalCogs(map),
    };
  }),
  
  // New: Background COGS calculation from orders
  calculateCogsFromOrders: async (orders: Order[], products: any[]) => {
    try {
      set({ isCalculating: true });
      
      // Step 1: Load existing COGS data from database
      const dbRes = await fetch('/api/cogs-products');
      const dbData = dbRes.ok ? await dbRes.json() : [];
      const dbProductsMap = dbData.reduce((acc: Record<string, any>, p: any) => {
        acc[p.sku] = p;
        return acc;
      }, {});
      
      // Step 2: Aggregate products from orders
      const orderProducts = aggregateProductsFromOrders(orders);
      
      // Step 3: Merge with database values
      const mergedProducts = orderProducts.map(product => ({
        ...product,
        productCost: dbProductsMap[product.sku]?.productCost ?? 0, // Use DB value if exists
      }));
      
      // Step 4: Update store with merged data
      set(state => {
        const map = mergedProducts.reduce((acc, p) => {
          acc[p.sku] = p;
          return acc;
        }, {} as Record<string, COGSProduct>);
        
        return {
          products: map,
          totalCogs: calculateTotalCogs(map),
          isCalculating: false,
        };
      });
      
      console.log('✅ Background COGS calculation completed:', {
        ordersCount: orders.length,
        productsCount: mergedProducts.length,
        totalCogs: calculateTotalCogs(mergedProducts.reduce((acc, p) => { acc[p.sku] = p; return acc; }, {} as Record<string, COGSProduct>))
      });
      
    } catch (error) {
      console.error('❌ Error in background COGS calculation:', error);
      set({ isCalculating: false });
    }
  },
  
  loadCogsProducts: async () => {
    const res = await fetch('/api/cogs-products');
    if (!res.ok) return;
    const data = await res.json();
    set(state => {
      // Only update products that don't already exist or merge with existing ones
      const updatedProducts = { ...state.products };
      for (const p of data) {
        if (updatedProducts[p.sku]) {
          // Merge with existing product, keeping price and qty
          updatedProducts[p.sku] = {
            ...updatedProducts[p.sku],
            productCost: p.productCost,
            name: p.name || updatedProducts[p.sku].name,
          };
        } else {
          // Add new product from DB
          updatedProducts[p.sku] = {
            sku: p.sku,
            name: p.name,
            price: 0,
            productCost: p.productCost,
            qty: 0,
          };
        }
      }
      return {
        products: updatedProducts,
        totalCogs: calculateTotalCogs(updatedProducts),
      };
    });
  },
  
  saveCogsProduct: async (sku, productCost, name) => {
    const res = await fetch('/api/cogs-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, productCost, name }),
    });
    if (!res.ok) return;
    const data = await res.json();
    set(state => {
      // Merge DB products with existing products
      const updated: Record<string, COGSProduct> = { ...state.products };
      for (const p of data) {
        updated[p.sku] = {
          ...updated[p.sku],
          sku: p.sku,
          name: p.name,
          productCost: p.productCost,
        };
      }
      return {
        products: updated,
        totalCogs: calculateTotalCogs(updated),
      };
    });
  },
  
  save: () => {}, // No-op, kept for compatibility
  load: () => {}, // No-op, kept for compatibility
})); 

// React Query hook for COGS products with 15-minute revalidation
export const useCogsProductsQuery = () => {
  const { useQuery } = require('@tanstack/react-query');
  
  return useQuery<any[]>({
    queryKey: ['cogs-products'],
    queryFn: async () => {
      const res = await fetch('/api/cogs-products');
      if (!res.ok) return [];
      return await res.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}; 