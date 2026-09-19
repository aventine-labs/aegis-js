/**
 * Aegis.js Comprehensive Benchmark Suite
 * 
 * Compares 3 distinct memory and data paradigms inside Google V8 / Node.js:
 * 1. Standard Idiomatic JavaScript: Array of Plain V8 Heap Objects (Array<Object>)
 * 2. Native TypedArrays (SOA / Buffer): Native TypedArrays (Uint32Array, Float64Array)
 * 3. Aegis.js Silicon Memory Arena: 64-Byte Cache-Aligned Flat Buffer + Flyweight Cursor
 * 
 * Evaluates:
 * 1. Memory Footprint (Heap / RAM overhead in MB)
 * 2. Ingestion & Write Throughput (Ops/sec for 1M records)
 * 3. Aggregation & Scan Speed (Sum, Average, Conditional Filter over 1M records)
 * 4. Zero-Copy Serialization & Wire Transfer (1M records to binary/JSON)
 * 5. Streaming FIFO Queue Throughput (500k real-time events with GC pressure)
 */

import { struct, uint32, float64, boolean, createList, createRingBuffer, IO } from '../dist/index.js';

const RECORD_COUNT = 1_000_000;
const STREAM_COUNT = 500_000;

function forceGC() {
  if (globalThis.gc) {
    globalThis.gc();
  }
}

function getMemoryMB() {
  forceGC();
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed / (1024 * 1024),
    rss: usage.rss / (1024 * 1024)
  };
}

// -----------------------------------------------------------------------------
// BENCHMARK 1: Standard Idiomatic JavaScript (Plain V8 Heap Objects)
// -----------------------------------------------------------------------------
function runPlainJS() {
  console.log('>>> [1/3] Benchmarking Standard Idiomatic JavaScript (Heap Objects)...');
  
  forceGC();
  const memStart = getMemoryMB();

  // 1. Ingestion
  const t0 = performance.now();
  const list = new Array(RECORD_COUNT);
  for (let i = 0; i < RECORD_COUNT; i++) {
    list[i] = {
      id: i,
      bid: 100.0 + (i * 0.001),
      ask: 100.05 + (i * 0.001),
      volume: 1000 + (i % 5000),
      active: (i % 2 === 0)
    };
  }
  const ingestTime = performance.now() - t0;
  const memAfterIngest = getMemoryMB();
  const ingestMemMB = memAfterIngest.heapUsed - memStart.heapUsed;
  const ingestOps = (RECORD_COUNT / (ingestTime / 1000)) / 1_000_000;

  // 2. Scan & Aggregation
  const memBeforeScan = process.memoryUsage().heapUsed;
  const tScanStart = performance.now();
  let sumBids = 0;
  let sumSpreads = 0;
  let activeHighVolCount = 0;
  for (let i = 0; i < RECORD_COUNT; i++) {
    const item = list[i];
    sumBids += item.bid;
    sumSpreads += (item.ask - item.bid);
    if (item.active && item.volume > 2500) {
      activeHighVolCount++;
    }
  }
  const scanTime = performance.now() - tScanStart;
  const memAfterScan = process.memoryUsage().heapUsed;
  const scanHeapDeltaMB = Math.max(0, (memAfterScan - memBeforeScan) / (1024 * 1024));
  const scanOps = (RECORD_COUNT / (scanTime / 1000)) / 1_000_000;

  // 3. Serialization (to string / wire transfer)
  const tSerStart = performance.now();
  const serialized = JSON.stringify(list.slice(0, 100_000)); // Sample 100k for JSON to prevent memory exhaustion
  const serTimeScaled = (performance.now() - tSerStart) * 10; // Scale to 1M estimate
  const serBytes = serialized.length * 10;

  // 4. Streaming FIFO Queue (500k events)
  forceGC();
  const memBeforeQueue = process.memoryUsage().heapUsed;
  const tQStart = performance.now();
  const queue = [];
  for (let i = 0; i < STREAM_COUNT; i++) {
    queue.push({ id: i, price: 100.0 + i });
    if (queue.length > 1024) {
      queue.shift();
    }
  }
  const queueTime = performance.now() - tQStart;
  const queueHeapDeltaMB = Math.max(0, (process.memoryUsage().heapUsed - memBeforeQueue) / (1024 * 1024));
  const queueOps = (STREAM_COUNT / (queueTime / 1000)) / 1_000_000;

  return {
    name: 'Plain JS Heap Objects',
    memoryFootprintMB: ingestMemMB,
    ingestTimeMs: ingestTime,
    ingestThroughputMops: ingestOps,
    scanTimeMs: scanTime,
    scanThroughputMops: scanOps,
    scanHeapDeltaMB: scanHeapDeltaMB,
    serTimeMs: serTimeScaled,
    serThroughputMops: (RECORD_COUNT / (serTimeScaled / 1000)) / 1_000_000,
    serSizeMB: serBytes / (1024 * 1024),
    queueTimeMs: queueTime,
    queueThroughputMops: queueOps,
    queueHeapDeltaMB: queueHeapDeltaMB
  };
}

