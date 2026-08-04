import Link from 'next/link';
import type { ReactNode } from 'react';
import { TaskCard } from '@/components/tasks/TaskCard';
import type { TaskListItem } from '@/lib/tasks/types';
import {
  countOpenInSections,
  type DoneTaskSections,
  type TaskSections,
} from '@/lib/tasks/sections';

function Section({
  title,
  items,
  currentUserId,
  canEditTask,
  users,
  hideDueInMeta,
  tone,
}: {
  title: string;
  items: TaskListItem[];
  currentUserId?: string;
  canEditTask: (item: TaskListItem) => boolean;
  users: Array<{ id: string; name: string; email: string }>;
  hideDueInMeta?: boolean;
  tone?: 'overdue';
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2
        className={
          tone === 'overdue'
            ? 'text-sm font-medium text-red-700'
            : 'text-sm font-medium text-ink-200'
        }
      >
        {title}
        <span className="ml-1.5 font-normal text-ink-200">{items.length}</span>
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <TaskCard
            key={item.id}
            item={item}
            currentUserId={currentUserId}
            canEdit={canEditTask(item)}
            users={users}
            hideDueInMeta={hideDueInMeta}
          />
        ))}
      </ul>
    </section>
  );
}

export function OpenTaskSections({
  sections,
  currentUserId,
  canEditTask,
  users,
  empty,
}: {
  sections: TaskSections;
  currentUserId?: string;
  canEditTask: (item: TaskListItem) => boolean;
  users: Array<{ id: string; name: string; email: string }>;
  empty: ReactNode;
}) {
  if (countOpenInSections(sections) === 0) return <>{empty}</>;

  return (
    <div className="space-y-6">
      <Section
        title="Просрочено"
        items={sections.overdue}
        currentUserId={currentUserId}
        canEditTask={canEditTask}
        users={users}
        tone="overdue"
      />
      <Section
        title="Сегодня"
        items={sections.today}
        currentUserId={currentUserId}
        canEditTask={canEditTask}
        users={users}
      />
      <Section
        title="Ближайшие"
        items={sections.upcoming}
        currentUserId={currentUserId}
        canEditTask={canEditTask}
        users={users}
      />
      <Section
        title="Без срока"
        items={sections.noDue}
        currentUserId={currentUserId}
        canEditTask={canEditTask}
        users={users}
        hideDueInMeta
      />
    </div>
  );
}

export function DoneTaskSectionsView({
  sections,
  empty,
}: {
  sections: DoneTaskSections;
  empty: ReactNode;
}) {
  if (sections.today.length + sections.earlier.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-6">
      {sections.today.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-ink-200">Сегодня</h2>
          <ul className="space-y-2">
            {sections.today.map((item) => (
              <TaskCard key={item.id} item={item} canEdit={false} mode="done" />
            ))}
          </ul>
        </section>
      ) : null}
      {sections.earlier.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-ink-200">Ранее</h2>
          <ul className="space-y-2">
            {sections.earlier.map((item) => (
              <TaskCard key={item.id} item={item} canEdit={false} mode="done" />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function FlatTaskList({
  items,
  currentUserId,
  canEditTask,
  users,
  empty,
}: {
  items: TaskListItem[];
  currentUserId?: string;
  canEditTask: (item: TaskListItem) => boolean;
  users: Array<{ id: string; name: string; email: string }>;
  empty: ReactNode;
}) {
  if (items.length === 0) return <>{empty}</>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <TaskCard
          key={item.id}
          item={item}
          currentUserId={currentUserId}
          canEdit={canEditTask(item)}
          users={users}
          mode={item.status === 'DONE' ? 'done' : 'open'}
        />
      ))}
    </ul>
  );
}

export function EmptyMine() {
  return (
    <div className="space-y-2 text-sm text-ink-200">
      <p>У вас нет открытых задач.</p>
      <Link href="/tasks?focus=open" className="text-moss-700 hover:underline">
        Показать все открытые
      </Link>
    </div>
  );
}
