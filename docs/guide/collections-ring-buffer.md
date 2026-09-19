# AegisRingBuffer: Lock-Free Circular FIFO Queue

`AegisRingBuffer<T>` is a high-speed, zero-allocation circular buffer designed for high-frequency streaming data, financial tick processing, sensor ingest pipelines, and inter-thread event queues.

---

## Key Characteristics

1. **Power-of-Two Indexing:** Capacities are automatically rounded up to the nearest power of two (e.g. 1024, 4096, 65536), allowing index calculations to use lightning-fast bitwise AND masks (`index & (capacity - 1)`) instead of slow integer division modulo (`%`).
2. **Deterministic Overwrite Modes:** Supports both standard FIFO queues that reject pushes when full, or continuous ring buffers that overwrite the oldest record on overflow.
3. **Flat Binary Memory:** Pre-allocated buffer with 64-byte aligned strides.

---

## Creation

```typescript
import { Aegis, uint32, float64, fixedString } from '@aventine/aegis-js';

const MarketTick = Aegis.struct({
  tickId: uint32,
  price: float64,
  volume: uint32,
  symbol: fixedString(4),
});

// Create ring buffer holding up to 1,024 ticks (rounded to power of two)
const tickQueue = Aegis.ringBuffer(MarketTick, { 
  capacity: 1000, 
  overwrite: true // Overwrite oldest tick when full
});
```

---

## Operations

### Pushing Records
```typescript
// Pushes a new record to the tail
tickQueue.push({
  tickId: 1,
  price: 185.50,
  volume: 100,
  symbol: 'NVDA',
});
```

### Popping Records (FIFO)
```typescript
// Pops the oldest record from head into a plain object
const oldestTick = tickQueue.pop();

if (oldestTick) {
  console.log(`Popped tick #${oldestTick.tickId} at $${oldestTick.price}`);
}
```

### Peeking Without Popping
```typescript
// Returns a flyweight cursor mounted to the head without modifying queue state
const headTick = tickQueue.peek();
if (headTick) {
  console.log(`Next tick to process: ${headTick.symbol}`);
}
```

### Checking Queue State
```typescript
console.log(`Items in queue: ${tickQueue.length}`);
console.log(`Max capacity: ${tickQueue.capacity}`);
console.log(`Is queue full: ${tickQueue.isFull}`);
console.log(`Is queue empty: ${tickQueue.isEmpty}`);
```

---

## Zero-Allocation Drain Iterator

Drain records efficiently in batch loops without creating intermediate objects:

```typescript
while (!tickQueue.isEmpty) {
  const tick = tickQueue.peek();
  processTick(tick);
  tickQueue.pop(); // Advances head
}
```
