'use client';

import { Navigation } from '@/components/layout/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Navigation>
      <div className="pt-10">
      {children}
      </div>
    </Navigation>
  );
} 