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
      if (!isNaN(rate) && rate > 0) return rate;
    }
  }
  
  try {
    // Fetch from API
    const apiKey = process.env.FOREX_API;
    if (!apiKey) {
      console.warn('FOREX_API key not set in env, using fallback rate');
      return 1.16; // Conservative fallback rate (closer to current market rate)
    }
    
    const res = await fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${apiKey}&base_currency=EUR&currencies=USD`);
    if (!res.ok) {
      console.warn('Failed to fetch EUR to USD rate from API, using fallback rate');
      return 1.16; // Conservative fallback rate
    }
    
    const data = await res.json();
    const rate = data?.data?.USD;
    
    if (typeof rate === 'number' && rate > 0) {
      // Cache the successful rate
      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY, rate.toString());
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      }
      return rate;
    } else {
      console.warn('Invalid EUR to USD rate from API, using fallback rate');
      return 1.16; // Conservative fallback rate
    }
  } catch (error) {
    console.warn('Error fetching EUR to USD rate, using fallback rate:', error);
    return 1.16; // Conservative fallback rate
  }
}

// Timezone utilities for consistent date handling
export function standardizeDateToUTC(dateString: string, sourceTimezone: string = 'Europe/Berlin'): string {
  try {
    // Parse the date string and assume it's in the source timezone
    const date = new Date(dateString);
    
    // If the date is invalid, return the original string
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return dateString;
    }
    
    // Convert to UTC ISO string and extract just the date part
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error standardizing date:', error);
    return dateString;
  }
}

export function convertDateRangeToUTC(from: string, to: string, sourceTimezone: string = 'Europe/Berlin'): { from: string; to: string } {
  return {
    from: standardizeDateToUTC(from, sourceTimezone),
    to: standardizeDateToUTC(to, sourceTimezone)
  };
}

export function getDateInTimezone(date: string, targetTimezone: string = 'UTC'): string {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return date;
    }
    
    // For now, we'll return UTC dates since that's what we need
    // In the future, this could be enhanced with a proper timezone library
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error converting date timezone:', error);
    return date;
  }
}
