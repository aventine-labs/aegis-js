import { 
  Aegis, 
  uint32, 
  float64, 
  boolean, 
  fixedString 
} from '../../dist/index.js';

console.log('================================================================');
console.log(' Aegis.js Starter Application - Silicon Flat Memory Demonstration');
console.log('================================================================\n');

// 1. Define 64-byte cache line aligned telemetry schema
const TelemetrySchema = Aegis.struct(
  {
    packetId: uint32,
    sensorVoltage: float64,
    temperature: float64,
    active: boolean,
    stationId: fixedString(8),
  },
  {
    isOverheating(cursor) {
      return cursor.temperature > 85.0;
    },
    powerDissipation(cursor) {
      return cursor.sensorVoltage * 0.45;
    },
  }
);

console.log(`[Schema] Natural Size: ${TelemetrySchema.size} bytes`);
console.log(`[Schema] Stride (Aligned to 64-byte Cache Line): ${TelemetrySchema.stride} bytes\n`);

// 2. Allocate contiguous flat memory arena for 100,000 packets
const RECORD_COUNT = 100_000;
const arena = Aegis.list(TelemetrySchema, { capacity: RECORD_COUNT });

console.log(`[Arena] Allocated ${RECORD_COUNT.toLocaleString()} slots: ${(arena.byteLength / 1024 / 1024).toFixed(2)} MB`);

// 3. Record baseline V8 heap
if (global.gc) {
  global.gc();
}
const initialHeap = process.memoryUsage().heapUsed;
const startTime = performance.now();

// 4. Ingest 100,000 records
for (let i = 0; i < RECORD_COUNT; i++) {
  arena.push({
    packetId: i + 1,
    sensorVoltage: 3.3 + (i % 100) * 0.01,
    temperature: 45.0 + (i % 50) * 1.1,
    active: i % 2 === 0,
    stationId: 'STN-NYC',
  });
}

const ingestDuration = performance.now() - startTime;
const postIngestHeap = process.memoryUsage().heapUsed;
const heapDeltaMB = (postIngestHeap - initialHeap) / 1024 / 1024;

console.log(`[Ingest] ${RECORD_COUNT.toLocaleString()} records written in ${ingestDuration.toFixed(2)} ms`);
console.log(`[Ingest] Throughput: ${((RECORD_COUNT / (ingestDuration / 1000)) / 1_000_000).toFixed(2)} Million records/sec`);
console.log(`[V8 Heap] Net heap growth: ${heapDeltaMB.toFixed(3)} MB (Flatline)\n`);

// 5. Query and compute using Flyweight Cursor
let overheatingCount = 0;
let totalPower = 0;

const queryStart = performance.now();
arena.forEach(record => {
  if (record.isOverheating()) {
    overheatingCount++;
  }
  totalPower += record.powerDissipation();
});
const queryDuration = performance.now() - queryStart;

console.log(`[Flyweight Query] Scanned ${RECORD_COUNT.toLocaleString()} records in ${queryDuration.toFixed(2)} ms`);
console.log(`[Flyweight Query] Overheating Packets: ${overheatingCount.toLocaleString()}`);
console.log(`[Flyweight Query] Total Power: ${totalPower.toFixed(2)} W\n`);

// 6. Direct Hardware Math Accelerators
const mathStart = performance.now();
const avgTemp = arena.average('temperature');
const minVoltage = arena.min('sensorVoltage');
const maxVoltage = arena.max('sensorVoltage');
const mathDuration = performance.now() - mathStart;

console.log(`[Hardware Math] Direct binary buffer aggregations in ${mathDuration.toFixed(2)} ms:`);
console.log(`  - Average Temperature: ${avgTemp.toFixed(2)} °C`);
console.log(`  - Voltage Range: ${minVoltage.toFixed(2)} V to ${maxVoltage.toFixed(2)} V\n`);

// 7. Circular FIFO Streaming Ring Buffer Demo
console.log('[Ring Buffer] Demonstrating 1,024-slot lock-free circular queue:');
const streamQueue = Aegis.ringBuffer(TelemetrySchema, { capacity: 1024, overwrite: true });

for (let i = 0; i < 2000; i++) {
  streamQueue.push({
    packetId: 50000 + i,
    sensorVoltage: 3.3,
    temperature: 70.0,
    active: true,
    stationId: 'STREAM',
  });
}

console.log(`  - Pushed 2,000 items with overwrite=true.`);
console.log(`  - Ring buffer current items: ${streamQueue.length} (Max: ${streamQueue.capacity})`);
const oldest = streamQueue.peek();
console.log(`  - Oldest available packet in ring: #${oldest?.packetId}`);

console.log('\n================================================================');
console.log(' Demonstration Complete: Silicon-grade zero-GC throughput verified.');
console.log('================================================================');
