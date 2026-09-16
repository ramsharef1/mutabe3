import { NextRequest, NextResponse } from 'next/server';

const VPS_API = process.env.VPS_API || 'http://127.0.0.1:9080';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathStr = (params.path || []).join('/');
  const url = new URL(request.url);
  const queryStr = url.search;

  try {
    const response = await fetch(`${VPS_API}/api/${pathStr}${queryStr}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'API proxy error', detail: process.env.NODE_ENV === 'production' ? undefined : String((error as any)?.cause ?? error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathStr = (params.path || []).join('/');
  const body = await request.json().catch(() => null);

  try {
    const response = await fetch(`${VPS_API}/api/${pathStr}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'API proxy error' },
      { status: 500 }
    );
  }
}
