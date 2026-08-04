'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  archiveWebsiteFromListAction,
  restoreWebsiteFromListAction,
  type WebsiteListActionState,
} from '@/app/(app)/websites/actions';
import { WebsiteArchiveDialog } from '@/components/websites/WebsiteArchiveDialog';
import { IconExternal, IconPlus, IconRestore, IconTrash } from '@/components/websites/WebsiteIcons';
import type { WebsiteWorkspaceClientRow } from '@/components/websites/types';
import { preserveScroll } from '@/components/ui/ActionMenu';
import { resolveSafeWebsiteOpenUrl } from '@/lib/websites/website-open-url';
import { cn } from '@/lib/ui/cn';

function RestoreIconSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={pending ? 'Возвращаем сайт в LOW' : 'Вернуть в LOW'}
      className={cn(
        'icon-btn border-moss-500/50 text-moss-700 hover:border-moss-500 hover:bg-moss-50',
        pending && 'opacity-60',
      )}
    >
      <IconRestore />
    </button>
  );
}

export function WebsiteCardActions({
  row,
  archived,
  isAdmin,
  inlineOpen,
  onToggleInline,
  onNotice,
}: {
  row: WebsiteWorkspaceClientRow;
  archived: boolean;
  isAdmin: boolean;
  inlineOpen: boolean;
  onToggleInline: () => void;
  onNotice?: (message: string) => void;
}) {
  const router = useRouter();
  const archiveButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const archiveBound = archiveWebsiteFromListAction.bind(null, row.id);
  const restoreBound = restoreWebsiteFromListAction.bind(null, row.id);
  const [archiveState, archiveAction] = useActionState(
    archiveBound,
    {} as WebsiteListActionState,
  );
  const [restoreState, restoreAction] = useActionState(
    restoreBound,
    {} as WebsiteListActionState,
  );

  const openUrl = resolveSafeWebsiteOpenUrl(row.primaryUrl, row.normalizedDomain || row.domain);

  useEffect(() => {
    if (archiveState.ok) {
      setConfirmOpen(false);
      onNotice?.('Сайт перемещён в архив');
      preserveScroll(() => router.refresh());
    }
  }, [archiveState, router, onNotice]);

  useEffect(() => {
    if (restoreState.ok) {
      onNotice?.('Сайт возвращён в LOW');
      preserveScroll(() => router.refresh());
    }
  }, [restoreState, router, onNotice]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {openUrl ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Открыть сайт ${row.domain} в новой вкладке`}
            title="Открыть сайт"
            className="icon-btn"
            data-external-open="true"
          >
            <IconExternal />
          </a>
        ) : (
          <span
            role="button"
            aria-disabled="true"
            aria-label="Адрес сайта не указан"
            title="Адрес сайта не указан"
            className="icon-btn cursor-not-allowed opacity-40"
          >
            <IconExternal />
          </span>
        )}

        {!archived ? (
          <button
            type="button"
            onClick={onToggleInline}
            aria-pressed={inlineOpen}
            aria-label={inlineOpen ? 'Скрыть форму задачи' : 'Добавить задачу'}
            className={cn(
              'icon-btn',
              inlineOpen
                ? 'border-moss-500 bg-moss-50 text-moss-700'
                : 'border-moss-600 bg-moss-500 text-white hover:bg-moss-600 hover:border-moss-600',
            )}
          >
            <IconPlus />
          </button>
        ) : null}

        {isAdmin ? (
          archived ? (
            <form action={restoreAction} className="inline-flex">
              <RestoreIconSubmit />
            </form>
          ) : (
            <button
              ref={archiveButtonRef}
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label="Убрать из LOW"
              className="icon-btn text-ink-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:border-red-300 focus-visible:text-red-700"
            >
              <IconTrash />
            </button>
          )
        ) : null}
      </div>

      {restoreState.error ? (
        <p className="text-xs text-red-700" role="status">
          {restoreState.error}
        </p>
      ) : null}

      {confirmOpen ? (
        <WebsiteArchiveDialog
          domain={row.domain}
          formAction={archiveAction}
          onCancel={() => setConfirmOpen(false)}
          error={archiveState.error}
          returnFocusRef={archiveButtonRef}
        />
      ) : null}
    </>
  );
}
