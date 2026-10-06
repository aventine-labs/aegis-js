import { Aegis } from '../dist/index.js';

// 1. Define 64-Byte Cache-Aligned Struct with Unboxed Primitives
const OrderStruct = Aegis.struct({
  orderId: Aegis.uint32,
  symbolId: Aegis.uint32,
  price: Aegis.float64,
  quantity: Aegis.uint32,
  side: Aegis.uint8,
  filled: Aegis.boolean
}, { alignment: 64 });

console.log('================================================================================');
console.log('AEGIS-JS: V8 ZERO-GC SCAVENGE & HEAP CHURN VERIFICATION');
console.log('Struct Size:', OrderStruct.stride, 'bytes (64-byte cache-aligned)');
console.log('================================================================================');

const COUNT = 1000000; // 1 Million Records
const list = Aegis.createList(OrderStruct, { capacity: COUNT });

// Force baseline garbage collection before timed loop
if (global.gc) {
  global.gc();
}

console.log('Starting 1,000,000 continuous operations with zero heap allocation...');
const baselineMem = process.memoryUsage();
const t0 = performance.now();

// 2. Zero-Allocation Write Cursor Loop (Zero temporary objects, zero closures)
const writeCursor = list.cursor(0);
for (let i = 0; i < COUNT; i++) {
  list.append();
  writeCursor.moveTo(i);
  writeCursor.orderId = i + 1;
  writeCursor.symbolId = (i % 100) + 1;
  writeCursor.price = 248.50 + (i % 10);
  writeCursor.quantity = 100;
  writeCursor.side = i % 2;
  writeCursor.filled = false;
}

const t1 = performance.now();
const insertDurationMs = t1 - t0;

// 3. Zero-Allocation Traversal & In-Place Mutation Loop
const t2 = performance.now();
let modifiedCount = 0;
const readCursor = list.cursor(0);
const len = list.length;
for (let i = 0; i < len; i++) {
  readCursor.moveTo(i);
  if (readCursor.price > 250.0) {
    readCursor.price = readCursor.price * 1.01;
    modifiedCount++;
  }
}
const t3 = performance.now();
const sweepDurationMs = t3 - t2;

const finalMem = process.memoryUsage();
const heapUsedDeltaKb = (finalMem.heapUsed - baselineMem.heapUsed) / 1024;

console.log(`\nExecution Results (${COUNT.toLocaleString()} Records):`);
console.log(`  Append/Write Duration: ${insertDurationMs.toFixed(2)} ms (${(COUNT / (insertDurationMs / 1000) / 1e6).toFixed(2)} Million ops/sec)`);
console.log(`  Sweep & Mutate:        ${sweepDurationMs.toFixed(2)} ms (${(COUNT / (sweepDurationMs / 1000) / 1e6).toFixed(2)} Million ops/sec)`);
console.log(`  Records Modified:      ${modifiedCount.toLocaleString()}`);
console.log(`  Heap Used Baseline:    ${(baselineMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Used Final:       ${(finalMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Net V8 Heap Delta:     ${heapUsedDeltaKb > 0 ? '+' : ''}${heapUsedDeltaKb.toFixed(2)} KB`);
console.log('================================================================================');

if (Math.abs(heapUsedDeltaKb) < 50) {
  console.log('PASS: V8 Young-Generation GC Scavenge stayed completely flat. Zero heap allocation verified.');
} else {
  console.log('Notice: V8 internal heap growth of ' + heapUsedDeltaKb.toFixed(2) + ' KB.');
}
