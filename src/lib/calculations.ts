import {
  Order,
  AdSpendEntry,
  SKUCost,
  FixedExpense,
  PaymentFee,
  KPICalculation,
  SKUBreakdown,
  PlatformSpend,
  GeographicData,
  ChartDataPoint,
  DashboardFilters,
} from './types';

const PAYMENT_FEE_PERCENTAGE = 0.029; // 2.9% typical Stripe fee

export const calculateKPIs = (
  orders: Order[],
  adSpend: AdSpendEntry[],
  skuCosts: SKUCost[],
  fixedExpenses: FixedExpense[],
  eurToUsdRate: number = 1.10 // Default fallback rate
): KPICalculation => {
  // Basic calculations
  const grossRevenue = orders.reduce((sum, order) => sum + order.usdAmount, 0);
  const refundTotal = orders.reduce((sum, order) => sum + order.refund, 0);
  const chargebackTotal = orders.reduce((sum, order) => sum + order.chargeback, 0);
  const totalOrders = orders.length;
  const uniqueCustomers = new Set(orders.map(order => order.orderId)).size;

  // Rates
  const refundRate = totalOrders > 0 ? (refundTotal / grossRevenue) * 100 : 0;
  const chargebackRate = totalOrders > 0 ? (chargebackTotal / grossRevenue) * 100 : 0;
  const netRevenue = grossRevenue - refundTotal - chargebackTotal;

  // COGS calculation (robust matching by SKU or productId) with EUR to USD conversion
  let cogs = 0;
  orders.forEach(order => {
    if (!order.items) return;
    Object.values(order.items).forEach((item: any) => {
      console.log('[COGS] Order Item:', {
        productSku: item.productSku,
        productId: item.productId,
        qty: item.qty,
      });
      const itemSku = (item.productSku || '').trim().toUpperCase();
      const itemProductId = (item.productId || '').toString().trim();
      const itemQty = Number(item.qty) || 0;
      // Try to match by SKU first, then by productId
      const skuCost = skuCosts.find(cost =>
        (cost.sku && cost.sku.trim().toUpperCase() === itemSku) ||
        (cost.productId && cost.productId.toString().trim() === itemProductId)
      );
      let orderCogs = 0;
    if (skuCost) {
        // Convert EUR costs to USD using the conversion rate
        const unitCogsUSD = skuCost.unitCogs * eurToUsdRate;
        const shippingCostUSD = skuCost.shippingCost * eurToUsdRate;
        const handlingFeeUSD = (skuCost.handlingFee || 0) * eurToUsdRate;
        orderCogs = (unitCogsUSD * itemQty) + shippingCostUSD + handlingFeeUSD;
        cogs += orderCogs;
    }
      // Log details for each item
      console.log('[COGS] Order:', {
        orderId: order.orderId,
        itemSku,
        itemProductId,
        itemQty,
        unitCogsEUR: skuCost ? skuCost.unitCogs : undefined,
        unitCogsUSD: skuCost ? skuCost.unitCogs * eurToUsdRate : undefined,
        shippingCostEUR: skuCost ? skuCost.shippingCost : undefined,
        shippingCostUSD: skuCost ? skuCost.shippingCost * eurToUsdRate : undefined,
        handlingFeeEUR: skuCost ? skuCost.handlingFee : undefined,
        handlingFeeUSD: skuCost ? (skuCost.handlingFee || 0) * eurToUsdRate : undefined,
        orderCogs,
        eurToUsdRate,
      });
    });
  });
  console.log('[COGS] Total COGS:', cogs);

  // Marketing spend
  const marketingSpend = adSpend.reduce((sum, entry) => sum + entry.spend, 0);

  // Comprehensive OPEX calculation
  // 1. Payment processing fees (2.9% of order amounts)
  const paymentFees = orders.reduce((sum, order) => {
    return sum + (order.usdAmount * PAYMENT_FEE_PERCENTAGE);
  }, 0);

  // 2. Shipping costs from orders and items
  let totalShippingCosts = 0;
  orders.forEach(order => {
    // Order-level shipping cost
    if (order.shippingCost) {
      totalShippingCosts += Number(order.shippingCost) * eurToUsdRate;
    }
    // Item-level shipping costs
    if (order.items) {
      Object.values(order.items).forEach((item: any) => {
        if (item.shipping) {
          totalShippingCosts += Number(item.shipping) * eurToUsdRate;
        }
      });
    }
  });

  // 3. Manual fixed expenses
  const manualFixedExpenses = fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // 4. Total OPEX
  const opex = paymentFees + totalShippingCosts + marketingSpend + manualFixedExpenses;

  // Log OPEX breakdown
  console.log('[OPEX] Breakdown:', {
    paymentFees,
    totalShippingCosts,
    marketingSpend,
    manualFixedExpenses,
    totalOpex: opex,
  });

  // Net profit
  const netProfit = netRevenue - cogs - opex;

  // Additional KPIs
  const roas = marketingSpend > 0 ? grossRevenue / marketingSpend : 0;
  const costPerCustomer = uniqueCustomers > 0 ? marketingSpend / uniqueCustomers : 0;
  const upsellRate = totalOrders > 0 ? (orders.filter(order => order.upsell).length / totalOrders) * 100 : 0;
  const aov = totalOrders > 0 ? grossRevenue / totalOrders : 0;
  const averageCogs = totalOrders > 0 ? cogs / totalOrders : 0;

  return {
    grossRevenue,
    refundTotal,
    chargebackTotal,
    refundRate,
    chargebackRate,
    netRevenue,
    cogs,
    marketingSpend,
    opex,
    paymentFees,
    netProfit,
    roas,
    costPerCustomer,
    upsellRate,
    aov,
    totalOrders,
    uniqueCustomers,
    averageCogs,
  };
};

