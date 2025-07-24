import { create } from 'zustand';

interface OpexState {
  opex: number;
  setOpex: (value: number) => void;
  loadOpex: () => Promise<void>;
  saveOpex: (value: number) => Promise<void>;
}

export const useOpexStore = create<OpexState>((set) => ({
  opex: 0,
  setOpex: (value) => set({ opex: value }),
  loadOpex: async () => {
    const res = await fetch('/api/opex');
    if (!res.ok) return;
    const data = await res.json();
    set({ opex: data.value });
  },
  saveOpex: async (value) => {
    const res = await fetch('/api/opex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) return;
    const data = await res.json();
    set({ opex: data.value });
  },
})); 