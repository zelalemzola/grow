"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "@/components/dashboard/DataTable";

function useTaboolaAdvertisers() {
  return useQuery({
    queryKey: ["taboola", "advertisers"],
    queryFn: async () => {
      const res = await fetch("/api/taboola/advertisers");
      if (!res.ok) throw new Error("Failed to fetch advertisers");
      return res.json();
    },
  });
}

function useTaboolaCampaigns(accountId?: string) {
  return useQuery({
    queryKey: ["taboola", "campaigns", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const res = await fetch(`/api/taboola/campaigns?account_id=${accountId}`);
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
    enabled: !!accountId,
  });
}

function useTaboolaConversionRules(accountId?: string) {
  return useQuery({
    queryKey: ["taboola", "conversion-rules", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const res = await fetch(`/api/taboola/conversion-rules?account_id=${accountId}`);
      if (!res.ok) throw new Error("Failed to fetch conversion rules");
      return res.json();
    },
    enabled: !!accountId,
  });
}

function useTaboolaCampaignReports(accountId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ["taboola", "reports", accountId, from, to],
    queryFn: async () => {
      if (!accountId || !from || !to) return [];
      const res = await fetch(`/api/taboola/reports/campaigns?account_id=${accountId}&from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed to fetch campaign reports");
      return res.json();
    },
    enabled: !!accountId && !!from && !!to,
  });
}

function dynamicColumns(rows: any[], alwaysShow: { key: string; label: string; tooltip?: string }[] = []) {
  if (!rows.length) return alwaysShow.map(col => ({ ...col, visible: true }));
  const keys = new Set<string>();
  rows.forEach(row => Object.keys(row).forEach(k => keys.add(k)));
  return [
    ...alwaysShow.map(col => ({ ...col, visible: true })),
    ...Array.from(keys).filter(k => !alwaysShow.some(col => col.key === k) && k !== "budget").map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim(),
      visible: true,
      tooltip: `Field from Taboola API: ${key}`,
    })),
  ];
}

function formatRow(row: any, allKeys: string[]) {
  const formatted: Record<string, any> = {};
  for (const key of allKeys) {
    if (key === "budget") continue;
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
}

const alwaysShowAdvertiser = [
  { key: "name", label: "Advertiser Name", tooltip: "The name of the advertiser." },
  { key: "account_id", label: "Account ID", tooltip: "Taboola account ID." },
];
const alwaysShowCampaign = [
  { key: "name", label: "Campaign Name", tooltip: "The name of the campaign." },
  { key: "id", label: "Campaign ID", tooltip: "Unique campaign identifier." },
];
const alwaysShowConversionRule = [
  { key: "display_name", label: "Rule Name", tooltip: "Conversion rule display name." },
  { key: "id", label: "Rule ID", tooltip: "Conversion rule ID." },
];
const alwaysShowReport = [
  { key: "date", label: "Date", tooltip: "Report date." },
  { key: "campaign", label: "Campaign", tooltip: "Campaign name or ID." },
];

export default function TaboolaPage() {
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Fetch all advertisers
  const { data: advertisersData, isLoading: advLoading, error: advError } = useTaboolaAdvertisers();
  const advertisers = advertisersData?.results || [];

  // Fetch campaigns, conversion rules, and reports for selected advertiser
  const { data: campaignsData, isLoading: campLoading, error: campError } = useTaboolaCampaigns(selectedAdvertiser || undefined);
  const campaigns = campaignsData?.results || [];

  const { data: convRulesData, isLoading: convLoading, error: convError } = useTaboolaConversionRules(selectedAdvertiser || undefined);
  const conversionRules = convRulesData?.results || [];

  const { data: reportsData, isLoading: repLoading, error: repError } = useTaboolaCampaignReports(selectedAdvertiser || undefined, from, to);
  const reports = reportsData?.results || [];

  // Dynamic columns
  const advColumns = dynamicColumns(advertisers, alwaysShowAdvertiser);
  const campColumns = dynamicColumns(campaigns, alwaysShowCampaign);
  const convColumns = dynamicColumns(conversionRules, alwaysShowConversionRule);
  const repColumns = dynamicColumns(reports, alwaysShowReport);

  // All keys for formatting
  const advKeys = advColumns.map(c => c.key);
  const campKeys = campColumns.map(c => c.key);
  const convKeys = convColumns.map(c => c.key);
  const repKeys = repColumns.map(c => c.key);

  // Handlers
  const openDetails = (data: any) => {
    setDetailsData(data);
    setDetailsOpen(true);
  };

  return (
    <main className="min-h-screen bg-background py-8 px-2 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold mb-2 text-primary flex items-center gap-2">
          <span>Taboola Dashboard</span>
        </h1>
        {/* Advertisers */}
        <Card>
          <CardHeader>
            <CardTitle>Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            {advLoading ? (
              <div className="animate-pulse">Loading advertisers...</div>
            ) : advError ? (
              <div className="text-red-600">Error: {advError.message}</div>
            ) : advertisers.length === 0 ? (
              <div className="text-muted-foreground">No advertisers found.</div>
            ) : (
              <DataTable
                data={advertisers.map((row: any) => formatRow(row, advKeys))}
                columns={advColumns}
                onColumnToggle={() => {}}
                searchable={true}
                filterable={false}
                exportable={true}
                expandable={true}
                onRowToggle={id => {
                  const adv = advertisers.find((a: any) => a.account_id === id || a.id === id);
                  if (adv) openDetails(adv);
                }}
              />
            )}
            {/* Advertiser selection */}
            <div className="mt-4 flex flex-wrap gap-2">
              {advertisers.map((adv: any) => (
                <Button
                  key={adv.account_id}
                  variant={selectedAdvertiser === adv.account_id ? "default" : "outline"}
                  onClick={() => setSelectedAdvertiser(adv.account_id)}
                  size="sm"
                >
                  {adv.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Campaigns */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Campaigns</CardTitle>
            <Button size="sm" variant="outline" onClick={() => {}}>Export</Button>
          </CardHeader>
          <CardContent>
            {campLoading ? (
              <div className="animate-pulse">Loading campaigns...</div>
            ) : campError ? (
              <div className="text-red-600">Error: {campError.message}</div>
            ) : campaigns.length === 0 ? (
              <div className="text-muted-foreground">No campaigns found.</div>
            ) : (
              <DataTable
                data={campaigns.map((row: any) => formatRow(row, campKeys))}
                columns={campColumns}
                onColumnToggle={() => {}}
                searchable={true}
                filterable={false}
                exportable={true}
                expandable={true}
                onRowToggle={id => {
                  const camp = campaigns.find((c: any) => c.id === id);
                  if (camp) openDetails(camp);
                }}
              />
            )}
          </CardContent>
        </Card>
        {/* Conversion Rules */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Conversion Rules</CardTitle>
            <Button size="sm" variant="outline" onClick={() => {}}>Export</Button>
          </CardHeader>
          <CardContent>
            {convLoading ? (
              <div className="animate-pulse">Loading conversion rules...</div>
            ) : convError ? (
              <div className="text-red-600">Error: {convError.message}</div>
            ) : conversionRules.length === 0 ? (
              <div className="text-muted-foreground">No conversion rules found.</div>
            ) : (
              <DataTable
                data={conversionRules.map((row: any) => formatRow(row, convKeys))}
                columns={convColumns}
                onColumnToggle={() => {}}
                searchable={true}
                filterable={false}
                exportable={true}
                expandable={true}
                onRowToggle={id => {
                  const rule = conversionRules.find((r: any) => r.id === id);
                  if (rule) openDetails(rule);
                }}
              />
            )}
          </CardContent>
        </Card>
        {/* Campaign Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="border px-2 py-1 rounded text-sm"
                placeholder="From"
              />
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="border px-2 py-1 rounded text-sm"
                placeholder="To"
              />
            </div>
            {repLoading ? (
              <div className="animate-pulse">Loading campaign reports...</div>
            ) : repError ? (
              <div className="text-red-600">Error: {repError.message}</div>
            ) : reports.length === 0 ? (
              <div className="text-muted-foreground">No campaign reports found.</div>
            ) : (
              <DataTable
                data={reports.map((row: any) => formatRow(row, repKeys))}
                columns={repColumns}
                onColumnToggle={() => {}}
                searchable={true}
                filterable={false}
                exportable={true}
                expandable={true}
                onRowToggle={id => {
                  const rep = reports.find((r: any) => r.id === id || r.campaign === id);
                  if (rep) openDetails(rep);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
      {/* Details Modal (Sheet) */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="max-w-md w-full">
          <SheetHeader>
            <SheetTitle>Details</SheetTitle>
          </SheetHeader>
          <pre className="text-xs mt-4 bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(detailsData, null, 2)}</pre>
        </SheetContent>
      </Sheet>
    </main>
  );
} 