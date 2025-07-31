import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test IPv4 specifically
    const ipv4Response = await fetch('https://ifconfig.me', {
      method: 'GET',
      headers: {
        'User-Agent': 'Next.js-Server'
      }
    });
    const ipv4 = await ipv4Response.text();
    
    // Test with curl-like approach
    const testResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await testResponse.json();
    
    return NextResponse.json({
      ipv4_from_ifconfig: ipv4,
      ip_from_ipify: ipData.ip,
      timestamp: new Date().toISOString(),
      server_info: {
        node_version: process.version,
        platform: process.platform
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get IP info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 