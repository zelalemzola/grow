"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { DataTable } from "@/components/dashboard/DataTable";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/dashboard/KPICard";
import { Download, TrendingUp, TrendingDown, BarChart3, MousePointerClick, Eye, DollarSign } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { getEurToUsdRate } from '@/lib/utils';

const REPORTS = [
  {
    key: "ad_performance",
    label: "Ad Performance",
    reportType: "AD_PERFORMANCE_REPORT",
  },
  {
    key: "campaign_performance",
    label: "Campaign Performance",
    reportType: "CAMPAIGN_PERFORMANCE_REPORT",
  },
  {
    key: "direct_placement_performance",
    label: "Direct Placement Performance",
    reportType: "DIRECT_PLACEMENT_PERFORMANCE_REPORT",
  },
];

const DEFAULT_SELECT = ["Month", "CampaignName", "Clicks", "Impressions", "Cost", "Conversions", "Ctr"];

function formatRows(rows: any[], allKeys: string[]) {
  return rows.map((row) => {
    const formatted: Record<string, any> = {};
    for (const key of allKeys) {
      let value = row[key];
      if (typeof value === "boolean") {
        formatted[key] = value ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>;
      } else if (typeof value === "object" && value !== null) {
        formatted[key] = <pre className="text-xs bg-muted p-1 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
      } else if (value === 0) {
        formatted[key] = 0;
      } else if (value === "" || value === undefined || value === null) {
        formatted[key] = "-";
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  });
}

// Helper to ensure correct KPI format
function getKPIFormat(format: string): 'currency' | 'percentage' | 'number' {
  if (format === 'currency' || format === 'percentage' || format === 'number') return format;
  return 'number';
}
// Helper to ensure correct KPI trend
type TrendType = 'up' | 'down' | undefined;
function getKPITrend(trend: string): TrendType {
  if (trend === 'up' || trend === 'down') return trend;
  return undefined;
}

export default function AdUpPage() {
  const [reportKey, setReportKey] = useState(REPORTS[0].key);
  // Default: end date = today, start date = 1 year ago
  const today = useMemo(() => new Date(), []);
  const oneYearAgo = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }, []);
  const [startDate, setStartDate] = useState<Date | undefined>(oneYearAgo);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [search, setSearch] = useState("");

  const report = REPORTS.find((r) => r.key === reportKey);

  // Query key includes all params for caching
  const queryKey = [
    "adup",
    "report",
    reportKey,
    startDate?.toISOString(),
    endDate?.toISOString(),
  ];

  const fetchReport = async () => {
    const body: any = {
      report_name: report?.label,
      report_type: report?.reportType,
      select: DEFAULT_SELECT,
      conditions: [
        {
          field: "Clicks",
          operator: "GREATER_THAN",
          values: ["0"],
        },
      ],
      download_format: "JSON",
      date_range_type: "LAST_MONTH",
    };
    if (startDate && endDate) {
      body.date_range_type = "CUSTOM_DATE";
      body.date_range = {
        min: startDate.toISOString().slice(0, 10),
        max: endDate.toISOString().slice(0, 10),
      };
    }
    const res = await fetch("/api/adup/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch report");
    return res.json();
  };

  const { data, error, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: fetchReport,
    enabled: !!reportKey, // Only fetch when reportKey is set
    refetchOnWindowFocus: false,
  });

  // Fetch EUR to USD rate
  const { data: eurToUsdRateData } = useQuery<number>({
    queryKey: ['eur-usd-rate'],
    queryFn: getEurToUsdRate,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
    retry: 1,
  });
  const EUR_TO_USD = eurToUsdRateData || 1.08; // Use API rate or conservative fallback

  // Collect all keys for columns
  const allKeys = useMemo(() => {
    if (!data?.rows || !Array.isArray(data.rows)) return [];
    const keys = new Set<string>();
    data.rows.forEach((row: any) => Object.keys(row).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [data]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (!data?.rows || !Array.isArray(data.rows)) return null;
    const sum = (key: string) => data.rows.reduce((acc: number, row: any) => {
      const isEUR = row.currencyCode === 'EUR' || row.currencySymbol === '€';
      let value = Number(row[key]) || 0;
      if (['Cost'].includes(key) && isEUR) value = value * EUR_TO_USD;
      return acc + value;
    }, 0);
    const clicks = sum("Clicks");
    const impressions = sum("Impressions");
    const cost = sum("Cost");
    const conversions = sum("Conversions");
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return [
      {
        title: "Clicks",
        value: clicks,
        format: "number",
        icon: <MousePointerClick className="h-5 w-5 text-primary" />,
        trend: "up",
        change: 0,
      },
      {
        title: "Impressions",
        value: impressions,
        format: "number",
        icon: <Eye className="h-5 w-5 text-primary" />,
        trend: "up",
        change: 0,
      },
      {
        title: "Cost",
        value: cost,
        format: "currency",
        icon: <DollarSign className="h-5 w-5 text-primary" />,
        trend: "down",
        change: 0,
      },
      {
        title: "Conversions",
        value: conversions,
        format: "number",
        icon: <BarChart3 className="h-5 w-5 text-primary" />,
        trend: "up",
        change: 0,
      },
      {
        title: "CTR (%)",
        value: ctr,
        format: "percentage",
        icon: <TrendingUp className="h-5 w-5 text-primary" />,
        trend: "up",
        change: 0,
      },
    ];
  }, [data, EUR_TO_USD]);

  // Columns for DataTable
  const columns = allKeys.map((key) => ({
    key,
    label: key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).trim(),
    visible: true,
    tooltip: `Field from AdUp API: ${key}`,
  }));

  // Export all data as CSV
  const handleExportAll = () => {
    if (!data?.rows || !allKeys.length) return;
    const csvContent = [
      allKeys.join(","),
      ...data.rows.map((row: any) => allKeys.map((k) => row[k]).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report?.label || "adup_report"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-background py-8 px-2 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold mb-2 text-primary flex items-center gap-2">
          <span>AdUp Dashboard</span>
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={reportKey} onValueChange={setReportKey} className="mb-4">
              <TabsList>
                {REPORTS.map((r) => (
                  <TabsTrigger key={r.key} value={r.key}>
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {/* KPI Cards at the top */}
            {kpis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {kpis.map((kpi) => (
                  <KPICard key={kpi.title} {...kpi} format={getKPIFormat(kpi.format)} trend={getKPITrend(kpi.trend)} />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-4 items-center mb-4">
              <div className="flex flex-col items-start">
                <span className="font-medium mb-1">Start Date:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={startDate ? "outline" : "secondary"}
                      className="w-[160px] justify-start text-left font-normal"
                    >
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                      initialFocus
                />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium mb-1">End Date:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={endDate ? "outline" : "secondary"}
                      className="w-[160px] justify-start text-left font-normal"
                    >
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                      initialFocus
                />
                  </PopoverContent>
                </Popover>
              </div>
              <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
                {isLoading ? "Loading..." : "Fetch Report"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportAll} disabled={!data?.rows || !allKeys.length}>
                <Download className="h-4 w-4 mr-1" />Export All
              </Button>
            </div>
            <input
              type="text"
              placeholder="Search results..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border px-2 py-1 rounded text-sm mb-4 w-full max-w-xs"
            />
            {error && <div className="text-red-600 mb-2">Error: {typeof error === 'string' ? error : (error.message || String(error))}</div>}
            <DataTable
              data={formatRows(
                (data?.rows || []).filter((row: any) =>
                  !search || Object.values(row).some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()))
                ),
                allKeys
              )}
              columns={columns}
              onColumnToggle={() => {}}
              searchable={false}
              filterable={false}
              exportable={true}
              expandable={true}
            />
            {/* Show 'No data available' if there are no rows, but always show table headers */}
            {(!data?.rows || data.rows.length === 0) && (
              <div className="text-center text-muted-foreground py-8">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 