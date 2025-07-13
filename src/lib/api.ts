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
    baseUrl: 'https://api.outbrain.com',
    username: process.env.OUTBRAIN_USERNAME || '',
    password: process.env.OUTBRAIN_PASSWORD || '',
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
const createOutbrainClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_CONFIG.outbrain.baseUrl,
  });

  // Add Basic Auth interceptor
  client.interceptors.request.use((config) => {
    const auth = Buffer.from(
      `${API_CONFIG.outbrain.username}:${API_CONFIG.outbrain.password}`
    ).toString('base64');
    config.headers['Authorization'] = `Basic ${auth}`;
    config.headers['OB-TOKEN-V1'] = auth; // Outbrain specific header
    return config;
  });

  return client;
};

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

// API Functions
export const fetchOutbrainData = async (
  marketerId: string,
  fromDate: string,
  toDate: string
): Promise<AdSpendEntry[]> => {
  try {
    const client = createOutbrainClient();
    const response = await client.get(
      `/amplify/v0.1/reports/marketers/${marketerId}/campaigns`,
      {
        params: {
          from: fromDate,
          to: toDate,
        },
      }
    );

    return response.data.map((item: OutbrainResponse) => ({
      platform: 'outbrain' as const,
      campaignId: item.campaignId,
      campaignName: item.campaignName,
      date: item.startDate,
      spend: item.spend,
      clicks: item.clicks,
      impressions: item.impressions,
      currency: item.currency,
    }));
  } catch (error) {
    console.error('Error fetching Outbrain data:', error);
    return [];
  }
};

