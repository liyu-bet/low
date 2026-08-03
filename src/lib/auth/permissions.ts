import type { UserSession } from '@/lib/auth/session';
import { ForbiddenError } from '@/lib/auth/session';

export function canManageUsers(session: UserSession): boolean {
  return session.role === 'ADMIN';
}

export function canEditWebsiteSettings(session: UserSession): boolean {
  return session.role === 'ADMIN';
}

export function canArchiveWebsites(session: UserSession): boolean {
  return session.role === 'ADMIN';
}

export function canRunBulkDangerousOps(session: UserSession): boolean {
  return session.role === 'ADMIN';
}

export function canManageIntegrations(session: UserSession): boolean {
  return session.role === 'ADMIN';
}

export function canRunManualSync(session: UserSession): boolean {
  return session.role === 'ADMIN';
}

export function canEditAnyTask(session: UserSession): boolean {
  return session.role === 'ADMIN';
}

export function canEditTask(
  session: UserSession,
  task: { createdByUserId: string | null; assignedToUserId: string | null },
): boolean {
  if (session.role === 'ADMIN') return true;
  if (task.createdByUserId === session.userId) return true;
  if (task.assignedToUserId === session.userId) return true;
  return false;
}

export function assertCanEditTask(
  session: UserSession,
  task: { createdByUserId: string | null; assignedToUserId: string | null },
): void {
  if (!canEditTask(session, task)) {
    throw new ForbiddenError('Нельзя изменить эту задачу');
  }
}

export function assertAdminCapability(
  session: UserSession,
  allowed: (s: UserSession) => boolean,
  message = 'Недостаточно прав',
): void {
  if (!allowed(session)) {
    throw new ForbiddenError(message);
  }
}
