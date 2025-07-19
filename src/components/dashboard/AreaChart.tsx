import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';
import { formatCurrency } from '@/lib/calculations';

interface AreaChartProps {
  data: any[];
  title?: string;
  description?: string;
  dataKey: string;
  xAxisDataKey: string;
  color?: string;
  yAxisFormatter?: (value: number) => string;
}

export function AreaChart({ 
  data, 
  title = "Area Chart", 
  description,
  dataKey,
  xAxisDataKey,
  color = '#8884d8',
  yAxisFormatter = formatCurrency
}: AreaChartProps) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: any[], label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{`Date: ${label}`}</p>
          <p className="text-sm text-muted-foreground">
            {`Value: ${yAxisFormatter(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsAreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey={xAxisDataKey} 
            className="text-xs"
            tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
          />
          <YAxis 
            className="text-xs"
            tickFormatter={yAxisFormatter}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color}
            fill={color}
            fillOpacity={0.3}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
} 