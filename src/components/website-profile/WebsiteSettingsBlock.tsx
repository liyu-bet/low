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
    <button type="submit" disabled={pending} className="btn-danger">
      <span className="inline-block min-w-[9rem] text-center">
        {pending ? '…' : 'Архивировать сайт'}
      </span>
    </button>
  );
}

export function WebsiteSettingsBlock({ website }: { website: Website }) {
  const [confirm, setConfirm] = useState('');
  const action = updateWebsiteAction.bind(null, website.id);

  return (
    <div className="space-y-4">
      <WebsiteForm action={action} website={website} submitLabel="Сохранить настройки" />
      <p className="text-sm text-ink-200">
        Полная страница редактирования:{' '}
        <Link href={`/websites/${website.id}/edit`} className="text-moss-600">
          открыть
        </Link>
      </p>

      {!website.archivedAt ? (
        <details className="border-t border-ink-800 pt-2">
          <summary className="disclosure-summary text-red-700">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="disclosure-chevron">
              <path
                d="M6 3.5 10.5 8 6 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Опасная зона
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-sm text-ink-200">
              Архивирование скрывает сайт из основного списка. Связанные события, задачи и
              интеграции не удаляются. Сайт можно вернуть в любой момент: «Сайты» → «Фильтры» →
              «Показать архив» → «Вернуть в LOW».
            </p>
            <form action={archiveWebsiteAction.bind(null, website.id)} className="space-y-3">
              <label className="block text-sm text-ink-200">
                Введите АРХИВИРОВАТЬ для подтверждения
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="field-input mt-1"
                  autoComplete="off"
                />
              </label>
              {confirm === 'АРХИВИРОВАТЬ' ? <ArchiveSubmit /> : null}
            </form>
          </div>
        </details>
      ) : (
        <p className="text-sm text-ink-200">
          Сайт в архиве. Вернуть его можно из списка сайтов: «Фильтры» → «Показать архив» →
          «Вернуть в LOW».
        </p>
      )}
    </div>
  );
}