// -----------------------------------------------------------------------------
// BENCHMARK 2: Native JavaScript TypedArrays (Structure of Arrays)
// -----------------------------------------------------------------------------
function runTypedArrays() {
  console.log('>>> [2/3] Benchmarking Native JavaScript TypedArrays (SOA)...');
  
  forceGC();
  const memStart = getMemoryMB();

  // 1. Ingestion
  const t0 = performance.now();
  const ids = new Uint32Array(RECORD_COUNT);
  const bids = new Float64Array(RECORD_COUNT);
  const asks = new Float64Array(RECORD_COUNT);
  const volumes = new Uint32Array(RECORD_COUNT);
  const actives = new Uint8Array(RECORD_COUNT);

  for (let i = 0; i < RECORD_COUNT; i++) {
    ids[i] = i;
    bids[i] = 100.0 + (i * 0.001);
    asks[i] = 100.05 + (i * 0.001);
    volumes[i] = 1000 + (i % 5000);
    actives[i] = (i % 2 === 0) ? 1 : 0;
  }
  const ingestTime = performance.now() - t0;
  const ingestMemMB = (ids.byteLength + bids.byteLength + asks.byteLength + volumes.byteLength + actives.byteLength) / (1024 * 1024);
  const ingestOps = (RECORD_COUNT / (ingestTime / 1000)) / 1_000_000;

  // 2. Scan & Aggregation
  const memBeforeScan = process.memoryUsage().heapUsed;
  const tScanStart = performance.now();
  let sumBids = 0;
  let sumSpreads = 0;
  let activeHighVolCount = 0;
  for (let i = 0; i < RECORD_COUNT; i++) {
    sumBids += bids[i];
    sumSpreads += (asks[i] - bids[i]);
    if (actives[i] === 1 && volumes[i] > 2500) {
      activeHighVolCount++;
    }
  }
  const scanTime = performance.now() - tScanStart;
  const memAfterScan = process.memoryUsage().heapUsed;
  const scanHeapDeltaMB = Math.max(0, (memAfterScan - memBeforeScan) / (1024 * 1024));
  const scanOps = (RECORD_COUNT / (scanTime / 1000)) / 1_000_000;

  // 3. Serialization (Consolidating 5 separate arrays into 1 flat buffer)
  const tSerStart = performance.now();
  const totalBytes = ids.byteLength + bids.byteLength + asks.byteLength + volumes.byteLength + actives.byteLength;
  const packed = new Uint8Array(totalBytes);
  let offset = 0;
  packed.set(new Uint8Array(ids.buffer), offset); offset += ids.byteLength;
  packed.set(new Uint8Array(bids.buffer), offset); offset += bids.byteLength;
  packed.set(new Uint8Array(asks.buffer), offset); offset += asks.byteLength;
  packed.set(new Uint8Array(volumes.buffer), offset); offset += volumes.byteLength;
  packed.set(new Uint8Array(actives.buffer), offset);
  const serTime = performance.now() - tSerStart;

  // 4. Streaming FIFO Queue (using index sliding over fixed TypedArray)
  forceGC();
  const memBeforeQueue = process.memoryUsage().heapUsed;
  const tQStart = performance.now();
  const qIds = new Uint32Array(1024);
  const qPrices = new Float64Array(1024);
  let head = 0;
  for (let i = 0; i < STREAM_COUNT; i++) {
    const slot = head & 1023;
    qIds[slot] = i;
    qPrices[slot] = 100.0 + i;
    head++;
  }
  const queueTime = performance.now() - tQStart;
  const queueHeapDeltaMB = Math.max(0, (process.memoryUsage().heapUsed - memBeforeQueue) / (1024 * 1024));
  const queueOps = (STREAM_COUNT / (queueTime / 1000)) / 1_000_000;

  return {
    name: 'Native TypedArrays (SOA)',
    memoryFootprintMB: ingestMemMB,
    ingestTimeMs: ingestTime,
    ingestThroughputMops: ingestOps,
    scanTimeMs: scanTime,
    scanThroughputMops: scanOps,
    scanHeapDeltaMB: scanHeapDeltaMB,
    serTimeMs: serTime,
    serThroughputMops: (RECORD_COUNT / (serTime / 1000)) / 1_000_000,
    serSizeMB: totalBytes / (1024 * 1024),
    queueTimeMs: queueTime,
    queueThroughputMops: queueOps,
    queueHeapDeltaMB: queueHeapDeltaMB
  };
}

