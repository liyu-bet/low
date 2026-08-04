import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAdmin,
  assertAuthenticated,
  ForbiddenError,
  resolveProtectedPathAccess,
  UnauthorizedError,
  userInitials,
} from './session';
import { assertCanEditTask, canEditTask } from './permissions';

describe('auth guards', () => {
  it('MEMBER fails admin assert', () => {
    assert.throws(
      () =>
        assertAdmin({
          userId: '1',
          email: 'm@example.com',
          name: 'Member',
          role: 'MEMBER',
          mustChangePassword: false,
        }),
      ForbiddenError,
    );
  });

  it('missing session fails authenticated assert', () => {
    assert.throws(() => assertAuthenticated(null), UnauthorizedError);
  });

  it('protects account and settings paths', () => {
    const account = resolveProtectedPathAccess({
      pathname: '/account',
      hasValidSession: false,
    });
    assert.equal(account.allowed, false);
    const users = resolveProtectedPathAccess({
      pathname: '/settings/users',
      hasValidSession: false,
    });
    assert.equal(users.allowed, false);
  });

  it('builds initials from name', () => {
    assert.equal(userInitials('Анна Петрова', 'a@x.com'), 'АП');
    assert.equal(userInitials('Ann', 'a@x.com'), 'AN');
  });
});

describe('task edit permissions', () => {
  const member = {
    userId: 'u1',
    email: 'm@example.com',
    name: 'M',
    role: 'MEMBER' as const,
    mustChangePassword: false,
  };
  const admin = { ...member, userId: 'admin', role: 'ADMIN' as const };

  it('MEMBER cannot edit unrelated task', () => {
    assert.equal(
      canEditTask(member, { createdByUserId: 'other', assignedToUserId: null }),
      false,
    );
  });

  it('MEMBER can edit own or assigned task', () => {
    assert.equal(
      canEditTask(member, { createdByUserId: 'u1', assignedToUserId: null }),
      true,
    );
    assert.equal(
      canEditTask(member, { createdByUserId: 'other', assignedToUserId: 'u1' }),
      true,
    );
  });

  it('ADMIN can edit any task', () => {
    assert.equal(
      canEditTask(admin, { createdByUserId: 'other', assignedToUserId: null }),
      true,
    );
  });

  it('assertCanEditTask denies MEMBER with Недостаточно прав', () => {
    assert.throws(
      () =>
        assertCanEditTask(member, {
          createdByUserId: 'other',
          assignedToUserId: null,
        }),
      (error: unknown) =>
        error instanceof ForbiddenError && error.message === 'Недостаточно прав',
    );
  });
});
