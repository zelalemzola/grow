import { create } from 'zustand';

interface PaymentFeeState {
  feePercentages: Record<string, number>;
  setFeePercentage: (method: string, percentage: number) => void;
  setMultipleFeePercentages: (fees: Record<string, number>) => void;
  loadFees: () => Promise<void>;
  saveFee: (method: string, percentage: number) => Promise<void>;
}

export const usePaymentFeeStore = create<PaymentFeeState>((set, get) => ({
  feePercentages: {},
  setFeePercentage: (method, percentage) => {
    set((state) => ({
      feePercentages: {
        ...state.feePercentages,
        [method.toLowerCase()]: percentage,
      },
    }));
  },
  setMultipleFeePercentages: (fees) => {
    set((state) => ({
      feePercentages: {
        ...state.feePercentages,
        ...Object.fromEntries(
          Object.entries(fees).map(([k, v]) => [k.toLowerCase(), v])
        ),
      },
    }));
  },
  loadFees: async () => {
    const res = await fetch('/api/payment-fees');
    if (!res.ok) return;
    const data = await res.json();
    const fees: Record<string, number> = {};
    for (const row of data) {
      fees[row.paySource.toLowerCase()] = row.percentage;
    }
    set({ feePercentages: fees });
  },
  saveFee: async (method, percentage) => {
    const res = await fetch('/api/payment-fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paySource: method, percentage }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const fees: Record<string, number> = {};
    for (const row of data) {
      fees[row.paySource.toLowerCase()] = row.percentage;
    }
    set({ feePercentages: fees });
  },
})); 