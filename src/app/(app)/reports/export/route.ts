import { NextResponse } from 'next/server';
import { requireUserSession } from '@/app/login/actions';
import { buildReportsCsvExport } from '@/lib/reports/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  await requireUserSession();

  const url = new URL(request.url);
  const searchParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });

  const { filename, body } = await buildReportsCsvExport(searchParams);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
