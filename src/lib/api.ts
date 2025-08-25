import axios, { AxiosInstance } from 'axios';
import {
  Order,
  AdSpendEntry,
  OutbrainResponse,
  TaboolaResponse,
  AdUpResponse,
  CheckoutChampResponse,
  APIConfig,
  DashboardFilters,
} from './types';

// API Configuration (should be moved to environment variables)
const API_CONFIG: APIConfig = {
  outbrain: {
    baseUrl: 'https://api.outbrain.com/amplify/v0.1/',
    token: process.env.OUTBRAIN_TOKEN || '',
  },
  taboola: {
    baseUrl: 'https://backstage.taboola.com',
    clientId: process.env.TABOOLA_CLIENT_ID || '',
    clientSecret: process.env.TABOOLA_CLIENT_SECRET || '',
    accountId: process.env.TABOOLA_ACCOUNT_ID || '',
  },
  adup: {
    baseUrl: 'https://api.adup.com',
    clientId: process.env.ADUP_CLIENT_ID || '',
    clientSecret: process.env.ADUP_CLIENT_SECRET || '',
  },
  checkoutChamp: {
    baseUrl: 'https://api.checkoutchamp.com',
    username: process.env.CHECKOUT_CHAMP_USERNAME || '',
    password: process.env.CHECKOUT_CHAMP_PASSWORD || '',
  },
};

// Create axios instances with authentication
const createTaboolaClient = async (): Promise<AxiosInstance> => {
  const client = axios.create({
    baseURL: API_CONFIG.taboola.baseUrl,
  });

  // Get OAuth2 token
  try {
    const tokenResponse = await axios.post('https://backstage.taboola.com/backstage/oauth/token', {
      client_id: API_CONFIG.taboola.clientId,
      client_secret: API_CONFIG.taboola.clientSecret,
      grant_type: 'client_credentials',
    });

    const token = tokenResponse.data.access_token;

    client.interceptors.request.use((config) => {
      config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });
  } catch (error) {
    console.error('Failed to get Taboola token:', error);
  }

  return client;
};

const createAdUpClient = async (): Promise<AxiosInstance> => {
  const client = axios.create({
    baseURL: API_CONFIG.adup.baseUrl,
  });

  // Get OAuth2 token
  try {
    const tokenResponse = await axios.post(`${API_CONFIG.adup.baseUrl}/oauth/token`, {
      client_id: API_CONFIG.adup.clientId,
      client_secret: API_CONFIG.adup.clientSecret,
      grant_type: 'client_credentials',
    });

    const token = tokenResponse.data.access_token;

    client.interceptors.request.use((config) => {
      config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });
  } catch (error) {
    console.error('Failed to get AdUp token:', error);
  }

  return client;
};

const createCheckoutChampClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_CONFIG.checkoutChamp.baseUrl,
  });

  // Add Basic Auth interceptor
  client.interceptors.request.use((config) => {
    const auth = Buffer.from(
      `${API_CONFIG.checkoutChamp.username}:${API_CONFIG.checkoutChamp.password}`
    ).toString('base64');
    config.headers['Authorization'] = `Basic ${auth}`;
    return config;
  });

  return client;
};

