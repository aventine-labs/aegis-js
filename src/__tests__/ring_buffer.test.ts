import test from 'node:test';
import assert from 'node:assert/strict';
import { struct } from '../types/struct.js';
import { uint32, float64 } from '../types/primitives.js';
import { createRingBuffer } from '../collections/ring_buffer.js';

test('AegisRingBuffer: FIFO ordering, capacity mask, overflow rejection', () => {
  const EventSchema = struct({
    eventId: uint32,
    timestamp: float64
  });

  // Request capacity 4 (exact power of 2)
  const ring = createRingBuffer<any>(EventSchema, { capacity: 4 });
  assert.equal(ring.capacity, 4);
  assert.equal(ring.length, 0);
  assert.equal(ring.isEmpty, true);

  // Enqueue 4 items
  assert.equal(ring.enqueue({ eventId: 101, timestamp: 1.0 }), true);
  assert.equal(ring.enqueue({ eventId: 102, timestamp: 2.0 }), true);
  assert.equal(ring.enqueue({ eventId: 103, timestamp: 3.0 }), true);
  assert.equal(ring.enqueue({ eventId: 104, timestamp: 4.0 }), true);

  assert.equal(ring.isFull, true);
  assert.equal(ring.length, 4);

  // 5th item rejected without allocation
  assert.equal(ring.enqueue({ eventId: 105, timestamp: 5.0 }), false);

  // Dequeue in exact FIFO order
  const item1 = ring.dequeue();
  assert.ok(item1);
  assert.equal(item1.eventId, 101);

  const item2 = ring.dequeue();
  assert.ok(item2);
  assert.equal(item2.eventId, 102);

  assert.equal(ring.length, 2);

  // EnqueueOverwrite when full
  ring.enqueue({ eventId: 105, timestamp: 5.0 });
  ring.enqueue({ eventId: 106, timestamp: 6.0 });
  assert.equal(ring.isFull, true);

  // EnqueueOverwrite pushes out oldest (103)
  ring.enqueueOverwrite({ eventId: 107, timestamp: 7.0 });
  const oldest = ring.dequeue();
  assert.ok(oldest);
  assert.equal(oldest.eventId, 104); // 103 was overwritten!
});
