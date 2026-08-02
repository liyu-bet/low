import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Liveness: process is up. No DB / secrets. */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      check: 'live',
    },
    { status: 200 },
  );
}
