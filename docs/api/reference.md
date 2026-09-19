# API Reference

Complete API reference for `@aventine/aegis-js`.

---

## Namespaces & Exports

```typescript
import {
  Aegis,
  // Primitives
  uint8, int8,
  uint16, int16,
  uint32, int32,
  bigint64, biguint64,
  float32, float64,
  boolean,
  fixedString,
  fixedBytes,
  // Utilities
  IO,
  Threads,
} from '@aventine/aegis-js';
```

---

## Struct Definition

### `Aegis.struct(definition, customMethods?)`
Compiles a struct definition into a typed schema with automatic 64-byte silicon cache line alignment.

#### Parameters:
- `definition: Record<string, AegisFieldType>`: Object mapping field names to primitives.
- `customMethods?: Record<string, (cursor: any) => any>`: Optional domain helper functions.

#### Returns:
`AegisStructSchema<T, M>`:
- `size: number`: Natural byte size of the fields before alignment padding.
- `stride: number`: Cache line aligned stride in bytes (always a multiple of 64).
- `offsets: Record<keyof T, number>`: Exact byte offsets for each field.
- `types: Record<keyof T, AegisFieldType>`: Primitive types for each field.
- `methods: M`: Custom method registry.

---

## Collections

### `Aegis.list(schema, options)`
Allocates a contiguous flat array backed by an `ArrayBuffer` or `SharedArrayBuffer`.

#### Options:
- `capacity: number`: Maximum number of records the list can hold.
- `buffer?: ArrayBufferLike`: Existing buffer to mount over.
- `shared?: boolean`: If true, allocates using `SharedArrayBuffer` for worker threads.

#### Methods:
- `push(value: Partial<T>): number`: Appends record, returns new length.
- `pop(): Partial<T> | undefined`: Removes and returns last record.
- `get(index: number): AegisCursor<T>`: Returns flyweight cursor mounted to index.
- `cursor(index?: number): AegisCursor<T>`: Allocates a new cursor slider.
- `clear(): void`: Resets list length to 0.
- `forEach(fn: (cursor: AegisCursor<T>, index: number) => void): void`: Zero-allocation iterator.
- `find(predicate: (cursor: AegisCursor<T>) => boolean): AegisCursor<T> | null`: Finds first match.
- `filter(predicate: (cursor: AegisCursor<T>) => boolean): Partial<T>[]`: Returns array of matching plain objects.
- `map<R>(fn: (cursor: AegisCursor<T>, index: number) => R): R[]`: Projects records.
- `reduce<U>(fn: (acc: U, cursor: AegisCursor<T>) => U, initialValue: U): U`: Aggregation iterator.
- `sum(field: keyof T): number`: Direct binary sum.
- `average(field: keyof T): number`: Direct binary average.
- `min(field: keyof T): number`: Direct binary minimum.
- `max(field: keyof T): number`: Direct binary maximum.
- `countWhere(predicate: (cursor: AegisCursor<T>) => boolean): number`: Counts matches.
- `sortBy(field: keyof T, direction?: 'asc' | 'desc'): void`: In-place dual-pivot quicksort.
- `toJSON(): Partial<T>[]`: Exports all active records as a plain JavaScript array.
- `fromJSON(items: Partial<T>[]): void`: Imports plain JavaScript objects.

---

### `Aegis.ringBuffer(schema, options)`
Allocates a circular lock-free FIFO queue.

#### Options:
- `capacity: number`: Capacity (automatically rounded to nearest power of two).
- `overwrite?: boolean`: If true, overwrites oldest entry on overflow. Default is false.
- `buffer?: ArrayBufferLike`: Existing buffer to mount over.
- `shared?: boolean`: If true, allocates using `SharedArrayBuffer`.

#### Methods:
- `push(value: Partial<T>): boolean`: Pushes to tail. Returns false if full and overwrite is false.
- `pop(): Partial<T> | null`: Pops from head into a plain object.
- `peek(): AegisCursor<T> | null`: Returns cursor mounted to head without advancing.
- `clear(): void`: Resets buffer.
- `length: number`: Current number of queued items.
- `capacity: number`: Power-of-two capacity.
- `isFull: boolean`: True if queue is full.
- `isEmpty: boolean`: True if queue is empty.

---

### `Aegis.map(schema, options)`
Allocates an open-addressing flat hash table with 32-bit FNV-1a hashing.

#### Options:
- `capacity: number`: Number of slots (automatically rounded up to power of two).
- `keyField: keyof T`: Field used as the lookup key.
- `buffer?: ArrayBufferLike`: Existing buffer to mount over.

#### Methods:
- `set(key: any, value: Partial<T>): boolean`: Inserts or updates entry.
- `get(key: any): AegisCursor<T> | null`: Returns cursor mounted to matching slot.
- `has(key: any): boolean`: Returns true if key exists.
- `delete(key: any): boolean`: Removes key from hash table.
- `clear(): void`: Clears all entries.
- `size: number`: Current count of active entries.
- `forEach(fn: (cursor: AegisCursor<T>, key: any) => void): void`: Zero-allocation iterator.

---

### `Aegis.pool(schema, options)`
Allocates an O(1) slot allocator for high-frequency entity recycling.

#### Options:
- `capacity: number`: Maximum number of slots in the pool.
- `buffer?: ArrayBufferLike`: Existing buffer to mount over.

#### Methods:
- `acquire(initialValues?: Partial<T>): AegisCursor<T>`: Allocates a slot and mounts cursor.
- `release(index: number): void`: Releases slot back to free stack.
- `get(index: number): AegisCursor<T> | null`: Returns cursor for active slot.
- `activeCount: number`: Number of acquired slots.
- `availableCount: number`: Number of free slots.
- `capacity: number`: Total capacity.

---

## I/O Utilities (`IO`)

- `IO.toBinary(collection: { buffer: ArrayBufferLike, byteLength?: number }): Uint8Array`: Returns active binary slice.
- `IO.fromBinary<T>(schema: AegisStructSchema<T>, buffer: ArrayBufferLike, options?: any): AegisList<T>`: Mounts list over existing binary buffer.
- `IO.subView(collection: any, start: number, length: number): Uint8Array`: Returns view of byte range.

---

## Concurrency Utilities (`Threads`)

- `Threads.transferable(collection: any): ArrayBufferLike`: Returns underlying buffer suitable for Worker `postMessage` transfer list.
- `Threads.atomics.add(buffer: ArrayBufferLike, byteOffset: number, value: number): number`: Atomic add.
- `Threads.atomics.sub(buffer: ArrayBufferLike, byteOffset: number, value: number): number`: Atomic subtract.
- `Threads.atomics.load(buffer: ArrayBufferLike, byteOffset: number): number`: Atomic load.
- `Threads.atomics.store(buffer: ArrayBufferLike, byteOffset: number, value: number): number`: Atomic store.
- `Threads.atomics.compareExchange(buffer: ArrayBufferLike, byteOffset: number, expected: number, replacement: number): number`: Atomic CAS.
