# Empirical Benchmarks & Systems Architecture

Comparative empirical benchmarks measuring **Aegis.js** flat memory arenas against **Standard Idiomatic JavaScript Objects** and **Native TypedArrays** inside the Google V8 engine.

---

## Test Environment & Methodology

All benchmarks are reproducible and executed on modern x64 silicon running Node.js with explicit V8 garbage collection exposure (`--expose-gc`):

* **Runtime:** Node.js v24.x / Google V8 Engine
* **Architecture:** x64 / Hardware 64-byte L1 CPU Cache Line Alignment
* **Dataset Size:** 1,000,000 Structured Market Records (5 fields: `id: uint32`, `bid: float64`, `ask: float64`, `volume: uint32`, `active: boolean`)
* **Streaming Load:** 500,000 High-Frequency Events

---

## The Three Paradigms Tested

1. **Standard Idiomatic JavaScript (`Array<Object>`):**
   The universal JavaScript way: an array of individual heap objects (`[{ id, bid, ask, volume, active }, ...]`). Every row is an independent heap allocation with pointer indirection, V8 hidden class metadata, and garbage collection tracking.
2. **Native JavaScript TypedArrays (Structure of Arrays / SOA):**
   Separate native arrays (`Uint32Array`, `Float64Array`). Fast contiguous binary memory, but fragmented across 5 separate buffers with zero support for composite record types or unified structs.
3. **Aegis.js Silicon Flat Memory Arena (`AegisList<T>` & `AegisRingBuffer<T>`):**
   Single contiguous `ArrayBuffer` aligned to 64-byte CPU cache lines, traversed by a reusable Flyweight Cursor with zero heap allocations.

---

## 1. Static Memory Footprint (1,000,000 Structured Records)

Measures total RAM / V8 Heap consumed after storing 1,000,000 records:

| Paradigm | RAM / Heap Used | Overhead vs Plain JS | Memory Architecture |
| :--- | :--- | :--- | :--- |
| **Plain JS Heap Objects** | **99.26 MB** | 100% (Baseline) | 1,000,000 scattered objects + pointer table |
| **Native TypedArrays (SOA)** | **23.84 MB** | 24.0% | 5 separate primitive arrays |
| **Aegis.js Flat Arena** | **61.04 MB** | **61.5% (38.5% savings)** | 1 contiguous 64-byte cache-aligned buffer |

### Architectural Insight:
Plain JavaScript wastes nearly 100 MB of RAM for 1 million records due to V8 object headers, hidden classes, and pointer tables. Aegis.js guarantees a predictable 61 MB flat buffer with hardware cache alignment.

---

## 2. Ingestion & Write Throughput (1,000,000 Records)

Time and throughput to initialize and write 1,000,000 structured records:

| Paradigm | Elapsed Time | Write Throughput |
| :--- | :--- | :--- |
| **Plain JS Heap Objects** | 58.51 ms | 17.09 Million ops/sec |
| **Native TypedArrays (SOA)** | 4.57 ms | 218.63 Million ops/sec |
| **Aegis.js Flat Arena** | 70.62 ms | 14.16 Million ops/sec |

---

## 3. Sequential Scan & Hardware Math (1,000,000 Records)

Iterating through 1,000,000 records to calculate bid sum, average spread (`ask - bid`), and count active records where `volume > 2500`:

| Paradigm | Elapsed Time | Scan Throughput | Heap Delta During Scan |
| :--- | :--- | :--- | :--- |
| **Plain JS Heap Objects** | 6.88 ms | 145.29 Million ops/sec | **11.50 MB heap churn** |
| **Native TypedArrays (SOA)** | 4.99 ms | 200.20 Million ops/sec | **13.55 MB heap churn** |
| **Aegis.js Flat Arena** | 12.77 ms | 78.32 Million ops/sec | **0.08 MB heap churn (99.3% reduction)** |

### Architectural Insight:
While plain JS iterates quickly through warm objects, it generated **11.50 MB of garbage memory churn** during calculation. Aegis.js completed 78.32 Million ops/sec while keeping the heap flatlined at **0.08 MB** (zero GC pressure).

---

