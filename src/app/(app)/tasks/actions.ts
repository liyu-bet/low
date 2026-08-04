'use server';

import { revalidatePath } from 'next/cache';
import { requireUserSession } from '@/app/login/actions';
import { authorSnapshot, type UserSession } from '@/lib/auth/session';
import { assertCanEditTask } from '@/lib/auth/permissions';
import { toSafeActionError, toSafeTaskActionError } from '@/lib/errors/safe-action';
import { isWebsiteNotFoundError } from '@/lib/events/service';
import {
  cancelWebsiteTask,
  completeWebsiteTaskFromForm,
  createWebsiteTaskFromForm,
  getWebsiteTaskAuthFields,
  isTaskNotFoundError,
  isTaskStateError,
  startWebsiteTask,
  updateWebsiteTaskFromForm,
} from '@/lib/tasks/service';

export type TaskActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  taskId?: string;
  websiteId?: string;
};

function mapError(error: unknown): string {
  if (isWebsiteNotFoundError(error)) return 'Сайт не найден';
  if (isTaskNotFoundError(error)) return 'Задача не найдена';
  if (isTaskStateError(error)) {
    return toSafeActionError(error, 'Не удалось сохранить изменения');
  }
  return toSafeTaskActionError(error);
}

function revalidateTaskPaths(websiteId: string) {
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  revalidatePath(`/websites/${websiteId}`);
  revalidatePath('/websites');
}

function actorFromSession(session: { userId: string; name: string; email: string }) {
  return { userId: session.userId, label: authorSnapshot(session) };
}

async function requireEditableTask(
  taskId: string,
  session: UserSession,
) {
  const task = await getWebsiteTaskAuthFields(taskId);
  if (!task) throw new Error('Задача не найдена');
  assertCanEditTask(session, task);
  return task;
}

export async function createTaskAction(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireUserSession();
  try {
    // Strip forged author fields from the browser.
    formData.delete('createdBy');
    formData.delete('createdByUserId');
    const task = await createWebsiteTaskFromForm(formData, {
      actor: actorFromSession(session),
    });
    revalidateTaskPaths(task.websiteId);
    return {
      ok: true,
      message: 'Задача создана',
      taskId: task.id,
      websiteId: task.websiteId,
    };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function updateTaskAction(
  taskId: string,
  websiteId: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireUserSession();
  try {
    await requireEditableTask(taskId, session);
    formData.delete('createdBy');
    formData.delete('createdByUserId');
    const task = await updateWebsiteTaskFromForm(taskId, formData, {
      actorUserId: session.userId,
    });
    revalidateTaskPaths(task.websiteId || websiteId);
    return { ok: true, message: 'Задача обновлена', taskId: task.id, websiteId: task.websiteId };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function startTaskAction(
  taskId: string,
  websiteId: string,
  _prev: TaskActionState,
  _formData: FormData,
): Promise<TaskActionState> {
  const session = await requireUserSession();
  try {
    await requireEditableTask(taskId, session);
    const task = await startWebsiteTask(taskId);
    revalidateTaskPaths(task.websiteId || websiteId);
    return { ok: true, message: 'Задача в работе', taskId: task.id, websiteId: task.websiteId };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function completeTaskAction(
  taskId: string,
  websiteId: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireUserSession();
  try {
    await requireEditableTask(taskId, session);
    const result = await completeWebsiteTaskFromForm(taskId, formData, {
      actor: actorFromSession(session),
    });
    revalidateTaskPaths(result.task.websiteId || websiteId);
    return {
      ok: true,
      message: result.alreadyDone
        ? 'Задача уже была выполнена'
        : 'Задача выполнена, событие записано в журнал',
      taskId: result.task.id,
      websiteId: result.task.websiteId,
    };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function cancelTaskAction(
  taskId: string,
  websiteId: string,
  _prev: TaskActionState,
  _formData: FormData,
): Promise<TaskActionState> {
  const session = await requireUserSession();
  try {
    await requireEditableTask(taskId, session);
    const task = await cancelWebsiteTask(taskId);
    revalidateTaskPaths(task.websiteId || websiteId);
    return { ok: true, message: 'Задача отменена', taskId: task.id, websiteId: task.websiteId };
  } catch (error) {
    return { error: mapError(error) };
  }
}
