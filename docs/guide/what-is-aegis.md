# What is Aegis.js?

**Aegis.js** is the standard library for silicon-speed, zero-garbage-collection flat memory arenas in JavaScript, TypeScript, and Node.js.

It brings low-level systems programming concepts (contiguous memory arenas, 64-byte hardware cache line alignment, flyweight cursors, and zero-allocation iterators) to modern JavaScript without sacrificing developer ergonomics.

---

## The V8 Garbage Collection Problem

Modern JavaScript engines like Google V8 are extraordinarily fast for general application code. However, when handling high-throughput telemetry, financial tick feeds, AI vector embeddings, game state, or streaming logs, V8 hits a physical hardware bottleneck:

### 1. Pointer Graph Traversal
In JavaScript, an array of objects `[{ id: 1, price: 100 }, ...]` does not store data contiguously in memory. Instead, it creates an array of pointers pointing to heap-allocated object wrappers scattered across memory. Iterating through 1,000,000 objects causes constant L1/L2 cache misses as the CPU fetches fragmented pointers.

### 2. Hidden Class Jitter & Shape Transitions
If fields are added to an object in different orders or if properties are deleted, V8 de-optimizes from fast inline caches (ICs) to slow megamorphic dictionary lookups.

### 3. Stop-the-World GC Pauses
When thousands of small objects are created per millisecond, the V8 Young Generation (Scavenge) and Old Generation (Mark-Sweep-Compact) garbage collectors trigger stop-the-world pauses lasting anywhere from 10 ms to 500 ms. For real-time telemetry, robotics, trading engines, or low-latency AI pipelines, these unpredictable pauses cause dropped packets and latency spikes.

---

## How Aegis.js Solves It

Aegis.js completely bypasses the V8 object heap by allocating contiguous `ArrayBuffer` or `SharedArrayBuffer` memory blocks and managing structured records as pure binary offsets.

```
Standard V8 Heap (Fragmented Pointer Graph):
[ Array Pointer ] ---> [ Object Header | Shape Ptr | id: 1 | price: 100.5 ] (Random Heap Address)
                  ---> [ Object Header | Shape Ptr | id: 2 | price: 101.2 ] (Random Heap Address)
                  ---> [ Object Header | Shape Ptr | id: 3 | price: 102.0 ] (Random Heap Address)

Aegis.js Flat Memory Arena (Contiguous 64-Byte Cache Lines):
[ 0x00: id=1, price=100.5 | 0x40: id=2, price=101.2 | 0x80: id=3, price=102.0 ]
|<---- 64 Bytes Cache Line ---->|<---- 64 Bytes Cache Line ---->|
```

### Core Innovations:
1. **Zod-Style Struct Compiler:** Define schema layouts with exact bit-width primitives (`uint32`, `float64`, `fixedString(16)`). The compiler automatically aligns fields and pads each record to 64-byte silicon cache line boundaries.
2. **The Flyweight Cursor Pattern:** Instead of instantiating 1,000,000 JavaScript objects, Aegis.js instantiates a single flyweight cursor that slides across the binary buffer. You read and write fields using normal property syntax (`cursor.price = 105.5`), but zero objects are created on the heap.
3. **Contiguous Collections:** Fast array lists (`AegisList`), circular FIFO queues (`AegisRingBuffer`), flat open-addressing hash maps (`AegisMap`), and slot allocators (`AegisPool`).
4. **Zero-Copy Cross-Worker Concurrency:** Built on `SharedArrayBuffer` and `Atomics`. Multiple Node.js worker threads or Web Workers can read and modify the same arena simultaneously without serializing JSON or transferring ownership.
