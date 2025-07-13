'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { KPICard } from '@/components/dashboard/KPICard';
import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { ExportButton } from '@/components/dashboard/ExportButton';
import { 
  Calculator,
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart,
  Download,
  Plus,
  Minus,
  X,
  Divide,
  Equal,
  Zap,
  Eye,
  EyeOff,
  Settings,
  FileText,
  Download as DownloadIcon
} from 'lucide-react';
import { 
  formatCurrency,
  formatPercentage,
  formatNumber
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
      } catch (error) {
        return { ...formula, result: 0 };
      }
    });

    setFormulas(updatedFormulas);
  };

  useEffect(() => {
    calculateResults();
  }, [metrics]);

  const handleMetricChange = (index: number, field: keyof CalculatorMetric, value: any) => {
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
              <TabsTrigger value="single">Single Metric Mode</TabsTrigger>
              <TabsTrigger value="combined">Combined Formula Mode</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">
                {mode === 'single' ? 'Metric Inputs' : 'Formula Builder'}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={mode === 'single' ? addMetric : addFormula}>
                <Plus className="h-3 w-3 mr-1" />
                Add {mode === 'single' ? 'Metric' : 'Formula'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === 'single' ? (
              // Single Metric Mode
              <div className="space-y-4">
                {metrics.map((metric, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={metric.name}
                          onChange={(e) => handleMetricChange(index, 'name', e.target.value)}
                          placeholder="Metric name"
                          className="flex-1"
                        />
                        <Select
                          value={metric.type}
                          onValueChange={(value) => handleMetricChange(index, 'type', value)}
                        >
                          <SelectTrigger className="w-32">
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
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={metric.value}
                          onChange={(e) => handleMetricChange(index, 'value', parseFloat(e.target.value) || 0)}
                          placeholder="Value"
                          className="flex-1"
                        />
                        <Input
                          value={metric.description || ''}
                          onChange={(e) => handleMetricChange(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMetric(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Combined Formula Mode
              <div className="space-y-4">
                {formulas.map((formula, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Input
                        value={formula.name}
                        onChange={(e) => {
                          const updated = [...formulas];
                          updated[index].name = e.target.value;
                          setFormulas(updated);
                        }}
                        placeholder="Formula name"
                        className="flex-1 mr-2"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFormula(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      value={formula.expression}
                      onChange={(e) => {
                        const updated = [...formulas];
                        updated[index].expression = e.target.value;
                        setFormulas(updated);
                      }}
                      placeholder="Formula expression (e.g., Revenue - Cost)"
                      className="text-sm"
                    />
                    <Input
                      value={formula.description || ''}
                      onChange={(e) => {
                        const updated = [...formulas];
                        updated[index].description = e.target.value;
                        setFormulas(updated);
                      }}
                      placeholder="Description"
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">Result: {formatCurrency(formula.result)}</Badge>
                    </div>
                  </div>
                ))}
                
                {/* Add New Formula */}
                <div className="p-3 border-2 border-dashed rounded-lg space-y-2">
                  <Input
                    value={newFormula.name}
                    onChange={(e) => setNewFormula({...newFormula, name: e.target.value})}
                    placeholder="New formula name"
                  />
                  <Textarea
                    value={newFormula.expression}
                    onChange={(e) => setNewFormula({...newFormula, expression: e.target.value})}
                    placeholder="Formula expression (e.g., Revenue - Cost)"
                  />
                  <Input
                    value={newFormula.description}
                    onChange={(e) => setNewFormula({...newFormula, description: e.target.value})}
                    placeholder="Description"
                  />
                  <Button onClick={addFormula} className="w-full">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Formula
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Results & Visualizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mode === 'single' ? (
                metrics.slice(0, 4).map((metric, index) => (
                  <KPICard
                    key={index}
                    title={metric.name}
                    value={metric.value}
                    format="currency"
                    icon={<DollarSign className="h-4 w-4" />}
                    description={metric.description}
                  />
                ))
              ) : (
                formulas.slice(0, 4).map((formula, index) => (
                  <KPICard
                    key={index}
                    title={formula.name}
                    value={formula.result}
                    format="currency"
                    icon={<Calculator className="h-4 w-4" />}
                    description={formula.description}
                  />
                ))
              )}
            </div>

            {/* Chart Controls */}
            <div className="flex items-center gap-2">
              <Select value={chartType} onValueChange={(value: string) => setChartType(value as 'bar' | 'pie' | 'area')}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
              
              {mode === 'single' && (
                <Select 
                  value={selectedMetrics.join(',')} 
                  onValueChange={(value: string) => setSelectedMetrics(value.split(','))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select metrics to display" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((metric) => (
                      <SelectItem key={metric.name} value={metric.name}>
                        {metric.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Chart */}
            <div className="h-64">
              {chartType === 'bar' && (
                <BarChart data={chartData} dataKey="value" xAxisDataKey="name" />
              )}
              {chartType === 'pie' && (
                <PieChart data={chartData} />
              )}
              {chartType === 'area' && (
                <AreaChart data={chartData} dataKey="value" xAxisDataKey="name" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Summary Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {mode === 'single' ? (
                  metrics.map((metric, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{metric.name}</td>
                      <td className="p-2">{formatCurrency(metric.value)}</td>
                      <td className="p-2">
                        <Badge variant="outline">{metric.type}</Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{metric.description || '-'}</td>
                    </tr>
                  ))
                ) : (
                  formulas.map((formula, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{formula.name}</td>
                      <td className="p-2">{formatCurrency(formula.result)}</td>
                      <td className="p-2">
                        <Badge variant="outline">Formula</Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{formula.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 