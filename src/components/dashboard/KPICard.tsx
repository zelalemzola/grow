import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/calculations';
import { KPIModal } from './KPIModal';

interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'percentage' | 'number';
  icon?: React.ReactNode;
  change?: number;
  trend?: 'up' | 'down';
  description?: string;
  breakdown?: {
    byDate: Array<{ date: string; value: number }>;
    byCountry: Array<{ country: string; value: number }>;
    bySKU: Array<{ sku: string; value: number }>;
    byPlatform: Array<{ platform: string; value: number }>;
  };
  rawData?: Array<{
    id: string;
    date: string;
    value: number;
    country?: string;
    sku?: string;
    platform?: string;
  }>;
  onExport?: () => void;
}

export function KPICard({ 
  title, 
  value, 
  format, 
  icon, 
  change, 
  trend,
  description,
  breakdown,
  rawData,
  onExport
}: KPICardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      case 'number':
        return formatNumber(val);
      default:
        return val.toString();
    }
  };

  const cardContent = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3 text-green-600" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="h-3 w-3 text-red-600" />
            ) : null}
            <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : ''}>
              {change > 0 ? '+' : ''}{change}% from last month
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  // If breakdown data is provided, wrap in modal
  if (breakdown && rawData) {
    return (
      <KPIModal 
        breakdown={{
          title,
          value,
          format,
          change,
          trend,
          description,
          breakdown,
          rawData
        }}
        onExport={onExport}
      >
        {cardContent}
      </KPIModal>
    );
  }

  // Otherwise return regular card
  return cardContent;
} 