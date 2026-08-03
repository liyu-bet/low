import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword, verifyPassword } from './password';

describe('password scrypt', () => {
  it('hash differs from plaintext password', () => {
    const hash = hashPassword('correct-horse-battery');
    assert.notEqual(hash, 'correct-horse-battery');
    assert.match(hash, /^v1\$/);
  });

  it('accepts the correct password', () => {
    const hash = hashPassword('correct-horse-battery');
    assert.equal(verifyPassword('correct-horse-battery', hash), true);
  });

  it('rejects the wrong password', () => {
    const hash = hashPassword('correct-horse-battery');
    assert.equal(verifyPassword('wrong-password!!', hash), false);
  });

  it('safely rejects a corrupted hash', () => {
    assert.equal(verifyPassword('anything', 'not-a-hash'), false);
    assert.equal(verifyPassword('anything', 'v1$a$b$c$d'), false);
    assert.equal(verifyPassword('anything', ''), false);
  });
});
