'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Website } from '@prisma/client';
import {
  formatDateTimeRu,
  labelLifecycleStage,
  labelWebsiteStatus,
} from '@/lib/ui/labels';

export function WebsiteProfileHeader({
  website,
  openUrl,
}: {
  website: Website;
  openUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyDomain() {
    try {
      await navigator.clipboard.writeText(website.domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="overview" className="space-y-4">
      <Link href="/websites" className="text-sm text-ink-200 hover:text-sand-100">
        ← Сайты
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-sand-100 sm:text-4xl">{website.domain}</h1>
          <p className="mt-1 text-base text-ink-100">{website.name ?? 'Без названия'}</p>
          <p className="mt-1 break-all text-sm text-ink-200">
            {website.primaryUrl ?? openUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-200">
            <span className="rounded border border-ink-700 px-2 py-1 text-ink-100">
              {labelWebsiteStatus(website.status)}
            </span>
            <span className="rounded border border-ink-700 px-2 py-1 text-ink-100">
              {labelLifecycleStage(website.lifecycleStage)}
            </span>
            {website.group ? (
              <span className="rounded border border-ink-700 px-2 py-1">{website.group}</span>
            ) : null}
            {website.tags.map((tag) => (
              <span key={tag} className="rounded border border-ink-700 px-2 py-1">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-200">
            Обновлён: {formatDateTimeRu(website.updatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-white hover:bg-moss-600"
          >
            Открыть сайт
          </a>
          <button
            type="button"
            onClick={copyDomain}
            className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
          >
            {copied ? 'Скопировано' : 'Скопировать домен'}
          </button>
          <a
            href="#add-event"
            className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
          >
            Записать работу
          </a>
          <a
            href="#tasks"
            className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
          >
            Создать задачу
          </a>
          <a
            href="#settings"
            className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
          >
            Редактировать
          </a>
          <Link
            href="/integrations"
            className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
          >
            Открыть интеграции
          </Link>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 text-sm text-ink-200">
        {[
          ['#overview', 'Обзор'],
          ['#tasks', 'Задачи'],
          ['#integrations', 'Интеграции'],
          ['#history', 'История'],
          ['#add-event', 'Добавить запись'],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="shrink-0 rounded border border-ink-700 px-3 py-1.5 hover:border-moss-500 hover:text-sand-100"
          >
            {label}
          </a>
        ))}
      </nav>
    </section>
  );
}