export const calculateSKUBreakdown = (
  orders: Order[],
  kpis: KPICalculation
): SKUBreakdown[] => {
  const skuMap = new Map<string, { revenue: number; quantity: number; brand?: string }>();

  orders.forEach(order => {
    const existing = skuMap.get(order.sku) || { revenue: 0, quantity: 0, brand: order.brand };
    existing.revenue += order.usdAmount;
    existing.quantity += order.quantity;
    if (order.brand && !existing.brand) {
      existing.brand = order.brand;
    }
    skuMap.set(order.sku, existing);
  });

  // Calculate profit for each SKU (simplified calculation)
  const skuBreakdown: SKUBreakdown[] = Array.from(skuMap.entries()).map(([sku, data]) => {
    const percentage = (data.revenue / kpis.grossRevenue) * 100;
    const profit = data.revenue * 0.7; // Simplified profit calculation
    const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
    const aov = data.quantity > 0 ? data.revenue / data.quantity : 0;

    return {
      sku,
      revenue: data.revenue,
      profit,
      quantity: data.quantity,
      percentage,
      brand: data.brand,
      profitMargin,
      aov,
    };
  });

  return skuBreakdown.sort((a, b) => b.revenue - a.revenue);
};

export const calculatePlatformSpend = (adSpend: AdSpendEntry[]): PlatformSpend[] => {
  const platformMap = new Map<string, number>();

  adSpend.forEach(entry => {
    const existing = platformMap.get(entry.platform) || 0;
    platformMap.set(entry.platform, existing + entry.spend);
  });

  const totalSpend = Array.from(platformMap.values()).reduce((sum, spend) => sum + spend, 0);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  return Array.from(platformMap.entries()).map(([platform, spend], index) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    spend,
    percentage: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
    color: colors[index % colors.length],
  }));
};

