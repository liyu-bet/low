import { Prisma, type User, type UserRole } from '@prisma/client';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  ForbiddenError,
  defaultNameFromEmail,
  normalizeEmail,
  verifyEnvAdminCredentials,
} from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
};

const publicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  sessionVersion: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export function toPublicUser(user: PublicUser): PublicUser {
  return user;
}

export async function countUsers(): Promise<number> {
  return prisma.user.count();
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicSelect });
}

export async function findUserByEmail(email: string): Promise<(PublicUser & { passwordHash: string }) | null> {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { ...publicSelect, passwordHash: true },
  });
}

export async function listActiveUsersForAssign(): Promise<Array<{ id: string; name: string; email: string }>> {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });
}

export async function listUsersForAdmin(): Promise<PublicUser[]> {
  return prisma.user.findMany({
    select: publicSelect,
    orderBy: [{ role: 'asc' }, { name: 'asc' }, { email: 'asc' }],
  });
}

export type AuthenticateResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: 'invalid_credentials' | 'inactive' };

/**
 * Login against User table, or bootstrap first ADMIN from env credentials when empty.
 */
export async function authenticateUser(
  emailRaw: string,
  password: string,
): Promise<AuthenticateResult> {
  const email = normalizeEmail(emailRaw);
  const total = await countUsers();

  if (total === 0) {
    if (!verifyEnvAdminCredentials(email, password)) {
      return { ok: false, reason: 'invalid_credentials' };
    }
    try {
      const user = await bootstrapFirstAdmin(email, password);
      return { ok: true, user };
    } catch (error) {
      // Parallel first login: unique email or race after another bootstrap.
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') ||
        (error instanceof Error && error.message === 'BOOTSTRAP_RACE')
      ) {
        const existing = await findUserByEmail(email);
        if (
          existing &&
          existing.isActive &&
          verifyPassword(password, existing.passwordHash)
        ) {
          const { passwordHash: _pw, ...publicUser } = existing;
          void _pw;
          await prisma.user.update({
            where: { id: existing.id },
            data: { lastLoginAt: new Date() },
          });
          return { ok: true, user: publicUser };
        }
        return { ok: false, reason: 'invalid_credentials' };
      }
      throw error;
    }
  }

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (!user.isActive) {
    return { ok: false, reason: 'inactive' };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: publicSelect,
  });

  return { ok: true, user: updated };
}

async function bootstrapFirstAdmin(email: string, password: string): Promise<PublicUser> {
  const passwordHash = hashPassword(password);
  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.count();
    if (existing > 0) {
      throw new Error('BOOTSTRAP_RACE');
    }
    return tx.user.create({
      data: {
        email: normalizeEmail(email),
        name: defaultNameFromEmail(email),
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: new Date(),
      },
      select: publicSelect,
    });
  });

  await backfillAuthorshipForUser(created);
  return created;
}

/** Idempotent: link legacy createdBy strings that match this user's email. */
export async function backfillAuthorshipForUser(user: Pick<PublicUser, 'id' | 'email'>): Promise<void> {
  const email = normalizeEmail(user.email);
  await prisma.$transaction([
    prisma.websiteTask.updateMany({
      where: {
        createdByUserId: null,
        createdBy: { equals: email, mode: 'insensitive' },
      },
      data: { createdByUserId: user.id },
    }),
    prisma.websiteEvent.updateMany({
      where: {
        createdByUserId: null,
        createdBy: { equals: email, mode: 'insensitive' },
      },
      data: { createdByUserId: user.id },
    }),
  ]);
}

export async function resolveSessionUser(options: {
  userId: string;
  sessionVersion: number;
}): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: publicSelect,
  });
  if (!user || !user.isActive) return null;
  if (user.sessionVersion !== options.sessionVersion) return null;
  return user;
}

export async function createUser(input: {
  email: string;
  name: string;
  role: UserRole;
  temporaryPassword: string;
}): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes('@')) {
    throw new Error('Укажите корректный email');
  }
  const name = input.name.trim();
  if (name.length < 1) throw new Error('Имя обязательно');
  if (input.role !== 'ADMIN' && input.role !== 'MEMBER') {
    throw new Error('Некорректная роль');
  }

  const passwordHash = hashPassword(input.temporaryPassword);
  try {
    return await prisma.user.create({
      data: {
        email,
        name,
        role: input.role,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
      select: publicSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Пользователь с таким email уже существует');
    }
    throw error;
  }
}

export async function updateUserProfile(
  userId: string,
  input: { name: string },
): Promise<PublicUser> {
  const name = input.name.trim();
  if (name.length < 1) throw new Error('Имя обязательно');
  return prisma.user.update({
    where: { id: userId },
    data: { name },
    select: publicSelect,
  });
}

export async function changeUserPassword(
  userId: string,
  input: { currentPassword?: string; newPassword: string; requireCurrent?: boolean },
): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...publicSelect, passwordHash: true },
  });
  if (!user || !user.isActive) throw new Error('Пользователь не найден');

  if (input.requireCurrent !== false) {
    if (!input.currentPassword || !verifyPassword(input.currentPassword, user.passwordHash)) {
      throw new Error('Неверный текущий пароль');
    }
  }

  const passwordHash = hashPassword(input.newPassword);
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
    select: publicSelect,
  });
}

export async function adminResetPassword(
  targetUserId: string,
  temporaryPassword: string,
): Promise<PublicUser> {
  const passwordHash = hashPassword(temporaryPassword);
  return prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      mustChangePassword: true,
      sessionVersion: { increment: 1 },
    },
    select: publicSelect,
  });
}

export async function updateUserAdminFields(
  targetUserId: string,
  input: {
    name?: string;
    role?: UserRole;
    isActive?: boolean;
  },
  actorUserId: string,
): Promise<PublicUser> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: publicSelect,
  });
  if (!target) throw new Error('Пользователь не найден');

  if (input.isActive === false && targetUserId === actorUserId) {
    throw new ForbiddenError('Нельзя отключить свою учётную запись');
  }

  if (
    target.role === 'ADMIN' &&
    target.isActive &&
    (input.role === 'MEMBER' || input.isActive === false)
  ) {
    const activeAdmins = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true },
    });
    if (activeAdmins <= 1) {
      throw new ForbiddenError('Нельзя отключить или понизить последнего активного администратора');
    }
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.name != null) {
    const name = input.name.trim();
    if (name.length < 1) throw new Error('Имя обязательно');
    data.name = name;
  }
  if (input.role != null) data.role = input.role;
  if (input.isActive != null) {
    data.isActive = input.isActive;
    if (input.isActive === false) {
      data.sessionVersion = { increment: 1 };
    }
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data,
    select: publicSelect,
  });
}

export type { User };