// -----------------------------------------------------------------------------
// BENCHMARK 3: Aegis.js Silicon Flat Memory Arena (AegisList & RingBuffer)
// -----------------------------------------------------------------------------
function runAegis() {
  console.log('>>> [3/3] Benchmarking Aegis.js Silicon Flat Memory Arena...');
  
  forceGC();
  const MarketTick = struct({
    id: uint32,
    bid: float64,
    ask: float64,
    volume: uint32,
    active: boolean
  });

  // 1. Ingestion
  const t0 = performance.now();
  const list = createList(MarketTick, { capacity: RECORD_COUNT });

  for (let i = 0; i < RECORD_COUNT; i++) {
    list.push({
      id: i,
      bid: 100.0 + (i * 0.001),
      ask: 100.05 + (i * 0.001),
      volume: 1000 + (i % 5000),
      active: (i % 2 === 0)
    });
  }
  const ingestTime = performance.now() - t0;
  const ingestMemMB = list.byteLength / (1024 * 1024);
  const ingestOps = (RECORD_COUNT / (ingestTime / 1000)) / 1_000_000;

  // 2. Scan & Aggregation (Using single Flyweight Cursor - Zero Heap Allocation)
  const memBeforeScan = process.memoryUsage().heapUsed;
  const tScanStart = performance.now();
  let sumBids = 0;
  let sumSpreads = 0;
  let activeHighVolCount = 0;
  
  list.forEach((item) => {
    sumBids += item.bid;
    sumSpreads += (item.ask - item.bid);
    if (item.active && item.volume > 2500) {
      activeHighVolCount++;
    }
  });

  const scanTime = performance.now() - tScanStart;
  const memAfterScan = process.memoryUsage().heapUsed;
  const scanHeapDeltaMB = Math.max(0, (memAfterScan - memBeforeScan) / (1024 * 1024));
  const scanOps = (RECORD_COUNT / (scanTime / 1000)) / 1_000_000;

  // 3. Serialization (Zero-Copy binary slice - Direct ArrayBuffer)
  const tSerStart = performance.now();
  const binaryBuffer = IO.toBinary(list);
  const serTime = performance.now() - tSerStart;

  // 4. Streaming FIFO Queue (AegisRingBuffer - 500k events, zero allocation)
  forceGC();
  const StreamTick = struct({ id: uint32, price: float64 });
  const memBeforeQueue = process.memoryUsage().heapUsed;
  const tQStart = performance.now();
  const ring = createRingBuffer(StreamTick, { capacity: 1024, overwrite: true });

  for (let i = 0; i < STREAM_COUNT; i++) {
    ring.push({ id: i, price: 100.0 + i });
  }
  const queueTime = performance.now() - tQStart;
  const queueHeapDeltaMB = Math.max(0, (process.memoryUsage().heapUsed - memBeforeQueue) / (1024 * 1024));
  const queueOps = (STREAM_COUNT / (queueTime / 1000)) / 1_000_000;

  return {
    name: 'Aegis.js Flat Arena',
    memoryFootprintMB: ingestMemMB,
    ingestTimeMs: ingestTime,
    ingestThroughputMops: ingestOps,
    scanTimeMs: scanTime,
    scanThroughputMops: scanOps,
    scanHeapDeltaMB: scanHeapDeltaMB,
    serTimeMs: serTime,
    serThroughputMops: (RECORD_COUNT / (Math.max(serTime, 0.0001) / 1000)) / 1_000_000,
    serSizeMB: binaryBuffer.byteLength / (1024 * 1024),
    queueTimeMs: queueTime,
    queueThroughputMops: queueOps,
    queueHeapDeltaMB: queueHeapDeltaMB
  };
}

