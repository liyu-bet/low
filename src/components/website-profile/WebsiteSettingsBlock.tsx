'use client';

import Link from 'next/link';
import { updateWebsiteAction } from '@/app/(app)/websites/actions';
import { archiveWebsiteAction } from '@/app/(app)/websites/actions';
import { WebsiteForm } from '@/components/WebsiteForm';
import type { Website } from '@prisma/client';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';

function ArchiveSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border border-red-500/50 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-60"
    >
      {pending ? 'Архивация…' : 'Архивировать сайт'}
    </button>
  );
}

export function WebsiteSettingsBlock({ website }: { website: Website }) {
  const [confirm, setConfirm] = useState('');
  const action = updateWebsiteAction.bind(null, website.id);

  return (
    <section id="settings" className="space-y-4">
      <details className="rounded border border-ink-700/70 bg-ink-950/40 p-4">
        <summary className="cursor-pointer font-display text-2xl text-sand-100">
          Настройки сайта
        </summary>
        <div className="mt-4 space-y-3">
          <WebsiteForm action={action} website={website} submitLabel="Сохранить настройки" />
          <p className="text-sm text-ink-200">
            Полная страница редактирования:{' '}
            <Link href={`/websites/${website.id}/edit`} className="text-moss-400">
              открыть
            </Link>
          </p>
        </div>
      </details>

      {!website.archivedAt ? (
        <details className="rounded border border-red-500/30 bg-ink-950/40 p-4">
          <summary className="cursor-pointer text-sm text-red-200">Опасная зона</summary>
          <div className="mt-3 space-y-3">
            <p className="text-sm text-ink-200">
              Архивирование скрывает сайт из основного списка. Связанные события, задачи и
              интеграции не удаляются. Отменить через интерфейс пока нельзя.
            </p>
            <form action={archiveWebsiteAction.bind(null, website.id)} className="space-y-3">
              <label className="block text-sm text-ink-200">
                Введите АРХИВИРОВАТЬ для подтверждения
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50"
                  autoComplete="off"
                />
              </label>
              {confirm === 'АРХИВИРОВАТЬ' ? <ArchiveSubmit /> : null}
            </form>
          </div>
        </details>
      ) : (
        <p className="text-sm text-ink-200">Сайт уже в архиве.</p>
      )}
    </section>
  );
}