// Outbrain full integration: fetch marketers, campaigns, budgets, reports, and conversion events
export const fetchAllOutbrainData = async (
  fromDate: string,
  toDate: string
): Promise<{
  marketers: any[];
  campaigns: any[];
  budgets: any[];
  reports: any[];
  conversionEvents: any[];
  adSpendEntries: AdSpendEntry[];
}> => {
  const headers = { 'OB-TOKEN-V1':'MTc1NTc3NjEyMjUwNzoxZWVmNGMyODE2Y2Y1YjVjMjI5ZjYzNjZhNGQyNDYxNGQwOGE3ZTIyM2I5NGIxODAzYTU5Y2Q2ODA0OWE1ZjE5OnsiY2FsbGVyQXBwbGljYXRpb24iOiJBbWVsaWEiLCJpcEFkZHJlc3MiOiIvMTAuMjQzLjg1LjExOjU1NzA0IiwiYnlwYXNzQXBpQXV0aCI6ImZhbHNlIiwidXNlck5hbWUiOiJ0emVsYWxlbXRlc2ZheWVAZ21haWwuY29tIiwidXNlcklkIjoiMTA4NDE2ODEiLCJkYXRhU291cmNlVHlwZSI6Ik1ZX09CX0NPTSJ9OjE4ZWZiZGQ0MzQzYWVhMTc4YTA4ZDFkN2I1NzJjYjJiYjU5MTQ0MzRlNzU2YThmODVhNDU5M2Y2ZTg2ZjFiZjU4ZGQyMjlkMDVjNzYzNDYwZTdhNTIwOGJmMTVhNWU3ODY4ZDlkNzRmZGI0YWJmZjZhMzYxNDRhNWJmZDNkNjhi' };
  const baseUrl = API_CONFIG.outbrain.baseUrl;
  try {
    // 1. Fetch all marketers
    const marketersRes = await axios.get(baseUrl + 'marketers', { headers });
    const marketers = marketersRes.data || [];
    const marketerIds = marketers.map((m: any) => m.id);
    console.log(marketerIds);
    let allCampaigns: any[] = [];
    let allBudgets: any[] = [];
    let allReports: any[] = [];
    let allConversionEvents: any[] = [];
    let adSpendEntries: AdSpendEntry[] = [];

    // 2. For each marketer, fetch campaigns, budgets, reports, conversion events
    for (const marketerId of marketerIds) {
      // Campaigns
      const campaignsRes = await axios.get(
        `${baseUrl}marketers/${marketerId}/campaigns?includeArchived=true&extraFields=CampaignOptimization,Budget`,
        { headers }
      );
      const campaigns = campaignsRes.data || [];
      allCampaigns = allCampaigns.concat(campaigns);

      // Budgets
      const budgetsRes = await axios.get(
        `${baseUrl}marketers/${marketerId}/budgets`,
        { headers }
      );
      const budgets = budgetsRes.data || [];
      allBudgets = allBudgets.concat(budgets);

      // Reports (performance)
      const reportsRes = await axios.get(
        `${baseUrl}report/marketers/${marketerId}/content`,
        {
          headers,
          params: {
            from: fromDate,
            to: toDate,
            includeConversionDetails: true,
            conversionsByClickDate: true,
          },
        }
      );
      const reports = reportsRes.data || [];
      allReports = allReports.concat(reports);

      // Conversion Events
      const convEventsRes = await axios.get(
        `${baseUrl}marketers/${marketerId}/conversionEvents`,
        { headers }
      );
      const convEvents = convEventsRes.data || [];
      allConversionEvents = allConversionEvents.concat(convEvents);

      // Map reports to AdSpendEntry[]
      adSpendEntries = adSpendEntries.concat(
        (reports || []).map((item: any) => ({
          platform: 'outbrain',
          campaignId: item.contentId || '',
          campaignName: item.contentName || '',
          date: item.date || '',
          spend: item.spend || 0,
          clicks: item.clicks || 0,
          impressions: item.impressions || 0,
          conversions: item.conversions || 0,
          revenue: item.sumValue || 0,
          ctr: item.ctr || 0,
          currency: item.currency || 'USD',
        }))
      );
    }

    // Optionally, join campaigns with budgets by budgetId, etc.
    return {
      marketers,
      campaigns: allCampaigns,
      budgets: allBudgets,
      reports: allReports,
      conversionEvents: allConversionEvents,
      adSpendEntries,
    };
  } catch (error) {
    console.error('Error fetching Outbrain full data:', error);
    return {
      marketers: [],
      campaigns: [],
      budgets: [],
      reports: [],
      conversionEvents: [],
      adSpendEntries: [],
    };
  }
};

