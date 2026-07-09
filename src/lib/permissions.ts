import { UserSession } from '@/lib/auth';

/**
 * Returns a Prisma `where` filter fragment that scopes queries to the correct client.
 *
 * - SUPER_ADMIN with no override → sees everything (no clientId filter)
 * - SUPER_ADMIN with clientId override → sees only that client's data
 * - CLIENT_ADMIN / CLIENT_MANAGER → sees only their own client's data
 * - SALES_EXECUTIVE → sees only their own client's data AND leads assigned to them
 */
export function clientScopeFilter(
  user: UserSession,
  overrideClientId?: string | null
): { clientId?: string } {
  if (user.role === 'SUPER_ADMIN') {
    // If an override is provided (Super Admin "impersonating" a client), apply it
    if (overrideClientId) {
      return { clientId: overrideClientId };
    }
    // Otherwise, no restriction – Super Admin sees everything
    return {};
  }

  // All client-level roles always scope to their own clientId
  if (!user.clientId) {
    throw new Error('Client-level user has no clientId in session.');
  }
  return { clientId: user.clientId };
}

/**
 * For Sales Executives, also restrict to only leads assigned to them.
 */
export function leadScopeFilter(
  user: UserSession,
  overrideClientId?: string | null
): { clientId?: string; assignedUserId?: string } {
  const base = clientScopeFilter(user, overrideClientId);

  if (user.role === 'SALES_EXECUTIVE') {
    return { ...base, assignedUserId: user.id };
  }

  return base;
}

/**
 * Throws a 403-style error if the user does not have one of the allowed roles.
 */
export function requireRole(user: UserSession | null, allowedRoles: string[]): void {
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Verify a user belongs to the given clientId (or is Super Admin).
 */
export function assertClientAccess(user: UserSession, clientId: string): void {
  if (user.role === 'SUPER_ADMIN') return;
  if (user.clientId !== clientId) {
    throw new Error('FORBIDDEN');
  }
}
