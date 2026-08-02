import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Readiness: Postgres answers SELECT 1. No DSD/GSC. No secrets in body. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: 'ok',
        check: 'ready',
        database: 'up',
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        check: 'ready',
        database: 'down',
      },
      { status: 503 },
    );
  }
}
