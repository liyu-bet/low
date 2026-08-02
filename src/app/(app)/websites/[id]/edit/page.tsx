import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateWebsiteAction } from '@/app/(app)/websites/actions';
import { WebsiteForm } from '@/components/WebsiteForm';
import { WebsiteNotFoundError, getWebsiteById } from '@/lib/websites/service';

export default async function EditWebsitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let website;
  try {
    website = await getWebsiteById(id);
  } catch (error) {
    if (error instanceof WebsiteNotFoundError) notFound();
    throw error;
  }

  const action = updateWebsiteAction.bind(null, website.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/websites/${website.id}`} className="text-sm text-ink-200 hover:text-sand-100">
          ← {website.domain}
        </Link>
        <h1 className="mt-2 font-display text-3xl text-sand-100">Редактировать сайт</h1>
      </div>
      <WebsiteForm action={action} website={website} submitLabel="Сохранить" />
    </div>
  );
}