export const calculateGeographicData = (orders: Order[]): GeographicData[] => {
  const countryMap = new Map<string, { revenue: number; orders: number }>();

  orders.forEach(order => {
    const country = order.country || 'Unknown';
    const existing = countryMap.get(country) || { revenue: 0, orders: 0 };
    existing.revenue += order.usdAmount;
    existing.orders += 1;
    countryMap.set(country, existing);
  });

  const totalRevenue = Array.from(countryMap.values()).reduce((sum, data) => sum + data.revenue, 0);

  return Array.from(countryMap.entries()).map(([country, data]) => {
    const aov = data.orders > 0 ? data.revenue / data.orders : 0;
    const profit = data.revenue * 0.7; // Placeholder: 70% margin, adjust as needed
    const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
    return {
      country,
      revenue: data.revenue,
      orders: data.orders,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      aov,
      profit,
      profitMargin,
    };
  }).sort((a, b) => b.revenue - a.revenue);
};

export const generateChartData = (
  orders: Order[],
  adSpend: AdSpendEntry[],
  days: number = 30
): {
  revenueData: ChartDataPoint[];
  profitData: ChartDataPoint[];
  spendData: ChartDataPoint[];
} => {
  const revenueData: ChartDataPoint[] = [];
  const profitData: ChartDataPoint[] = [];
  const spendData: ChartDataPoint[] = [];

  // Group data by date
  const revenueByDate = new Map<string, number>();
  const spendByDate = new Map<string, number>();

  orders.forEach(order => {
    const existing = revenueByDate.get(order.date) || 0;
    revenueByDate.set(order.date, existing + order.usdAmount);
  });

  adSpend.forEach(entry => {
    if(!entry.date) return;
    const existing = spendByDate.get(entry.date) || 0;
    spendByDate.set(entry.date, existing + entry.spend);
  });

  // Generate data points for the last N days
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const revenue = revenueByDate.get(dateStr) || 0;
    const spend = spendByDate.get(dateStr) || 0;
    const profit = revenue * 0.7 - spend; // Simplified profit calculation

    revenueData.push({ date: dateStr, value: revenue });
    profitData.push({ date: dateStr, value: profit });
    spendData.push({ date: dateStr, value: spend });
  }

  console.log('Generated chart data:', { revenueData, profitData, spendData }); // Debug log
  return { revenueData, profitData, spendData };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

// Filter data based on dashboard filters
export function filterData<T extends { date?: string; brand?: string; sku?: string; country?: string; paymentMethod?: string }>(
  data: T[],
  filters: DashboardFilters
): T[] {
  return data.filter(item => {
    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      if (item.date) {
        const itemDate = new Date(item.date);
        if (typeof filters.dateRange.from === 'string' && itemDate < new Date(filters.dateRange.from)) {
          return false;
        }
        if (typeof filters.dateRange.to === 'string' && itemDate > new Date(filters.dateRange.to)) {
          return false;
        }
      } else {
        // If item.date is undefined, skip date filtering for this item
      }
    }

    // Brand filter
    if (filters.brand && item.brand) {
      if (!item.brand.toLowerCase().includes(filters.brand.toLowerCase())) {
        return false;
      }
    }

    // SKU filter
    if (filters.sku && item.sku) {
      if (!item.sku.toLowerCase().includes(filters.sku.toLowerCase())) {
        return false;
      }
    }

    // Country filter
    if (filters.country && item.country) {
      if (!item.country.toLowerCase().includes(filters.country.toLowerCase())) {
        return false;
      }
    }

    // Payment method filter
    if (filters.paymentMethod && item.paymentMethod) {
      if (item.paymentMethod !== filters.paymentMethod) {
        return false;
      }
    }

    return true;
  });
}

// Filter ad spend data based on platform
export function filterAdSpendData(
  data: AdSpendEntry[],
  filters: DashboardFilters
): AdSpendEntry[] {
  return data.filter(item => {
    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      if (item.date) {
        const itemDate = new Date(item.date);
        if (typeof filters.dateRange.from === 'string' && itemDate < new Date(filters.dateRange.from)) {
          return false;
        }
        if (typeof filters.dateRange.to === 'string' && itemDate > new Date(filters.dateRange.to)) {
          return false;
        }
      } else {
        // If item.date is undefined, skip date filtering for this item
      }
    }

    // Platform filter
    if (filters.adPlatform && item.platform !== filters.adPlatform) {
      return false;
    }

    return true;
  });
} 