// -----------------------------------------------------------------------------
// MAIN RUNNER
// -----------------------------------------------------------------------------
async function main() {
  console.log('===================================================================');
  console.log('       AEGIS.JS EMPIRICAL BASELINE & PERFORMANCE BENCHMARK         ');
  console.log(`       Dataset: ${RECORD_COUNT.toLocaleString()} Records | Streaming Load: ${STREAM_COUNT.toLocaleString()} Events`);
  console.log(`       Runtime: Node.js ${process.version} (Google V8 Engine)`);
  console.log(`       Architecture: ${process.arch} | Silicon Alignment: 64-byte Cache Lines`);
  console.log('===================================================================\n');

  const plain = runPlainJS();
  const typed = runTypedArrays();
  const aegis = runAegis();

  console.log('\n===================================================================');
  console.log('                          BENCHMARK RESULTS                        ');
  console.log('===================================================================');

  console.log('\n--- 1. STATIC MEMORY FOOTPRINT (1,000,000 Structured Records) ---');
  console.table([
    { Paradigm: plain.name, 'RAM / Heap (MB)': plain.memoryFootprintMB.toFixed(2), Overhead: '100% (Baseline)' },
    { Paradigm: typed.name, 'RAM / Heap (MB)': typed.memoryFootprintMB.toFixed(2), Overhead: `${((typed.memoryFootprintMB / plain.memoryFootprintMB) * 100).toFixed(1)}%` },
    { Paradigm: aegis.name, 'RAM / Heap (MB)': aegis.memoryFootprintMB.toFixed(2), Overhead: `${((aegis.memoryFootprintMB / plain.memoryFootprintMB) * 100).toFixed(1)}%` }
  ]);

  console.log('\n--- 2. INGESTION & WRITE THROUGHPUT (1,000,000 Records) ---');
  console.table([
    { Paradigm: plain.name, 'Elapsed (ms)': plain.ingestTimeMs.toFixed(2), 'Throughput (M ops/sec)': plain.ingestThroughputMops.toFixed(2) },
    { Paradigm: typed.name, 'Elapsed (ms)': typed.ingestTimeMs.toFixed(2), 'Throughput (M ops/sec)': typed.ingestThroughputMops.toFixed(2) },
    { Paradigm: aegis.name, 'Elapsed (ms)': aegis.ingestTimeMs.toFixed(2), 'Throughput (M ops/sec)': aegis.ingestThroughputMops.toFixed(2) }
  ]);

  console.log('\n--- 3. SEQUENTIAL SCAN & HARDWARE MATH (1,000,000 Records) ---');
  console.table([
    { Paradigm: plain.name, 'Elapsed (ms)': plain.scanTimeMs.toFixed(2), 'Throughput (M ops/sec)': plain.scanThroughputMops.toFixed(2), 'Heap Delta': `${plain.scanHeapDeltaMB.toFixed(2)} MB` },
    { Paradigm: typed.name, 'Elapsed (ms)': typed.scanTimeMs.toFixed(2), 'Throughput (M ops/sec)': typed.scanThroughputMops.toFixed(2), 'Heap Delta': `${typed.scanHeapDeltaMB.toFixed(2)} MB` },
    { Paradigm: aegis.name, 'Elapsed (ms)': aegis.scanTimeMs.toFixed(2), 'Throughput (M ops/sec)': aegis.scanThroughputMops.toFixed(2), 'Heap Delta': `${aegis.scanHeapDeltaMB.toFixed(2)} MB` }
  ]);

  console.log('\n--- 4. ZERO-COPY SERIALIZATION & WIRE TRANSFER (1,000,000 Records) ---');
  console.table([
    { Paradigm: plain.name, 'Format': 'JSON String', 'Time (ms)': plain.serTimeMs.toFixed(2), 'Payload Size': `${plain.serSizeMB.toFixed(2)} MB`, 'Zero-Copy': 'No (Full Copy)' },
    { Paradigm: typed.name, 'Format': 'Packed Bytes', 'Time (ms)': typed.serTimeMs.toFixed(2), 'Payload Size': `${typed.serSizeMB.toFixed(2)} MB`, 'Zero-Copy': 'No (Memory Copy)' },
    { Paradigm: aegis.name, 'Format': 'Flat Binary Arena', 'Time (ms)': aegis.serTimeMs.toFixed(2), 'Payload Size': `${aegis.serSizeMB.toFixed(2)} MB`, 'Zero-Copy': 'YES (Zero Copy)' }
  ]);

  console.log('\n--- 5. REAL-TIME STREAMING FIFO QUEUE (500,000 High-Frequency Events) ---');
  console.table([
    { Paradigm: plain.name, 'Queue Type': 'Array push + shift', 'Elapsed (ms)': plain.queueTimeMs.toFixed(2), 'Throughput (M ops/sec)': plain.queueThroughputMops.toFixed(2), 'Heap Churn': `${plain.queueHeapDeltaMB.toFixed(2)} MB` },
    { Paradigm: typed.name, 'Queue Type': 'Index Sliding Array', 'Elapsed (ms)': typed.queueTimeMs.toFixed(2), 'Throughput (M ops/sec)': typed.queueThroughputMops.toFixed(2), 'Heap Churn': `${typed.queueHeapDeltaMB.toFixed(2)} MB` },
    { Paradigm: aegis.name, 'Queue Type': 'AegisRingBuffer (Lock-Free)', 'Elapsed (ms)': aegis.queueTimeMs.toFixed(2), 'Throughput (M ops/sec)': aegis.queueThroughputMops.toFixed(2), 'Heap Churn': `${aegis.queueHeapDeltaMB.toFixed(2)} MB` }
  ]);
}

main().catch(console.error);
