# Zero-GC Architecture

To achieve deterministic sub-microsecond latency in JavaScript runtimes (Node.js, Bun, and browsers), we must understand how V8 allocates memory and why traditional garbage collection causes tail-latency jitter.

---

## The Cost of Traditional V8 Memory

In standard JavaScript, creating a simple object requires substantial metadata:

```typescript
const point = { x: 10.5, y: 20.5 };
```

In memory, V8 allocates:
1. **Object Header (8 to 16 bytes):** Holds map pointer and flags.
2. **Hidden Class / Map Pointer (8 bytes):** Points to the shape descriptor in the heap.
3. **Properties Store (8 to 32 bytes):** Array of pointer values or in-object property slots.
4. **Values:** Double precision numbers are often allocated as heap-boxed numbers if outside the SMI (Small Integer) range.

When you create an array of 1,000,000 such objects, V8 allocates approximately 60 MB to 100 MB of fragmented pointers and object metadata across the V8 New Space and Old Space.

```
+-------------------------------------------------------------+
| V8 Heap                                                     |
|                                                             |
|  [Array Buffer Pointers]                                    |
|    |---> [Object #0: 0x7fff100] ---> [Boxed Float: 10.5]    |
|    |---> [Object #1: 0x7fff480] ---> [Boxed Float: 11.2]    |
|    |---> [Object #2: 0x7fff890] ---> [Boxed Float: 12.0]    |
+-------------------------------------------------------------+
```

### The Garbage Collector Lifecycle
1. **New Space (Nursery):** Where young objects are allocated. Quick semi-space copy (Scavenger) happens frequently, pausing execution for 1 ms to 5 ms.
2. **Old Space:** Objects that survive several GC cycles are promoted to Old Space. When Old Space reaches capacity, V8 initiates a full Mark-Sweep-Compact cycle.
3. **Stop-The-World Pauses:** During Old Space compaction, thread execution halts. Latency spikes from 50 microseconds to 200 milliseconds.

---

## The Aegis Flat Memory Model

Aegis.js completely bypasses this lifecycle by using flat binary arenas backed by `ArrayBuffer` or `SharedArrayBuffer`.

```
+---------------------------------------------------------------------------------------+
| Single Contiguous ArrayBuffer (Allocated Once)                                        |
|                                                                                       |
| +-------------------------+ +-------------------------+ +-------------------------+   |
| | Record 0                | | Record 1                | | Record 2                |   |
| | Offset: 0x00            | | Offset: 0x40 (64 bytes) | | Offset: 0x80 (128 bytes)|   |
| | x: 10.5 | y: 20.5 | pad | | x: 11.2 | y: 21.0 | pad | | x: 12.0 | y: 22.1 | pad |   |
| +-------------------------+ +-------------------------+ +-------------------------+   |
+---------------------------------------------------------------------------------------+
```

### Why Flat Arenas Eliminate GC:
1. **Zero Allocations During Workload:** The buffer is allocated once at startup. Adding, modifying, reading, or sorting records never invokes `malloc` or V8 object construction.
2. **Continuous Memory Paging:** Because records are contiguous, the CPU hardware prefetcher automatically pulls subsequent records into L1 cache before the code requests them.
3. **Deterministic Memory Footprint:** If you allocate an arena for 1,000,000 records with a 64-byte stride, the memory footprint is exactly 64 MB. It never grows unexpectedly, and V8 heap monitoring remains flat.
4. **Immediate Deallocation:** When the arena is no longer needed, clearing the reference to the single `ArrayBuffer` allows the entire block to be freed in one step without traversing millions of individual nodes.
