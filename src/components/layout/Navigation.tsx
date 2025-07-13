'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  History, 
  Package, 
  Globe, 
  FileText,
  Settings,
  Home,
  Moon,
  Sun,
  Menu,
  X,
  DollarSign,
  Target,
  Calculator
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useState } from 'react';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    group: 'main'
  },
  {
    href: '/reports',
    label: 'Historical Reports',
    icon: History,
    group: 'reports'
  },
  {
    href: '/ad-spend',
    label: 'Ad Spend',
    icon: DollarSign,
    group: 'reports'
  },
  {
    href: '/platforms',
    label: 'Platform Analytics',
    icon: Target,
    group: 'reports'
  },
  // {
  //   href: '/calculator',
  //   label: 'Calculator',
  //   icon: Calculator,
  //   group: 'analysis'
  // },
  {
    href: '/sku-breakdown',
    label: 'SKU Analysis',
    icon: Package,
    group: 'analysis'
  },
  {
    href: '/geographic',
    label: 'Geographic Insights',
    icon: Globe,
    group: 'analysis'
  },
  {
    href: '/orders',
    label: 'Order Details',
    icon: FileText,
    group: 'reports'
  },
];

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  const getGroupLabel = (group: string) => {
    switch (group) {
      case 'main': return 'Main';
      case 'reports': return 'Reports';
      case 'analysis': return 'Analysis';
      default: return group;
    }
  };

  const renderNavItems = () => (
    <>
      {Object.entries(groupedItems).map(([group, items]) => (
        <SidebarGroup key={group}>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {getGroupLabel(group)}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="text-sm"
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={() => setMobileOpen(false)}>
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );

  return (
    <SidebarProvider>
      <Sidebar className="hidden lg:block" collapsible='icon'>
        <SidebarHeader className="border-b px-4 py-4 group-data-[collapsible=icon]:px-2" >
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">Growevity</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1">
          {renderNavItems()}
        </SidebarContent>
        {/* <SidebarFooter className="border-t px-4 py-4 group-data-[collapsible=icon]:px-2">
          <div className="flex items-center justify-between">
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/settings">
                <Settings className="w-4 h-4" />
                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
              </Link>
            </SidebarMenuButton>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="h-8 w-8 p-0"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </SidebarFooter> */}
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 hidden lg:flex" />
            <div className="flex items-center gap-2 lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="border-b px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-lg">Grow Analytics</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMobileOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </SheetHeader>
                  <div className="p-4">
                    {renderNavItems()}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/settings">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                          className="h-8 w-8 p-0"
                        >
                          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 flex-1">
            <h1 className="text-base sm:text-lg font-semibold truncate">
              {navItems.find(item => item.href === pathname)?.label || 'Grow Analytics'}
            </h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 