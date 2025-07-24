import { create } from 'zustand';

interface DateRangeState {
  from: string;
  to: string;
  setDateRange: (from: string, to: string) => void;
  load: () => void;
  save: () => void;
}

const defaultRange = () => {
  const today = new Date();
  const from = new Date(today);
  from.setMonth(today.getMonth() - 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
};

export const useDateRangeStore = create<DateRangeState>((set, get) => ({
  ...defaultRange(),
  setDateRange: (from, to) => {
    set({ from, to });
    get().save();
  },
  load: () => {
    const raw = localStorage.getItem('global-date-range');
    if (raw) {
      const { from, to } = JSON.parse(raw);
      set({ from, to });
    }
  },
  save: () => {
    const { from, to } = get();
    localStorage.setItem('global-date-range', JSON.stringify({ from, to }));
  },
})); 