export const fetchTaboolaData = async (
  fromDate: string,
  toDate: string
): Promise<AdSpendEntry[]> => {
  try {
    const { makeAuthenticatedRequest } = await import('./api-helpers');
    const accountId = process.env.TABOOLA_ACCOUNT_ID;
    
    if (!accountId) {
      throw new Error('TABOOLA_ACCOUNT_ID must be set in environment variables');
    }
    
    const response = await makeAuthenticatedRequest(
      'taboola',
      `https://backstage.taboola.com/backstage/api/1.0/${accountId}/reports/campaign-summary/dimensions/day?start_date=${fromDate}&end_date=${toDate}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch Taboola data');
    }

    const data: TaboolaResponse = response.data as TaboolaResponse;
    return data.results.map((item) => ({
      platform: 'taboola' as const,
      campaignId: 'daily', // Taboola provides daily data
      date: item.date.split(' ')[0], // Extract date part
      spend: item.spent,
      clicks: item.clicks,
      impressions: item.impressions,
      cpc: item.cpc,
      cpm: item.cpm,
      roas: item.roas,
      ctr: item.ctr,
      currency: item.currency,
    }));
  } catch (error) {
    console.error('Error fetching Taboola data:', error);
    return [];
  }
};

export const fetchAdUpData = async (
  fromDate: string,
  toDate: string
): Promise<AdSpendEntry[]> => {
  try {
    const { makeAuthenticatedRequest } = await import('./api-helpers');
    
    const response = await makeAuthenticatedRequest(
      'adup',
      `https://api.adup-tech.com/v202101/reports/spend?start_date=${fromDate}&end_date=${toDate}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch AdUp data');
    }

    return (response.data as AdUpResponse[]).map((item: AdUpResponse) => ({
      platform: 'adup' as const,
      campaignId: item.campaign_id,
      date: item.date,
      spend: item.spend,
      clicks: item.clicks,
      impressions: item.impressions,
      currency: 'USD',
    }));
  } catch (error) {
    console.error('Error fetching AdUp data:', error);
    return [];
  }
};

