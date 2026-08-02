import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveProtectedPathAccess } from './session';

describe('resolveProtectedPathAccess', () => {
  it('blocks websites routes without a session', () => {
    const access = resolveProtectedPathAccess({
      pathname: '/websites',
      hasValidSession: false,
    });
    assert.equal(access.allowed, false);
    assert.equal(access.redirectTo, '/login?next=%2Fwebsites');
  });

  it('blocks nested website routes without a session', () => {
    const access = resolveProtectedPathAccess({
      pathname: '/websites/abc/edit',
      hasValidSession: false,
    });
    assert.equal(access.allowed, false);
    assert.match(access.redirectTo ?? '', /^\/login\?next=/);
  });

  it('allows websites routes with a valid session', () => {
    const access = resolveProtectedPathAccess({
      pathname: '/websites/new',
      hasValidSession: true,
    });
    assert.equal(access.allowed, true);
    assert.equal(access.redirectTo, null);
  });

  it('allows login without a session', () => {
    const access = resolveProtectedPathAccess({
      pathname: '/login',
      hasValidSession: false,
    });
    assert.equal(access.allowed, true);
  });

  it('blocks integrations routes without a session', () => {
    const access = resolveProtectedPathAccess({
      pathname: '/integrations',
      hasValidSession: false,
    });
    assert.equal(access.allowed, false);
    assert.equal(access.redirectTo, '/login?next=%2Fintegrations');
  });

  it('blocks dashboard routes without a session', () => {
    const access = resolveProtectedPathAccess({
      pathname: '/dashboard',
      hasValidSession: false,
    });
    assert.equal(access.allowed, false);
    assert.equal(access.redirectTo, '/login?next=%2Fdashboard');
  });

  it('blocks tasks routes without a session', () => {
    const access = resolveProtectedPathAccess({
      pathname: '/tasks',
      hasValidSession: false,
    });
    assert.equal(access.allowed, false);
    assert.equal(access.redirectTo, '/login?next=%2Ftasks');
  });

  it('blocks reports routes without a session', () => {
    const access = resolveProtectedPathAccess({
      pathname: '/reports',
      hasValidSession: false,
    });
    assert.equal(access.allowed, false);
    assert.equal(access.redirectTo, '/login?next=%2Freports');
  });
});
