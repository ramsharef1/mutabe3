import { NextRequest, NextResponse } from 'next/server';

// Dev-only proxy: in production nginx sends /api straight to the backend, so this
// handler only runs under `next dev` (and any host without that nginx rule). It
// passes the method, auth header and raw body through untouched so the dashboard,
// uploads and binary /api/uploads/* responses all work locally too.
const VPS_API = process.env.VPS_API || 'http://127.0.0.1:9080';

export const dynamic = 'force-dynamic';

const PASS_REQ = ['authorization', 'content-type', 'accept', 'cookie', 'x-forwarded-for'];
const PASS_RES = ['content-type', 'cache-control', 'set-cookie', 'etag', 'last-modified'];

async function proxy(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params; // Next 15+ hands route params over as a Promise (D-084)
  const target = `${VPS_API}/api/${(params.path || []).join('/')}${new URL(request.url).search}`;
  const headers = new Headers();
  PASS_REQ.forEach((h) => { const v = request.headers.get(h); if (v) headers.set(h, v); });
  const hasBody = !['GET', 'HEAD'].includes(request.method);

  try {
    const init = {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      duplex: 'half', // required by undici when streaming a request body
      redirect: 'manual',
      cache: 'no-store',
    } as RequestInit & { duplex: 'half' };
    const res = await fetch(target, init);
    const out = new Headers();
    PASS_RES.forEach((h) => { const v = res.headers.get(h); if (v) out.set(h, v); });
    return new NextResponse(res.body, { status: res.status, headers: out });
  } catch (error) {
    return NextResponse.json(
      { error: 'API proxy error', detail: process.env.NODE_ENV === 'production' ? undefined : String((error as any)?.cause ?? error) },
      { status: 502 }
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
