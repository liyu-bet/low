import Link from 'next/link';
import { createWebsiteAction } from '@/app/(app)/websites/actions';
import { WebsiteForm } from '@/components/WebsiteForm';

export default function NewWebsitePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/websites" className="text-sm text-ink-200 hover:text-sand-100">
          ← Сайты
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-sand-100">Добавить сайт</h1>
        <p className="mt-1 text-sm text-ink-200">
          Домен нормализуется для сопоставления. Событие «Сайт создан» пишется автоматически.
        </p>
      </div>
      <WebsiteForm action={createWebsiteAction} submitLabel="Создать сайт" />
    </div>
  );
}
