// Core data models for accounting automation dashboard

export interface Order {
  orderId: string;
  date: string;
  sku: string;
  quantity: number;
  total: number;
  usdAmount: number;
  paymentMethod: string;
  refund: number;
  chargeback: number;
  upsell: boolean;
  country?: string;
  brand?: string;
}

export interface AdSpendEntry {
  platform: 'outbrain' | 'taboola' | 'adup';
  campaignId: string;
  campaignName?: string;
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  cpc?: number;
  cpm?: number;
  roas?: number;
  ctr?: number;
  currency: string;
  // Additional properties for platform analytics
  campaign?: string;
  country?: string;
  device?: string;
  adType?: string;
  revenue?: number;
  conversions?: number;
}

export interface SKUCost {
  sku: string;
  unitCogs: number;
  shippingCost: number;
  handlingFee: number;
}

export interface FixedExpense {
  date: string;
  category: string;
  amount: number;
}

export interface PaymentFee {
  orderId: string;
  amount: number;
  percentage: number;
}

// API Response Types
export interface OutbrainResponse {
  campaignId: string;
  campaignName: string;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  currency: string;
}

export interface TaboolaResponse {
  timezone: string;
  results: Array<{
    date: string;
    clicks: number;
    impressions: number;
    spent: number;
    cpc: number;
    cpm: number;
    roas: number;
    ctr: number;
    currency: string;
  }>;
  recordCount: number;
  metadata: Record<string, any>;
}

export interface AdUpResponse {
  campaign_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
}

export interface CheckoutChampResponse {
  orderId: string;
  date: string;
  sku: string;
  quantity: number;
  total: number;
  usdAmount: number;
  paymentMethod: string;
  refund: number;
  chargeback: number;
  upsell: boolean;
}

// KPI Calculation Results
export interface KPICalculation {
  grossRevenue: number;
  refundTotal: number;
  chargebackTotal: number;
  refundRate: number;
  chargebackRate: number;
  netRevenue: number;
  cogs: number;
  marketingSpend: number;
  opex: number;
  paymentFees: number;
  netProfit: number;
  roas: number;
  costPerCustomer: number;
  upsellRate: number;
  aov: number;
  totalOrders: number;
  uniqueCustomers: number;
}

// Filter Types
export interface DashboardFilters {
  dateRange: {
    from: string;
    to: string;
  };
  brand?: string;
  sku?: string;
  adPlatform?: string;
  country?: string;
  paymentMethod?: string;
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface SKUBreakdown {
  sku: string;
  revenue: number;
  profit: number;
  quantity: number;
  percentage: number;
  brand?: string;
  profitMargin: number;
  aov: number;
}

export interface PlatformSpend {
  platform: string;
  spend: number;
  percentage: number;
  color: string;
}

export interface GeographicData {
  country: string;
  revenue: number;
  orders: number;
  percentage: number;
  aov: number; // average order value for the country
  profit: number; // profit for the country
  profitMargin: number; // profit margin percentage
}

// API Configuration
export interface APIConfig {
  outbrain: {
    baseUrl: string;
    username: string;
    password: string;
  };
  taboola: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    accountId: string;
  };
  adup: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
  };
  checkoutChamp: {
    baseUrl: string;
    username: string;
    password: string;
  };
} 