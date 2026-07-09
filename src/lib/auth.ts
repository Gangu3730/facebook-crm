import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-crm-jwt-key-2026-multi-tenant';
const COOKIE_NAME = 'crm_session';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;          // "SUPER_ADMIN" | "CLIENT_ADMIN" | "CLIENT_MANAGER" | "SALES_EXECUTIVE"
  clientId: string | null; // null for SUPER_ADMIN
}

export function signToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch {
    return null;
  }
}

// Set Session Cookie (Server Action / Route Handler context)
export async function setSessionCookie(user: UserSession) {
  const token = signToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

// Clear Session Cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get User from request cookies (Server Components or Server Actions)
export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie || !cookie.value) return null;
    return verifyToken(cookie.value);
  } catch {
    return null;
  }
}

// Helper to check roles
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

// Helper for API Route Handler context
export function getSessionUserFromRequest(req: NextRequest): UserSession | null {
  const cookie = req.cookies.get(COOKIE_NAME);
  if (!cookie || !cookie.value) return null;
  return verifyToken(cookie.value);
}

// Check if a user is an Agency Super Admin
export function isSuperAdmin(user: UserSession | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}

// Check if a user is a Client Admin
export function isClientAdmin(user: UserSession | null): boolean {
  return user?.role === 'CLIENT_ADMIN';
}