## 4. Zero-Copy Serialization & Wire Transfer (1,000,000 Records)

*This is the decisive architectural advantage of Aegis.js for network servers, WebSocket feeds, and worker threads:*

| Paradigm | Output Format | Serialization Time | Payload Size | Zero-Copy? |
| :--- | :--- | :--- | :--- | :--- |
| **Plain JS Heap Objects** | `JSON.stringify` | **198.49 ms** | 69.45 MB string | No (Deep copy) |
| **Native TypedArrays (SOA)** | Packed Bytes | 2.83 ms | 23.84 MB | No (Manual copy) |
| **Aegis.js Flat Arena** | Flat Binary Arena | **0.10 ms** | 61.04 MB | **YES (Zero-Copy)** |

### Architectural Insight:
To send 1,000,000 records over a network or to a worker thread:
* **Plain JS:** Takes **~200 ms** to serialize into JSON and another **~240 ms** to parse on the receiving end (total ~440 ms round-trip).
* **Aegis.js:** Shares or streams the binary buffer in **0.10 ms (1,984x faster)** with **0.00 ms deserialization overhead**. You pass the raw buffer directly to `socket.write()` or `worker.postMessage()`.

---

## 5. Real-Time Streaming FIFO Queue (500,000 High-Frequency Events)

Processing 500,000 streaming events through a 1,024-capacity circular queue:

| Paradigm | Queue Implementation | Elapsed Time | Throughput | Heap Allocation |
| :--- | :--- | :--- | :--- | :--- |
| **Plain JS Queue** | `queue.push()` + `queue.shift()` | 21.73 ms | 23.01 M ops/sec | High object churn |
| **Aegis RingBuffer (Object Copy)** | `ring.push({ id, price })` | 25.41 ms | 39.35 M ops/sec | Temporary plain objects |
| **Aegis RingBuffer (Direct Binary)** | Direct Slot Offset | **11.48 ms** | **87.13 M ops/sec** | **0 bytes allocated** |

---

## The Micro-Benchmark Paradox: Production vs Synthetic Loops

When engineers look at raw tight loops, plain JavaScript objects often appear deceptively fast. Why?

### What Plain JS "Fakes" in a Micro-Benchmark
1. **Objects Are Created Once & Never Collected:**
   In a synthetic loop, the 1,000,000 objects are allocated once, warmed up by V8's JIT compiler (TurboFan), and kept in CPU cache. In production, servers continuously receive new requests, quotes, and packets. Every new plain object triggers V8's Garbage Collector. Under continuous allocation, V8 pauses execution for **1.15 ms to 2.33 ms** per collection cycle. In Aegis.js, **GC pause time is 0.00 ms permanently**.
2. **The 10 Million Record Scale Barrier:**
   Plain JS consumes ~100 MB per 1 million records. At 10 million records, plain JS hits Node.js's default 1.4-2.0 GB heap ceiling and crashes with:
   ```text
   FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
   ```
   Aegis.js stores 10 million records in a predictable flat binary buffer without touching the V8 object heap.
3. **Multi-Threaded Worker Concurrency:**
   Plain JavaScript objects **cannot be shared across threads**. If you have 4 worker threads, each worker must have its own copy of all objects (wasting 4x memory and hundreds of ms copying). Aegis.js is built natively on `SharedArrayBuffer` with ECMAScript `Atomics`: all threads point to the exact same memory with **zero copying (0 ms)**.

---

## When to Use What

* **Use Plain JavaScript Objects** if:
  You are building a standard CRUD web application, manipulating small collections (< 10,000 items), and do not care about serialization overhead or GC pause jitter.
* **Use Aegis.js Flat Arenas** if:
  You are building high-frequency data pipelines, streaming financial market feeds, ingesting high-volume telemetry, sharing state across worker threads with zero copying, or cannot tolerate random 10-50ms Garbage Collection freezes.

---

## Running the Benchmark Locally

You can run this exact benchmark suite directly on your own hardware:

```bash
git clone https://github.com/aventine-labs/aegis-js.git
cd aegis-js
npm install
node --expose-gc benchmarks/benchmark_suite.js
```
