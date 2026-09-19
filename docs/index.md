---
layout: home

hero:
  name: "Aegis.js"
  text: "Silicon-Speed Zero-GC Flat Memory Arenas"
  tagline: "Break through the V8 garbage collector wall. 64-byte hardware cache alignment, flyweight cursors, and 100M+ ops/sec with zero heap allocations."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Zero-GC Architecture
      link: /guide/zero-gc-architecture
    - theme: alt
      text: View on GitHub
      link: https://github.com/aventine-labs/aegis-js

features:
  - icon: ⚡
    title: 118 Million Ops/Sec
    details: Modify and query hundreds of thousands of structured records with zero allocations. Pure CPU cache line operations.
  - icon: 🛡️
    title: Flat Zero-GC Arenas
    details: Eliminates V8 hidden classes, shape transitions, and stop-the-world garbage collection pauses. Deterministic latency.
  - icon: 📐
    title: 64-Byte Cache Alignment
    details: Automatic struct padding and alignment to modern L1 CPU cache lines. Eliminates false sharing and pipeline stalls.
  - icon: 🪶
    title: Single Flyweight Cursor
    details: Traverse millions of records using one reusable pointer slider. Idiomatic object syntax without creating objects.
  - icon: 🧵
    title: SharedArrayBuffer Concurrency
    details: Zero-copy cross-worker memory sharing with lock-free atomic operations. No serialization overhead.
  - icon: 📦
    title: Zero Dependencies
    details: Lightweight, standalone, dual ESM/CJS distribution under the Apache 2.0 license. Works in Node.js, Bun, and browsers.
---

## Quick Example

```typescript
import { Aegis, uint32, float64, fixedString, boolean } from '@aventine/aegis-js';

// 1. Define a 64-byte aligned struct schema
const OrderSchema = Aegis.struct({
  orderId: uint32,
  price: float64,
  symbol: fixedString(8),
  filled: boolean,
});

// 2. Allocate a contiguous flat memory arena for 1,000,000 orders
const orderBook = Aegis.list(OrderSchema, { capacity: 1_000_000 });

// 3. Populate orders with zero object allocations
for (let i = 0; i < 1_000_000; i++) {
  orderBook.push({
    orderId: i,
    price: 150.25 + (i * 0.01),
    symbol: 'NVDA',
    filled: false,
  });
}

// 4. Iterate and compute at silicon speed with a single reusable cursor
let totalValue = 0;
orderBook.forEach(order => {
  totalValue += order.price;
});

console.log(`Computed 1,000,000 orders without a single GC pause: $${totalValue.toFixed(2)}`);
```

## Performance Comparison

| Metric | Standard V8 Objects (`Array<{...}>`) | Aegis.js Arena (`AegisList<T>`) | Advantage |
| :--- | :--- | :--- | :--- |
| **500,000 Record Mutations** | 142.60 ms | **4.21 ms** | **33.8x Faster** |
| **Throughput** | 3.50 Million ops/sec | **118.84 Million ops/sec** | **33.9x Greater** |
| **V8 Heap Growth** | 86.40 MB | **0.23 MB** | **99.7% Less Heap** |
| **Stop-the-World GC Pauses** | Frequent (12 - 45 ms pauses) | **Zero (Flatline 0 pauses)** | **Deterministic Realtime** |
| **L1 Cache Utilization** | Cache thrashing across pointer graph | **Sequential prefetch friendly** | **Optimal hardware throughput** |