export const fetchTaboolaData = async (
  fromDate: string,
  toDate: string
): Promise<AdSpendEntry[]> => {
  try {
    const client = await createTaboolaClient();
    const response = await client.get(
      `/backstage/api/1.0/${API_CONFIG.taboola.accountId}/reports/campaign-summary/dimensions/day`,
      {
        params: {
          start_date: fromDate,
          end_date: toDate,
        },
      }
    );

    const data: TaboolaResponse = response.data;
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
    const client = await createAdUpClient();
    const response = await client.get('/reports/spend', {
      params: {
        start_date: fromDate,
        end_date: toDate,
      },
    });

    return response.data.map((item: AdUpResponse) => ({
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
  try {
    const client = createCheckoutChampClient();
    const response = await client.get('/transactions/query', {
      params: {
        from_date: filters.dateRange.from,
        to_date: filters.dateRange.to,
        brand: filters.brand,
        sku: filters.sku,
        country: filters.country,
        payment_method: filters.paymentMethod,
      },
    });

    return response.data.map((item: CheckoutChampResponse) => ({
      orderId: item.orderId,
      date: item.date,
      sku: item.sku,
      quantity: item.quantity,
      total: item.total,
      usdAmount: item.usdAmount,
      paymentMethod: item.paymentMethod,
      refund: item.refund,
      chargeback: item.chargeback,
      upsell: item.upsell,
    }));
  } catch (error) {
    console.error('Error fetching Checkout Champ orders:', error);
    return [];
  }
};

// Combined data fetching
export const fetchAllData = async (
  filters: DashboardFilters,
  marketerId?: string
): Promise<{
  orders: Order[];
  adSpend: AdSpendEntry[];
}> => {
  const [orders, outbrainData, taboolaData, adUpData] = await Promise.all([
    fetchCheckoutChampOrders(filters),
    marketerId
      ? fetchOutbrainData(marketerId, filters.dateRange.from, filters.dateRange.to)
      : Promise.resolve([]),
    fetchTaboolaData(filters.dateRange.from, filters.dateRange.to),
    fetchAdUpData(filters.dateRange.from, filters.dateRange.to),
  ]);

  const adSpend = [...outbrainData, ...taboolaData, ...adUpData];

  return { orders, adSpend };
};

// Mock data for development/testing
export const getMockData = () => {
  // Generate comprehensive mock data for the entire year
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');
  const mockOrders: Order[] = [];
  const mockAdSpend: AdSpendEntry[] = [];

  // Always include extra orders for June and July 2025
  const extraStart = new Date('2025-06-01');
  const extraEnd = new Date('2025-07-31');

  // Generate orders for every day
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const isCurrentRange = d >= extraStart && d <= extraEnd;
    // Generate 3-8 orders per day, but 8-12 for June/July
    const ordersPerDay = isCurrentRange ? Math.floor(Math.random() * 5) + 8 : Math.floor(Math.random() * 6) + 3;
    for (let i = 0; i < ordersPerDay; i++) {
      const skus = ['SKU001', 'SKU002', 'SKU003', 'SKU004', 'SKU005', 'SKU006', 'SKU007', 'SKU008', 'SKU009', 'SKU010'];
      const countries = ['US', 'CA', 'UK', 'DE', 'FR', 'AU', 'JP', 'BR', 'IT', 'ES', 'NL', 'SE', 'NO', 'MX', 'IN'];
      const brands = ['Brand A', 'Brand B', 'Brand C', 'Brand D', 'Brand E', 'Brand F', 'Brand G', 'Brand H', 'Brand I', 'Brand J'];
      const paymentMethods = ['Stripe', 'PayPal', 'Credit Card', 'Apple Pay', 'Google Pay'];
      const sku = skus[Math.floor(Math.random() * skus.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const basePrice = Math.floor(Math.random() * 100) + 20;
      const total = basePrice * quantity;
      const usdAmount = total;
      const refund = Math.random() < 0.05 ? usdAmount : 0; // 5% refund rate
      const chargeback = Math.random() < 0.02 ? usdAmount : 0; // 2% chargeback rate
      const upsell = Math.random() < 0.3; // 30% upsell rate
      mockOrders.push({
        orderId: `ORD${String(mockOrders.length + 1).padStart(3, '0')}`,
        date: dateStr,
        sku,
        quantity,
        total,
        usdAmount,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        refund,
        chargeback,
        upsell,
        country: countries[Math.floor(Math.random() * countries.length)],
        brand: brands[Math.floor(Math.random() * brands.length)],
      });
    }
  }

  // Generate ad spend data for every day
  const platforms = ['outbrain', 'taboola', 'adup'];
  const campaigns = [
    'Spring Sale Campaign', 'Brand Awareness', 'Product Launch', 'Valentine Special',
    'Retargeting Campaign', 'Lookalike Audience', 'Summer Collection', 'Holiday Promotion',
    'Seasonal Sale', 'Black Friday Prep', 'Cyber Monday', 'New Year Sale',
    'Back to School', 'Christmas Special', 'New Product Line'
  ];
  const countries = ['US', 'CA', 'UK', 'DE', 'FR', 'AU', 'JP', 'BR', 'IT', 'ES', 'NL', 'SE', 'NO', 'MX', 'IN'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const adTypes = ['Native', 'Display', 'Video', 'Search'];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const isCurrentRange = d >= extraStart && d <= extraEnd;
    // Generate 2-4 ad spend entries per day, but 5-7 for June/July
    const entriesPerDay = isCurrentRange ? Math.floor(Math.random() * 3) + 5 : Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < entriesPerDay; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
      const country = countries[Math.floor(Math.random() * countries.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      const adType = adTypes[Math.floor(Math.random() * adTypes.length)];
      // Generate realistic metrics based on platform
      let spend, clicks, impressions, cpc, cpm, roas, ctr, revenue, conversions;
      if (platform === 'outbrain') {
        spend = Math.floor(Math.random() * 2000) + 500;
        impressions = Math.floor(Math.random() * 200000) + 50000;
        clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.02)); // 2-7% CTR
        cpc = Math.random() * 0.5 + 0.1;
        cpm = spend / (impressions / 1000);
        ctr = (clicks / impressions) * 100;
        roas = Math.random() * 3 + 1;
        revenue = spend * roas;
        conversions = Math.floor(clicks * (Math.random() * 0.3 + 0.1));
      } else if (platform === 'taboola') {
        spend = Math.floor(Math.random() * 1500) + 300;
        impressions = Math.floor(Math.random() * 50000) + 10000;
        clicks = Math.floor(impressions * (Math.random() * 0.02 + 0.005)); // 0.5-2.5% CTR
        cpc = Math.random() * 10 + 5;
        cpm = spend / (impressions / 1000);
        ctr = (clicks / impressions) * 100;
        roas = Math.random() * 2 + 0.5;
        revenue = spend * roas;
        conversions = Math.floor(clicks * (Math.random() * 0.2 + 0.05));
      } else { // adup
        spend = Math.floor(Math.random() * 1000) + 200;
        impressions = Math.floor(Math.random() * 150000) + 30000;
        clicks = Math.floor(impressions * (Math.random() * 0.04 + 0.01)); // 1-5% CTR
        cpc = Math.random() * 0.3 + 0.1;
        cpm = spend / (impressions / 1000);
        ctr = (clicks / impressions) * 100;
        roas = Math.random() * 4 + 1.5;
        revenue = spend * roas;
        conversions = Math.floor(clicks * (Math.random() * 0.4 + 0.2));
      }
      mockAdSpend.push({
        platform: platform as 'outbrain' | 'taboola' | 'adup',
        campaignId: `CAM${String(mockAdSpend.length + 1).padStart(3, '0')}`,
        campaignName: campaign,
        date: dateStr,
        spend,
        clicks,
        impressions,
        cpc,
        cpm,
        roas,
        ctr,
        currency: 'USD',
        campaign,
        country,
        device,
        adType,
        revenue,
        conversions,
      });
    }
  }
  // Debugging output
  console.log('Generated mock data:', {
    ordersCount: mockOrders.length,
    adSpendCount: mockAdSpend.length,
    dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
  });
  const orderDates = [...new Set(mockOrders.map(o => o.date))].sort();
  const adSpendDates = [...new Set(mockAdSpend.map(a => a.date))].sort();
  console.log('Order dates:', orderDates.slice(0, 5), '...', orderDates.slice(-5));
  console.log('Ad spend dates:', adSpendDates.slice(0, 5), '...', adSpendDates.slice(-5));
  console.log('Total unique order dates:', orderDates.length);
  console.log('Total unique ad spend dates:', adSpendDates.length);
  return { orders: mockOrders, adSpend: mockAdSpend };
}; 