import { create } from 'zustand';
import { standardizeDateToUTC } from './utils';

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
  
  // Standardize dates to UTC to ensure consistency across timezones
  return {
    from: standardizeDateToUTC(from.toISOString().slice(0, 10)),
    to: standardizeDateToUTC(today.toISOString().slice(0, 10)),
  };
};

export const useDateRangeStore = create<DateRangeState>((set, get) => ({
  ...defaultRange(),
  setDateRange: (from, to) => {
    // Standardize dates to UTC when setting to ensure consistency
    const standardizedFrom = standardizeDateToUTC(from);
    const standardizedTo = standardizeDateToUTC(to);
    set({ from: standardizedFrom, to: standardizedTo });
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