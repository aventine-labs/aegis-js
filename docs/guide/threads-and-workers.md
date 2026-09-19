# SharedArrayBuffer & Multi-Thread Concurrency

Standard multi-threading in Node.js (via `worker_threads`) or browsers (via Web Workers) requires copying data across thread boundaries. 

Passing a 100 MB object graph via `postMessage()` requires:
1. Deep clone serialization (JSON or structured clone).
2. Heap allocation in the recipient thread.
3. Garbage collection in both sender and receiver.

---

## True Shared Memory with Aegis.js

Aegis.js allows multiple workers to attach directly to the **exact same memory buffer** using `SharedArrayBuffer`:

```
+-------------------------------------------------------------+
| SharedArrayBuffer (Physical Memory)                         |
|                                                             |
|   Worker Thread 1 ---------> [ 64-Byte Cache Line 0 ]       |
|   Worker Thread 2 ---------> [ 64-Byte Cache Line 1 ]       |
|   Worker Thread 3 ---------> [ 64-Byte Cache Line 2 ]       |
+-------------------------------------------------------------+
```

Because each record is padded to 64 bytes, workers operating on different record indices **never experience false sharing**.

---

## Setting Up Shared Memory

### Main Thread:
```typescript
import { Worker } from 'node:worker_threads';
import { Aegis, uint32, float64 } from '@aventine/aegis-js';

const CounterStruct = Aegis.struct({
  id: uint32,
  count: uint32,
  value: float64,
});

// Allocate arena backed by SharedArrayBuffer
const list = Aegis.list(CounterStruct, { 
  capacity: 10_000, 
  shared: true 
});

// Pass the raw buffer to worker threads without copying
const worker = new Worker('./worker.js', {
  workerData: {
    buffer: list.buffer,
    capacity: list.capacity,
  },
});
```

### Worker Thread (`worker.js`):
```typescript
import { workerData } from 'node:worker_threads';
import { Aegis } from '@aventine/aegis-js';
import { CounterStruct } from './schema.js';

// Re-wrap the shared buffer into an AegisList in microseconds
const list = Aegis.list(CounterStruct, {
  buffer: workerData.buffer,
  capacity: workerData.capacity,
  shared: true,
});

// Mutate shared memory directly
const record = list.get(0);
record.count += 1;
```

---

## Lock-Free Atomics

Aegis provides high-level helpers wrapping the ECMAScript `Atomics` API for thread-safe coordination:

```typescript
import { Threads } from '@aventine/aegis-js';

// Atomically increment a uint32 counter
const previousValue = Threads.atomics.add(list.buffer, byteOffset, 1);

// Compare-and-swap (CAS) lock-free update
const exchanged = Threads.atomics.compareExchange(
  list.buffer, 
  byteOffset, 
  expectedValue, 
  newValue
);
```
