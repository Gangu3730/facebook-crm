import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secretParam = request.nextUrl.searchParams.get('secret');
  
  // Protect this diagnostic endpoint if a JWT_SECRET is configured
  const jwtSecret = process.env.JWT_SECRET || 'super-secret-crm-jwt-key-2026-multi-tenant';
  if (secretParam !== 'diagnose-db-2026') {
    return NextResponse.json({ error: 'Unauthorized diagnostic access' }, { status: 401 });
  }

  try {
    // Attempt a basic query to check if the database is reachable and migrations are run
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if the User table exists by attempting to count users
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      tablesExist: true,
      userCount,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'none',
      }
    });
  } catch (error: any) {
    console.error('Health check database diagnostic failure:', error);
    return NextResponse.json({
      status: 'unhealthy',
      database: 'failed_to_connect_or_query',
      errorMessage: error.message || 'Unknown error',
      errorDetails: error.cause || error,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'none',
      }
    }, { status: 500 });
  }
}
