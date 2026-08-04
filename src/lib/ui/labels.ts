import type {
  DateSource,
  EventCategory,
  EventSource,
  LifecycleStage,
  TaskPriority,
  TaskStatus,
  WebsiteStatus,
} from '@prisma/client';

export const APP_FULL_NAME_RU = 'Жизнь сайтов';

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  PAUSED: 'Пауза',
  ARCHIVED: 'В архиве',
};

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  IDEA: 'Идея',
  SETUP: 'Настройка',
  LAUNCHED: 'Запущен',
  INDEXING: 'Индексация',
  GROWING: 'Рост',
  MATURE: 'Зрелый',
  DECLINING: 'Спад',
  ARCHIVED: 'Архив',
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  LIFECYCLE: 'Жизненный цикл',
  TECHNICAL: 'Техническое',
  SEO: 'SEO',
  CONTENT: 'Контент',
  FINANCE: 'Финансы',
  INTEGRATION: 'Интеграция',
  NOTE: 'Заметка',
  DATES: 'Даты',
};

export const EVENT_SOURCE_LABELS: Record<EventSource, string> = {
  MANUAL: 'Вручную',
  SYSTEM: 'Система',
  DSD: 'DSD',
  GSC: 'GSC',
};

export const DATE_SOURCE_LABELS: Record<DateSource, string> = {
  MANUAL: 'вручную',
  DSD: 'DSD',
  GSC: 'GSC',
  SYSTEM: 'система',
  INFERRED: 'выведено',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Запланировано',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнено',
  CANCELED: 'Отменено',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Обычный',
  HIGH: 'Высокий',
  CRITICAL: 'Критический',
};

export const SYNC_RUN_STATUS_LABELS: Record<string, string> = {
  RUNNING: 'Выполняется',
  SUCCESS: 'Успешно',
  PARTIAL: 'Частично',
  FAILED: 'Ошибка',
  SKIPPED: 'Пропущено',
};

export function labelSyncRunStatus(status: string): string {
  return SYNC_RUN_STATUS_LABELS[status] ?? status;
}

/** Manual event types offered in the form (machine keys stay English). */
export const MANUAL_EVENT_TYPES = [
  { value: 'note', label: 'Заметка', category: 'NOTE' as const },
  { value: 'work', label: 'Работа', category: 'LIFECYCLE' as const },
  { value: 'launch', label: 'Запуск', category: 'LIFECYCLE' as const },
  { value: 'content', label: 'Контент', category: 'CONTENT' as const },
  { value: 'seo', label: 'SEO', category: 'SEO' as const },
  { value: 'technical', label: 'Техническое', category: 'TECHNICAL' as const },
  { value: 'payment', label: 'Платёж', category: 'FINANCE' as const },
  { value: 'date_corrected', label: 'Коррекция даты', category: 'LIFECYCLE' as const },
] as const;

export type ManualEventType = (typeof MANUAL_EVENT_TYPES)[number]['value'];

export function labelWebsiteStatus(status: WebsiteStatus): string {
  return WEBSITE_STATUS_LABELS[status] ?? status;
}

export function labelLifecycleStage(stage: LifecycleStage): string {
  return LIFECYCLE_STAGE_LABELS[stage] ?? stage;
}

export function labelEventCategory(category: EventCategory): string {
  return EVENT_CATEGORY_LABELS[category] ?? category;
}

export function labelEventSource(source: EventSource): string {
  return EVENT_SOURCE_LABELS[source] ?? source;
}

export function labelDateSource(source: DateSource | null | undefined): string {
  if (!source) return 'нет';
  return DATE_SOURCE_LABELS[source] ?? source;
}

export function labelTaskStatus(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] ?? status;
}

export function labelTaskPriority(priority: TaskPriority): string {
  return TASK_PRIORITY_LABELS[priority] ?? priority;
}

export function formatDateRu(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTimeRu(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
