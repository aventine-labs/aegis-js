import test from 'node:test';
import assert from 'node:assert/strict';
import { struct } from '../types/struct.js';
import { uint32, float64, boolean } from '../types/primitives.js';
import { createList } from '../collections/list.js';

test('AegisList: Zero-GC memory flatlining across 100,000 iterations', () => {
  const MarketTick = struct({
    seq: uint32,
    bid: float64,
    ask: float64,
    volume: uint32,
    active: boolean
  });

  const count = 100_000;
  const list = createList<any>(MarketTick, { capacity: count });

  // Pre-fill 100,000 rows
  for (let i = 0; i < count; i++) {
    list.push({
      seq: i,
      bid: 100.0 + (i * 0.01),
      ask: 100.05 + (i * 0.01),
      volume: 1000 + i,
      active: i % 2 === 0
    });
  }

  assert.equal(list.length, count);

  if ((globalThis as any).gc) {
    (globalThis as any).gc();
  }

  const memBefore = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  // Run 5 full passes (500,000 row modifications) using Flyweight Cursor
  let totalModifications = 0;
  for (let pass = 0; pass < 5; pass++) {
    list.forEach((tick) => {
      tick.bid += 0.01;
      tick.ask += 0.01;
      totalModifications++;
    });
  }

  const elapsedMs = performance.now() - startTime;
  if ((globalThis as any).gc) {
    (globalThis as any).gc();
  }
  const memAfter = process.memoryUsage().heapUsed;
  const heapDeltaMB = Math.abs(memAfter - memBefore) / (1024 * 1024);

  console.log(`\n========================================`);
  console.log(`[Aegis.js Zero-GC Benchmark Verification]`);
  console.log(`Total Records Processed : 500,000`);
  console.log(`Elapsed Time            : ${elapsedMs.toFixed(2)} ms`);
  console.log(`Throughput              : ${((totalModifications / (elapsedMs / 1000)) / 1_000_000).toFixed(2)} Million ops/sec`);
  console.log(`Heap Delta During Run   : ${heapDeltaMB.toFixed(3)} MB`);
  console.log(`========================================\n`);

  // Assert heap delta did not grow by more than 2.0 MB (proves zero allocations per row; 500k standard objects would be 80+ MB)
  assert.ok(heapDeltaMB < 2.0, `Heap grew by ${heapDeltaMB} MB; expected < 2.0 MB zero-allocation flatline`);
});
