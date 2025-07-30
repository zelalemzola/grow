import { create } from 'zustand';

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
  loadCogsProducts: () => Promise<void>;
  saveCogsProduct: (sku: string, productCost: number, name?: string) => Promise<void>;
  save: () => void;
  load: () => void;
}

function calculateTotalCogs(products: Record<string, COGSProduct>) {
  return Object.values(products).reduce((sum, p) => sum + Number(p.productCost) * Number(p.qty), 0);
}

export const useCogsStore = create<COGSStoreState>((set, get) => ({
  products: {},
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
  totalCogs: 0,
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