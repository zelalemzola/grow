import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fetch EUR to USD rate from external API and cache in localStorage for 1 day
export async function getEurToUsdRate(): Promise<number> {
  const CACHE_KEY = 'eur_usd_rate';
  const CACHE_TIME_KEY = 'eur_usd_rate_time';
  const ONE_DAY = 24 * 60 * 60 * 1000;
  // Check localStorage for cached value
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    if (cached && cachedTime && Date.now() - Number(cachedTime) < ONE_DAY) {
      const rate = parseFloat(cached);
      if (!isNaN(rate)) return rate;
    }
  }
  // Fetch from API
  const apiKey = process.env.FOREX_API;
  if (!apiKey) throw new Error('FOREX_API key not set in env');
  const res = await fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${apiKey}&base_currency=EUR&currencies=USD`);
  if (!res.ok) throw new Error('Failed to fetch EUR to USD rate');
  const data = await res.json();
  const rate = data?.data?.USD;
  if (typeof rate === 'number') {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, rate.toString());
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    }
    return rate;
  }
  throw new Error('Invalid EUR to USD rate from API');
}
