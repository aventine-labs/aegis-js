import test from 'node:test';
import assert from 'node:assert/strict';
import { struct } from '../types/struct.js';
import { uint32, float32 } from '../types/primitives.js';
import { createPool } from '../collections/pool.js';

test('AegisPool: O(1) slot allocation, release and reuse', () => {
  const Particle = struct({
    id: uint32,
    x: float32,
    y: float32,
    vx: float32,
    vy: float32
  });

  const pool = createPool<any>(Particle, { capacity: 10 });
  assert.equal(pool.capacity, 10);
  assert.equal(pool.activeCount, 0);
  assert.equal(pool.availableCount, 10);

  // Allocate 3 slots
  const s0 = pool.alloc();
  const s1 = pool.alloc();
  const s2 = pool.alloc();
  assert.ok(s0 >= 0 && s1 >= 0 && s2 >= 0);

  assert.equal(pool.activeCount, 3);
  assert.equal(pool.availableCount, 7);

  // Populate through Flyweight Cursor
  const p0 = pool.get(s0);
  p0.id = 1;
  p0.x = 10.5;
  p0.y = 20.5;

  assert.equal(pool.get(s0).id, 1);
  assert.equal(pool.get(s0).x, 10.5);

  // Free slot 1
  assert.equal(pool.free(s1), true);
  assert.equal(pool.activeCount, 2);
  assert.equal(pool.availableCount, 8);

  // Re-allocating reuses slot 1
  const s3 = pool.alloc();
  assert.equal(s3, s1);
  assert.equal(pool.activeCount, 3);
});
