import test from 'node:test';
import assert from 'node:assert/strict';
import { struct } from '../types/struct.js';
import { uint32, float64, fixedString } from '../types/primitives.js';
import { createMap } from '../collections/map.js';

test('AegisMap: Open-addressing flat hash table', () => {
  const UserSession = struct({
    userId: uint32,
    balance: float64,
    role: fixedString(16)
  });

  const map = createMap<any>(UserSession, {
    capacity: 64,
    keyField: 'userId'
  });

  assert.equal(map.size, 0);

  // Set entries
  map.set(1001, { balance: 500.25, role: 'admin' });
  map.set(2002, { balance: 120.00, role: 'user' });
  map.set(3003, { balance: 9999.99, role: 'vip' });

  assert.equal(map.size, 3);
  assert.equal(map.has(1001), true);
  assert.equal(map.has(9999), false);

  // Get entry
  const session = map.get(1001);
  assert.ok(session);
  assert.equal(session.userId, 1001);
  assert.equal(session.balance, 500.25);
  assert.equal(session.role, 'admin');

  // Update in place
  map.set(1001, { balance: 550.00, role: 'superadmin' });
  assert.equal(map.size, 3);
  assert.equal(map.get(1001)?.balance, 550.00);
  assert.equal(map.get(1001)?.role, 'superadmin');

  // Delete
  assert.equal(map.delete(2002), true);
  assert.equal(map.size, 2);
  assert.equal(map.has(2002), false);
});
