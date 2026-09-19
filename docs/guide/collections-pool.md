# AegisPool: Zero-Allocation Object Pool

`AegisPool<T>` provides O(1) slot allocation and deallocation within a contiguous flat arena, eliminating object churn in event loops, particle systems, gaming engines, and network connection handlers.

---

## Why Object Pooling?

In systems with rapid object churn (e.g. allocating and discarding 50,000 packet objects per second), garbage collection runs constantly. 

`AegisPool` manages a pre-allocated memory slab using an internal free-stack. Allocating a slot takes O(1) time and returns an integer handle (index). Freeing a slot takes O(1) time and returns the slot to the free list.

---

## Creation

```typescript
import { Aegis, uint32, float32, boolean } from '@aventine/aegis-js';

const Bullet = Aegis.struct({
  id: uint32,
  posX: float32,
  posY: float32,
  velX: float32,
  velY: float32,
  active: boolean,
});

// Pool capacity for 10,000 active bullets
const bulletPool = Aegis.pool(Bullet, { capacity: 10_000 });
```

---

## Allocating and Freeing Slots

### Allocating a Slot
`acquire()` pops a free slot from the pool, mounts the internal cursor, and optionally initializes fields:

```typescript
// Acquire slot with initial values
const bullet = bulletPool.acquire({
  id: 101,
  posX: 0,
  posY: 0,
  velX: 12.5,
  velY: 0,
  active: true,
});

const slotIndex = bulletPool.cursorIndex; // Store handle for later release
```

### Accessing an Active Slot
```typescript
const bullet = bulletPool.get(slotIndex);
if (bullet) {
  bullet.posX += bullet.velX;
}
```

### Releasing a Slot Back to the Pool
```typescript
// Release slot back to the free list for immediate reuse
bulletPool.release(slotIndex);
```

### Checking Pool Status
```typescript
console.log(`Active entities: ${bulletPool.activeCount}`);
console.log(`Available slots: ${bulletPool.availableCount}`);
console.log(`Total capacity: ${bulletPool.capacity}`);
```
