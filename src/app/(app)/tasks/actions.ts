'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireAdminSession } from '@/app/login/actions';
import { assertAuthenticated } from '@/lib/auth/session';
import { isWebsiteNotFoundError } from '@/lib/events/service';
import {
  cancelWebsiteTask,
  completeWebsiteTaskFromForm,
  createWebsiteTaskFromForm,
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
  if (isTaskStateError(error)) return error.message;
  if (error instanceof ZodError) {
    return error.errors.map((issue) => issue.message).join('; ');
  }
  if (error instanceof Error) return error.message;
  return 'Не удалось выполнить действие с задачей';
}

function revalidateTaskPaths(websiteId: string) {
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  revalidatePath(`/websites/${websiteId}`);
  revalidatePath('/websites');
}

export async function createTaskAction(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const task = await createWebsiteTaskFromForm(formData, { createdBy: session.email });
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
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const task = await updateWebsiteTaskFromForm(taskId, formData);
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
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
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
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const result = await completeWebsiteTaskFromForm(taskId, formData, {
      createdBy: session.email,
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
  const session = await requireAdminSession();
  assertAuthenticated(session);
  try {
    const task = await cancelWebsiteTask(taskId);
    revalidateTaskPaths(task.websiteId || websiteId);
    return { ok: true, message: 'Задача отменена', taskId: task.id, websiteId: task.websiteId };
  } catch (error) {
    return { error: mapError(error) };
  }
}
