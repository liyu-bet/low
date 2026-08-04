import { ZodError } from 'zod';
import { ForbiddenError } from '@/lib/auth/session';

const SAFE_ERROR_PREFIXES = [
  'Сайт не найден',
  'Задача не найдена',
  'Недостаточно прав',
  'Требуются права',
  'Пользователь отключён',
  'Учётная запись отключена',
  'Неверный email или пароль',
  'Нельзя отключить',
  'Нельзя понизить',
  'Пароль должен',
  'Укажите',
  'Название обязательно',
  'Сайт обязателен',
  'Задача уже',
  'Некорректн',
];

/**
 * Map unknown errors to short user-facing Russian messages.
 * Never forwards Prisma/SQL/stack internals.
 */
export function toSafeActionError(
  error: unknown,
  fallback = 'Не удалось сохранить изменения',
): string {
  if (error instanceof ForbiddenError) {
    return error.message || 'Недостаточно прав';
  }
  if (error instanceof ZodError) {
    return error.errors.map((issue) => issue.message).join('; ') || fallback;
  }
  if (error instanceof Error) {
    const message = error.message.trim();
    if (!message) return fallback;
    if (/prisma|postgres|sql|database_url|econnrefused|digest|stack/i.test(message)) {
      return fallback;
    }
    if (SAFE_ERROR_PREFIXES.some((prefix) => message.startsWith(prefix) || message.includes(prefix))) {
      return message;
    }
    // Known task-state style messages from service layer
    if (
      message.includes('уже выполнена') ||
      message.includes('нельзя') ||
      message.includes('Нельзя')
    ) {
      return message;
    }
  }
  return fallback;
}

export function toSafeTaskActionError(error: unknown): string {
  return toSafeActionError(error, 'Не удалось создать задачу');
}
