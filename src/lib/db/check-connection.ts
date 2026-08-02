import { prisma } from './prisma';

async function main() {
  const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1::int AS ok`;
  if (!result[0] || result[0].ok !== 1) {
    throw new Error('Unexpected response from PostgreSQL');
  }
  console.log('PostgreSQL connection OK');
  console.log(`DATABASE_URL host check: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);
}

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return '(missing DATABASE_URL)';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username}@${parsed.hostname}:${parsed.port}${parsed.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

main()
  .catch((error) => {
    console.error('PostgreSQL connection FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
