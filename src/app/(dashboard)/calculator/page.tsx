'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { KPICard } from '@/components/dashboard/KPICard';
import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { 
  Calculator,
  DollarSign,
  X,
  Zap
} from 'lucide-react';
import { 
  formatCurrency
} from '@/lib/calculations';

interface CalculatorMetric {
  name: string;
  value: number;
  type: 'revenue' | 'cost' | 'spend' | 'margin' | 'refunds' | 'orders' | 'roas';
  description?: string;
}

interface Formula {
  name: string;
  expression: string;
  result: number;
  description?: string;
}

export default function CalculatorPage() {
  const [mode, setMode] = useState<'single' | 'combined'>('single');
  const [metrics, setMetrics] = useState<CalculatorMetric[]>([
    { name: 'Revenue', value: 100000, type: 'revenue', description: 'Total revenue' },
    { name: 'Cost', value: 60000, type: 'cost', description: 'Cost of goods sold' },
    { name: 'Spend', value: 20000, type: 'spend', description: 'Marketing spend' },
    { name: 'Refunds', value: 5000, type: 'refunds', description: 'Total refunds' },
    { name: 'Orders', value: 1000, type: 'orders', description: 'Number of orders' },
  ]);
  
  const [formulas, setFormulas] = useState<Formula[]>([
    { 
      name: 'Gross Profit', 
      expression: 'Revenue - Cost', 
      result: 40000,
      description: 'Revenue minus cost of goods sold'
    },
    { 
      name: 'Net Profit', 
      expression: 'Revenue - Cost - Spend - Refunds', 
      result: 15000,
      description: 'Revenue minus all costs and refunds'
    },
    { 
      name: 'ROAS', 
      expression: 'Revenue / Spend', 
      result: 5.0,
      description: 'Return on ad spend'
    },
    { 
      name: 'AOV', 
      expression: 'Revenue / Orders', 
      result: 100,
      description: 'Average order value'
    },
  ]);

  const [newFormula, setNewFormula] = useState({
    name: '',
    expression: '',
    description: ''
  });

  const [chartType, setChartType] = useState<'bar' | 'pie' | 'area'>('bar');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Revenue', 'Cost', 'Spend']);

  // Calculate results based on current metrics
  const calculateResults = () => {
    const metricMap = metrics.reduce((acc, metric) => {
      acc[metric.name] = metric.value;
      return acc;
    }, {} as Record<string, number>);

    const updatedFormulas = formulas.map(formula => {
      try {
        const expression = formula.expression
          .replace(/Revenue/g, metricMap['Revenue']?.toString() || '0')
          .replace(/Cost/g, metricMap['Cost']?.toString() || '0')
          .replace(/Spend/g, metricMap['Spend']?.toString() || '0')
          .replace(/Refunds/g, metricMap['Refunds']?.toString() || '0')
          .replace(/Orders/g, metricMap['Orders']?.toString() || '0');
        
        const result = eval(expression);
        return { ...formula, result: isNaN(result) ? 0 : result };
      } catch {
        return { ...formula, result: 0 };
      }
    });

    setFormulas(updatedFormulas);
  };

  useEffect(() => {
    calculateResults();
  }, [metrics, calculateResults]);

  const handleMetricChange = (index: number, field: keyof CalculatorMetric, value: string | number) => {
    const updatedMetrics = [...metrics];
    updatedMetrics[index] = { ...updatedMetrics[index], [field]: value };
    setMetrics(updatedMetrics);
  };

  const addMetric = () => {
    setMetrics([...metrics, { name: 'New Metric', value: 0, type: 'revenue' }]);
  };

  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const addFormula = () => {
    if (newFormula.name && newFormula.expression) {
      setFormulas([...formulas, { 
        name: newFormula.name, 
        expression: newFormula.expression, 
        result: 0,
        description: newFormula.description 
      }]);
      setNewFormula({ name: '', expression: '', description: '' });
    }
  };

  const removeFormula = (index: number) => {
    setFormulas(formulas.filter((_, i) => i !== index));
  };

  const getChartData = () => {
    if (mode === 'single') {
      return selectedMetrics.map(metricName => {
        const metric = metrics.find(m => m.name === metricName);
        return {
          name: metricName,
          value: metric?.value || 0
        };
      });
    } else {
      return formulas.map(formula => ({
        name: formula.name,
        value: formula.result
      }));
    }
  };

  const exportResults = () => {
    const data = {
      metrics,
      formulas,
      mode,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculator_results_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const csvData = [
      ['Metric', 'Value', 'Type', 'Description'],
      ...metrics.map(m => [m.name, m.value.toString(), m.type, m.description || '']),
      [],
      ['Formula', 'Expression', 'Result', 'Description'],
      ...formulas.map(f => [f.name, f.expression, f.result.toString(), f.description || ''])
    ];
    
    const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculator_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = getChartData();

  return (
    <div className="container-responsive space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Calculator</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Custom financial metric analysis and formula builder
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <ExportButton onClick={exportCSV} icon="file" className="w-full sm:w-auto">
            Export CSV
          </ExportButton>
          <ExportButton onClick={exportResults} icon="chart" className="w-full sm:w-auto">
            Export JSON
          </ExportButton>
        </div>
      </div>

      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Analysis Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(value) => setMode(value as 'single' | 'combined')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Metrics</TabsTrigger>
              <TabsTrigger value="combined">Combined Results</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Metrics Input Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Input Metrics</CardTitle>
            <Button onClick={addMetric} size="sm" className="text-xs">
              <Calculator className="h-3 w-3 mr-1" />
              Add Metric
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
              <Input
                placeholder="Metric name"
                value={metric.name}
                onChange={(e) => handleMetricChange(index, 'name', e.target.value)}
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Value"
                value={metric.value}
                onChange={(e) => handleMetricChange(index, 'value', parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
              <Select
                value={metric.type}
                onValueChange={(value) => handleMetricChange(index, 'type', value as CalculatorMetric['type'])}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                  <SelectItem value="spend">Spend</SelectItem>
                  <SelectItem value="margin">Margin</SelectItem>
                  <SelectItem value="refunds">Refunds</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="roas">ROAS</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Description"
                  value={metric.description || ''}
                  onChange={(e) => handleMetricChange(index, 'description', e.target.value)}
                  className="text-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeMetric(index)}
                  className="text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Formulas Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Formulas</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={addFormula} size="sm" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Add Formula
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Formula */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            <Input
              placeholder="Formula name"
              value={newFormula.name}
              onChange={(e) => setNewFormula({ ...newFormula, name: e.target.value })}
              className="text-sm"
            />
            <Input
              placeholder="Expression (e.g., Revenue - Cost)"
              value={newFormula.expression}
              onChange={(e) => setNewFormula({ ...newFormula, expression: e.target.value })}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Input
                placeholder="Description"
                value={newFormula.description}
                onChange={(e) => setNewFormula({ ...newFormula, description: e.target.value })}
                className="text-sm flex-1"
              />
              <Button onClick={addFormula} size="sm" className="text-xs">
                Add
              </Button>
            </div>
          </div>

          {/* Existing Formulas */}
          {formulas.map((formula, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
              <div className="text-sm font-medium">{formula.name}</div>
              <div className="text-sm text-muted-foreground">{formula.expression}</div>
              <div className="text-sm font-semibold">{formatCurrency(formula.result)}</div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground flex-1">{formula.description}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeFormula(index)}
                  className="text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Visualization</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={chartType} onValueChange={(value) => setChartType(value as 'bar' | 'pie' | 'area')}>
                <SelectTrigger className="w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartType === 'bar' && (
            <BarChart 
              data={chartData}
              dataKey="value"
              xAxisDataKey="name"
            />
          )}
          {chartType === 'pie' && (
            <PieChart data={chartData} />
          )}
          {chartType === 'area' && (
            <AreaChart 
              data={chartData}
              dataKey="value"
              xAxisDataKey="name"
            />
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mode === 'single' ? (
          selectedMetrics.map(metricName => {
            const metric = metrics.find(m => m.name === metricName);
            return (
              <KPICard
                key={metricName}
                title={metricName}
                value={metric?.value || 0}
                change={0}
                format="currency"
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              />
            );
          })
        ) : (
          formulas.map(formula => (
            <KPICard
              key={formula.name}
              title={formula.name}
              value={formula.result}
              change={0}
              format="currency"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
          ))
        )}
      </div>
    </div>
  );
} 