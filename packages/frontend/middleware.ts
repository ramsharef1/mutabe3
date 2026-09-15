import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Prevent redirect to /login - serve homepage instead
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '') {
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
