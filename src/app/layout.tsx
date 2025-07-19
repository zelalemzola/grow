import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import ReactQueryProvider from './ReactQueryProvider';
import { ClerkProvider } from '@clerk/nextjs';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Growevity Analytics - Accounting Automation Dashboard',
  description: 'Real-time insights into your business performance with automated accounting and ad spend tracking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
  <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <ReactQueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
