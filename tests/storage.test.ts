import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword } from '../src/lib/storage';

test('hashPassword returns an empty string for an empty password', () => {
  assert.equal(hashPassword(''), '');
});

test('hashPassword is deterministic and does not expose raw passwords', () => {
  const first = hashPassword('rahasia123');
  const second = hashPassword('rahasia123');

  assert.equal(first, second);
  assert.notEqual(first, 'rahasia123');
  assert.match(first, /^[a-f0-9]{64}$/);
});

test('hashPassword does not hash an existing SHA-256 hex digest again', () => {
  const digest = hashPassword('sudah-aman');

  assert.equal(hashPassword(digest), digest);
});
