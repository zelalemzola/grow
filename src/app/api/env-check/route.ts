import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      CHECKOUT_CHAMP_USERNAME: process.env.CHECKOUT_CHAMP_USERNAME ? '***SET***' : 'NOT_SET',
      CHECKOUT_CHAMP_PASSWORD: process.env.CHECKOUT_CHAMP_PASSWORD ? '***SET***' : 'NOT_SET',
      // Add other env vars you might need
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
} 