import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartCard } from './ChartCard';
import { PlatformSpend } from '@/lib/types';
import { formatCurrency, formatPercentage } from '@/lib/calculations';

interface GenericPieData {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PlatformSpend[] | GenericPieData[];
  title?: string;
  description?: string;
  dataKey?: string;
  nameKey?: string;
  valueKey?: string;
}

export function PieChart({ 
  data, 
  title = "Data Distribution", 
  description,
  dataKey = "spend",
  nameKey = "platform",
  valueKey = "spend"
}: PieChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const isPlatformSpend = 'platform' in dataPoint;
      
      // Calculate total for percentage
      const total = data.reduce((sum: number, item: any) => sum + (isPlatformSpend ? item.spend : item.value), 0);
      const percentage = (dataPoint.value / total) * 100;
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">
            {isPlatformSpend ? dataPoint.platform : dataPoint.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {isPlatformSpend 
              ? `Spend: ${formatCurrency(dataPoint.spend)}`
              : `Value: ${formatCurrency(dataPoint.value)}`
            }
          </p>
          <p className="text-sm text-muted-foreground">
            {isPlatformSpend 
              ? `Percentage: ${formatPercentage(dataPoint.percentage)}`
              : `Percentage: ${formatPercentage(percentage)}`
            }
          </p>
        </div>
      );
    }
    return null;
  };

  const getLabel = (entry: any) => {
    const isPlatformSpend = 'platform' in entry;
    const name = isPlatformSpend ? entry.platform : entry.name;
    const value = isPlatformSpend ? entry.spend : entry.value;
    const total = data.reduce((sum: number, item: any) => sum + (isPlatformSpend ? item.spend : item.value), 0);
    const percentage = (value / total) * 100;
    return `${name} ${percentage.toFixed(1)}%`;
  };

  const COLOR_PALETTE = [
    '#4F8A8B', // teal
    '#F9ED69', // yellow
    '#F08A5D', // orange
    '#B83B5E', // magenta
    '#6A2C70', // purple
    '#3A6351', // green
    '#F7B801', // gold
    '#EA5455', // red
    '#2D4059', // dark blue
    '#FF6F3C', // coral
    '#FFD460', // light yellow
    '#3EC1D3', // cyan
    '#FFB400', // amber
    '#6A89CC', // blue
    '#38ADA9', // turquoise
  ];

  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={getLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey={Array.isArray(data) && data.length > 0 && 'value' in data[0] ? 'value' : dataKey}
            nameKey={Array.isArray(data) && data.length > 0 && 'name' in data[0] ? 'name' : nameKey}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
} 