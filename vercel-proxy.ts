// Vercel reverse proxy to VPS
// This runs on vercel.app and proxies all requests to the VPS

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VPS_URL = 'http://72.62.132.138:3100';

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;

  try {
    const response = await fetch(`${VPS_URL}${pathname}${search}`, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'X-Forwarded-For': request.ip || '',
        'X-Forwarded-Proto': 'https',
      },
      body: request.body ? await request.text() : undefined,
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Proxy error', details: String(error) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const config = {
  matcher: ['/:path*'],
};
