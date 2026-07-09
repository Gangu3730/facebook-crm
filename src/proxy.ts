import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'crm_session';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-crm-jwt-key-2026-multi-tenant';

// Public paths that do not require authentication
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/facebook/webhook', // Facebook webhook must be public
];

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Custom JWT verification helper using Web Crypto API (runs in Next.js Edge runtime)
async function verifyJWT(token: string, secret: string): Promise<any | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigString = base64urlDecode(signatureB64);
    const signature = Uint8Array.from(sigString, (c) => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      data
    );

    if (!isValid) return null;

    const payloadJson = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    // Redirect already-logged-in users away from auth pages
    if (['/login', '/register', '/forgot-password'].includes(pathname)) {
      const cookie = request.cookies.get(COOKIE_NAME);
      if (cookie?.value) {
        const decoded = await verifyJWT(cookie.value, JWT_SECRET);
        if (decoded) {
          // Super Admin → Agency, everyone else → Dashboard
          const dest = decoded.role === 'SUPER_ADMIN' ? '/agency' : '/dashboard';
          return NextResponse.redirect(new URL(dest, request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Require auth
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Please log in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const decoded = await verifyJWT(cookie.value, JWT_SECRET);
  if (!decoded) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Session expired. Please log in again.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Role-based route protection
  // Agency routes (/agency/*) → SUPER_ADMIN only
  if (pathname.startsWith('/agency') && decoded.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Dashboard routes (/dashboard/*, /leads/*, etc.) → non-SUPER_ADMIN
  // Super Admin should use /agency routes
  const clientRoutes = ['/dashboard', '/leads', '/pipeline', '/followups', '/calendar', '/team', '/reports'];
  if (clientRoutes.some(r => pathname.startsWith(r)) && decoded.role === 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/agency', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