export const fetchCheckoutChampOrders = async (
  filters: DashboardFilters
): Promise<Order[]> => {
  function formatDateMMDDYYYY(dateStr: string) {
    try {
      // Parse the date and ensure it's treated as UTC to avoid timezone issues
      const d = new Date(dateStr + 'T00:00:00.000Z');
      
      // If the date is invalid, try parsing as is
      if (isNaN(d.getTime())) {
        const fallbackDate = new Date(dateStr);
        if (isNaN(fallbackDate.getTime())) {
          console.warn('Invalid date string in fetchCheckoutChampOrders:', dateStr);
          return dateStr;
        }
        const mm = String(fallbackDate.getMonth() + 1).padStart(2, '0');
        const dd = String(fallbackDate.getDate()).padStart(2, '0');
        const yyyy = fallbackDate.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
      }
      
      // Use UTC methods to avoid timezone conversion issues
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const yyyy = d.getUTCFullYear();
      return `${mm}/${dd}/${yyyy}`;
    } catch (error) {
      console.warn('Error formatting date in fetchCheckoutChampOrders:', error);
      return dateStr;
    }
  }

  // Helper function to fetch a single page
  async function fetchPage(pageNum: number, startDate: string, endDate: string, loginId: string, password: string, resultsPerPage: number) {
      const params = new URLSearchParams({
        loginId,
        password,
        startDate,
        endDate,
      page: String(pageNum),
        resultsPerPage: String(resultsPerPage),
      });
      const url = `https://api.checkoutchamp.com/order/query/?${params.toString()}`;
      
      const response = await fetch(url, { 
        method: 'GET',
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error('❌ CheckoutChamp API Error:', {
          status: response.status,
          statusText: response.statusText,
        error: text,
        page: pageNum
        });
        throw new Error(`Checkout Champ API error: ${text}`);
      }
      
      const apiData = await response.json();
      
      if (
        apiData &&
        apiData.result === "SUCCESS" &&
        apiData.message &&
        Array.isArray(apiData.message.data)
      ) {
      return {
        data: apiData.message.data.map((order: any) => {
          let sku = '-';
          let upsell = false;
          if (order.items && typeof order.items === 'object') {
            const itemsArr = Object.values(order.items);
            sku = itemsArr.map((item: any) => item.productSku).filter(Boolean).join(', ');
            upsell = itemsArr.some((item: any) => item.productType === 'UPSALE');
          }
          return {
            ...order,
            sku,
            upsell,
          };
        }),
        totalResults: apiData.message.totalResults || 0,
        hasMore: apiData.message.data.length === resultsPerPage
      };
    }
    
    return { data: [], totalResults: 0, hasMore: false };
  }

  try {
    const loginId = process.env.CHECKOUT_CHAMP_USERNAME;
    const password = process.env.CHECKOUT_CHAMP_PASSWORD;
    if (!loginId || !password) {
      throw new Error('Missing Checkout Champ credentials');
    }
    
    const startDate = formatDateMMDDYYYY(filters.dateRange.from);
    const endDate = formatDateMMDDYYYY(filters.dateRange.to);
    const resultsPerPage = 100; // Use max allowed or adjust as needed
    const batchSize = 5; // Fetch 5 pages in parallel
    
    console.log('🚀 Starting parallel CheckoutChamp data fetch for date range:', { startDate, endDate });
    
    // Step 1: Get first page to determine total count
    console.log('📄 Fetching first page...');
    const firstPageResult = await fetchPage(1, startDate, endDate, loginId, password, resultsPerPage);
    const totalResults = firstPageResult.totalResults;
    const totalPages = Math.ceil(totalResults / resultsPerPage);
    
    console.log('📊 Total results:', totalResults, 'Total pages:', totalPages);
    
    let allOrders = [...firstPageResult.data];
    
    // Step 2: If there are more pages, fetch them in parallel batches
    if (totalPages > 1) {
      console.log('🔄 Fetching remaining pages in parallel batches...');
      
      // Create batches of page numbers to fetch in parallel
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2); // Start from page 2
      const batches = [];
      
      for (let i = 0; i < remainingPages.length; i += batchSize) {
        batches.push(remainingPages.slice(i, i + batchSize));
      }
      
      console.log(`📦 Created ${batches.length} batches of ${batchSize} pages each`);
      
      // Fetch each batch in parallel
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Fetching batch ${batchIndex + 1}/${batches.length} (pages: ${batch.join(', ')})`);
        
        try {
          const batchPromises = batch.map(pageNum => 
            fetchPage(pageNum, startDate, endDate, loginId, password, resultsPerPage)
          );
          
          const batchResults = await Promise.all(batchPromises);
          
          // Process batch results
          for (const result of batchResults) {
            allOrders = allOrders.concat(result.data);
          }
          
          console.log(`✅ Batch ${batchIndex + 1} completed. Total orders so far: ${allOrders.length}`);
          
        } catch (error) {
          console.error(`❌ Error in batch ${batchIndex + 1}:`, error);
          // Continue with other batches even if one fails
        }
      }
    }
    
  // Filter out test orders with quantity 0
  const filteredOrders = allOrders.filter(order => order.quantity !== 0 && order.quantity !== '0');
  console.log(`🎉 CheckoutChamp fetch completed. Total real orders: ${filteredOrders.length}`);
  return filteredOrders;
    
  } catch (error) {
    console.error('❌ Error fetching Checkout Champ orders:', error);
    throw error;
  }
};

// Combined data fetching
export const fetchAllData = async (
  filters: DashboardFilters
): Promise<{
  orders: Order[];
  adSpend: AdSpendEntry[];
}> => {
  const [orders, outbrainFull, taboolaData, adUpData] = await Promise.all([
    fetchCheckoutChampOrders(filters),
    fetchAllOutbrainData(filters.dateRange.from, filters.dateRange.to),
    fetchTaboolaData(filters.dateRange.from, filters.dateRange.to),
    fetchAdUpData(filters.dateRange.from, filters.dateRange.to),
  ]);

  const adSpend = [
    ...(outbrainFull?.adSpendEntries || []),
    ...taboolaData,
    ...adUpData,
  ];

  return { orders, adSpend };
};