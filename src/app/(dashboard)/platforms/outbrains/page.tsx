'use client'
import React, { useState } from 'react';
import MarketersList from './MarketersList';
import CampaignsList from './CampaignsList';
import BudgetsList from './BudgetsList';
import LocationsSearch from './LocationsSearch';
import PerformanceTable from './PerformanceTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const OutbrainsPage = () => {
  const [selectedMarketer, setSelectedMarketer] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsType, setDetailsType] = useState<'campaign' | 'budget' | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);

  // Handler for opening details modal
  const openDetails = (type: 'campaign' | 'budget', data: any) => {
    setDetailsType(type);
    setDetailsData(data);
    setDetailsOpen(true);
  };

  return (
    <main className="min-h-screen bg-background py-8 px-2 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold mb-2 text-primary flex items-center gap-2">
          <span>Outbrain Dashboard</span>
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Marketers</CardTitle>
          </CardHeader>
          <CardContent>
            <MarketersList
              onSelect={id => {
                setSelectedMarketer(id);
                setSelectedCampaign(null);
              }}
              selectedMarketerId={selectedMarketer || undefined}
            />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Campaigns</CardTitle>
              <Button size="sm" variant="outline" onClick={() => {/* export logic */}}>Export</Button>
            </CardHeader>
            <CardContent>
              {selectedMarketer ? (
                <CampaignsList
                  marketerId={selectedMarketer}
                  onSelect={id => {
                    setSelectedCampaign(id);
                  }}
                  selectedCampaignId={selectedCampaign || undefined}
                  onDetails={data => openDetails('campaign', data)}
                />
              ) : (
                <div className="text-muted-foreground">Select a marketer to view campaigns.</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Budgets</CardTitle>
              <Button size="sm" variant="outline" onClick={() => {/* export logic */}}>Export</Button>
            </CardHeader>
            <CardContent>
              {selectedMarketer ? (
                <BudgetsList
                  marketerId={selectedMarketer}
                  onDetails={data => openDetails('budget', data)}
                />
              ) : (
                <div className="text-muted-foreground">Select a marketer to view budgets.</div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Performance Table */}
        {selectedMarketer && (
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceTable marketerId={selectedMarketer} campaignId={selectedCampaign || undefined} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationsSearch />
          </CardContent>
        </Card>
      </div>
      {/* Details Modal (Sheet) */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="max-w-md w-full">
          <SheetHeader>
            <SheetTitle>{detailsType === 'campaign' ? 'Campaign Details' : 'Budget Details'}</SheetTitle>
          </SheetHeader>
          {/* Details content here, render detailsData */}
          <pre className="text-xs mt-4 bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(detailsData, null, 2)}</pre>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default OutbrainsPage; 