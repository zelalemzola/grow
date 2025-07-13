import { Parser } from 'json2csv';
import { 
  Order, 
  AdSpendEntry, 
  KPICalculation, 
  SKUBreakdown, 
  PlatformSpend, 
  GeographicData 
} from './types';

export const exportOrdersToCSV = (orders: Order[]): string => {
  const fields = [
    'orderId',
    'date',
    'sku',
    'quantity',
    'total',
    'usdAmount',
    'paymentMethod',
    'refund',
    'chargeback',
    'upsell',
    'country',
    'brand'
  ];

  const parser = new Parser({ fields });
  return parser.parse(orders);
};

export const exportAdSpendToCSV = (adSpend: AdSpendEntry[]): string => {
  const fields = [
    'platform',
    'campaignId',
    'campaignName',
    'date',
    'spend',
    'clicks',
    'impressions',
    'cpc',
    'cpm',
    'roas',
    'ctr',
    'currency'
  ];

  const parser = new Parser({ fields });
  return parser.parse(adSpend);
};

export const exportKPIsToCSV = (kpis: KPICalculation): string => {
  const kpiData = [{
    metric: 'Gross Revenue',
    value: kpis.grossRevenue,
    unit: 'USD'
  }, {
    metric: 'Net Revenue',
    value: kpis.netRevenue,
    unit: 'USD'
  }, {
    metric: 'Net Profit',
    value: kpis.netProfit,
    unit: 'USD'
  }, {
    metric: 'Marketing Spend',
    value: kpis.marketingSpend,
    unit: 'USD'
  }, {
    metric: 'ROAS',
    value: kpis.roas,
    unit: 'ratio'
  }, {
    metric: 'AOV',
    value: kpis.aov,
    unit: 'USD'
  }, {
    metric: 'Total Orders',
    value: kpis.totalOrders,
    unit: 'count'
  }, {
    metric: 'Unique Customers',
    value: kpis.uniqueCustomers,
    unit: 'count'
  }, {
    metric: 'Refund Rate',
    value: kpis.refundRate,
    unit: 'percentage'
  }, {
    metric: 'Chargeback Rate',
    value: kpis.chargebackRate,
    unit: 'percentage'
  }, {
    metric: 'Upsell Rate',
    value: kpis.upsellRate,
    unit: 'percentage'
  }, {
    metric: 'Cost per Customer',
    value: kpis.costPerCustomer,
    unit: 'USD'
  }];

  const fields = ['metric', 'value', 'unit'];
  const parser = new Parser({ fields });
  return parser.parse(kpiData);
};

export const exportSKUBreakdownToCSV = (skuBreakdown: SKUBreakdown[]): string => {
  const fields = [
    'sku',
    'revenue',
    'profit',
    'quantity',
    'percentage'
  ];

  const parser = new Parser({ fields });
  return parser.parse(skuBreakdown);
};

export const exportPlatformSpendToCSV = (platformSpend: PlatformSpend[]): string => {
  const fields = [
    'platform',
    'spend',
    'percentage'
  ];

  const parser = new Parser({ fields });
  return parser.parse(platformSpend);
};

export const exportGeographicDataToCSV = (geographicData: GeographicData[]): string => {
  const fields = [
    'country',
    'revenue',
    'orders',
    'percentage'
  ];

  const parser = new Parser({ fields });
  return parser.parse(geographicData);
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportDashboardData = (
  orders: Order[],
  adSpend: AdSpendEntry[],
  kpis: KPICalculation,
  skuBreakdown: SKUBreakdown[],
  platformSpend: PlatformSpend[],
  geographicData: GeographicData[],
  dateRange: { from: string; to: string }
) => {
  const dateSuffix = `${dateRange.from}_to_${dateRange.to}`;
  
  // Export all data as separate files
  downloadCSV(exportOrdersToCSV(orders), `orders_${dateSuffix}.csv`);
  downloadCSV(exportAdSpendToCSV(adSpend), `ad_spend_${dateSuffix}.csv`);
  downloadCSV(exportKPIsToCSV(kpis), `kpis_${dateSuffix}.csv`);
  downloadCSV(exportSKUBreakdownToCSV(skuBreakdown), `sku_breakdown_${dateSuffix}.csv`);
  downloadCSV(exportPlatformSpendToCSV(platformSpend), `platform_spend_${dateSuffix}.csv`);
  downloadCSV(exportGeographicDataToCSV(geographicData), `geographic_data_${dateSuffix}.csv`);
}; 