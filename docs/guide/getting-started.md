# Getting Started with Aegis.js

This guide walks you through installing **Aegis.js**, defining your first 64-byte aligned struct, allocating a flat memory arena, and manipulating records with zero garbage collector allocations.

---

## Installation

Install `@aventine/aegis-js` using your preferred package manager:

```bash
# npm
npm install @aventine/aegis-js

# pnpm
pnpm add @aventine/aegis-js

# yarn
yarn add @aventine/aegis-js

# bun
bun add @aventine/aegis-js
```

Aegis.js has **zero runtime dependencies** and ships with dual ESM and CommonJS exports with full TypeScript type definitions.

---

## Step 1: Import Aegis and Silicon Primitives

```typescript
import { 
  Aegis, 
  uint32, 
  int32, 
  float64, 
  boolean, 
  fixedString 
} from '@aventine/aegis-js';
```

---

## Step 2: Define a Struct Schema

Define the schema for your data records using the struct compiler:

```typescript
export const SensorReading = Aegis.struct({
  sensorId: uint32,
  temperature: float64,
  pressure: float64,
  alertActive: boolean,
  locationCode: fixedString(8),
});
```

### What Happens Under the Hood:
- Each field is assigned an exact byte offset based on natural silicon alignment.
- The struct compiler rounds the total record size up to the nearest multiple of 64 bytes (the hardware cache line size of modern Intel, AMD, Apple M-series, and ARM Cortex processors).
- You can inspect the compiled memory footprint:

```typescript
console.log(`Natural size: ${SensorReading.size} bytes`);
console.log(`Cache line aligned stride: ${SensorReading.stride} bytes`); // Always 64, 128, 192...
```

---

## Step 3: Create a Flat Memory List

Instantiate a contiguous `AegisList` by providing the struct schema and the maximum capacity:

```typescript
// Allocate a contiguous buffer holding up to 100,000 sensor readings
const readings = Aegis.list(SensorReading, { capacity: 100_000 });

console.log(`Allocated buffer: ${readings.byteLength / 1024} KB`);
```

---

## Step 4: Add Records Without Allocation

Push records using regular JavaScript object syntax:

```typescript
for (let i = 0; i < 100_000; i++) {
  readings.push({
    sensorId: i,
    temperature: 20.0 + (Math.random() * 15.0),
    pressure: 1013.25,
    alertActive: false,
    locationCode: 'BLDG-01',
  });
}
```

Because records are written directly into the pre-allocated binary buffer, **no heap objects are retained**. The temporary object literal passed to `.push()` is immediately cleared from the V8 nursery without triggering full GC cycles.

---

## Step 5: Read and Mutate with the Flyweight Cursor

To read or update records with zero allocations, obtain a cursor slider:

```typescript
// Read record at index 42
const cursor = readings.get(42);
console.log(`Sensor ID: ${cursor.sensorId}, Temp: ${cursor.temperature}`);

// Mutate in-place (writes directly to binary memory)
cursor.temperature = 28.5;
cursor.alertActive = true;

// Re-sliding the cursor to index 99 without creating a new object:
cursor.remount(99);
console.log(`Sensor ID at 99: ${cursor.sensorId}`);
```

---

## Step 6: High-Speed Aggregations & Hardware Math

Aegis collections include built-in hardware math functions that run directly over the contiguous binary buffer without unpacking objects:

```typescript
// Sum all temperatures
const totalTemp = readings.sum('temperature');
console.log(`Total temperature: ${totalTemp}`);

// Calculate average
const avgTemp = readings.average('temperature');
console.log(`Average temperature: ${avgTemp.toFixed(2)} °C`);

// Find minimum and maximum values
const minTemp = readings.min('temperature');
const maxTemp = readings.max('temperature');

// Count matching conditions using the flyweight cursor
const alertCount = readings.countWhere(r => r.alertActive);
console.log(`Active alerts: ${alertCount}`);
```

---

## Next Steps

- Learn about [64-Byte Cache Alignment](/guide/cache-alignment) and CPU memory hierarchies.
- Explore [AegisRingBuffer](/guide/collections-ring-buffer) for lock-free streaming queues.
- Learn how to share arenas across Node.js Worker threads with [SharedArrayBuffer Concurrency](/guide/threads-and-workers).
