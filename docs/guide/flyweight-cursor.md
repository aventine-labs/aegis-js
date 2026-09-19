# The Flyweight Cursor Pattern

The **Flyweight Cursor** is the foundational mechanism that allows Aegis.js to provide standard object-oriented syntax without creating JavaScript objects during iterations and queries.

---

## The Problem with Traditional Iteration

Consider iterating over an array in standard JavaScript:

```typescript
// Standard JavaScript: 1,000,000 objects are accessed or created
for (let i = 0; i < records.length; i++) {
  const record = records[i]; // Accesses heap-allocated object wrapper
  processRecord(record);
}
```

If you construct new objects inside loops or map functions, V8 allocates hundreds of thousands of ephemeral objects, triggering immediate GC pressure.

---

## The Cursor Slider Solution

In Aegis.js, an `AegisCursor<T>` is an object allocated **once**. It contains:
1. A reference to the underlying `DataView` or typed buffer.
2. A single internal integer variable: `byteOffset`.

When you call `readings.forEach((cursor) => { ... })`:
- Aegis.js creates **zero** objects per loop iteration.
- It updates the internal `byteOffset` of a single cursor instance from `0` to `stride`, `2 * stride`, `3 * stride`, etc.
- Property getters (`cursor.temperature`) compute `DataView.getFloat64(byteOffset + fieldOffset, true)` on the fly.
- Property setters (`cursor.temperature = 25.4`) invoke `DataView.setFloat64(byteOffset + fieldOffset, 25.4, true)` on the fly.

```
[ Contiguous ArrayBuffer ]
  +------------------+------------------+------------------+
  | Record 0 (64 B)  | Record 1 (64 B)  | Record 2 (64 B)  |
  +------------------+------------------+------------------+
          ^
          | (slide byteOffset = 0)
     [ Single Cursor Instance ]
          | (slide byteOffset = 64)
          +------------------>
                               (slide byteOffset = 128)
                               +------------------>
```

---

## Cursor Operations

### In-Place Mutation
Writing to any property on the cursor immediately updates the underlying binary buffer:

```typescript
const item = list.get(10);
item.price = 299.99;
item.inStock = true;
```

### Remounting to Another Index
Instead of requesting a new cursor via `list.get(index)`, you can re-point an existing cursor to any index:

```typescript
const cursor = list.cursor(0);

for (let i = 0; i < list.length; i++) {
  cursor.remount(i);
  if (cursor.price > 500) {
    console.log(`High value item at index ${i}: $${cursor.price}`);
  }
}
```

### Snapshotting to Pure JSON
If you need to serialize a record or send it over an external REST API, call `.toObject()`:

```typescript
const plainObject = cursor.toObject();
console.log(JSON.stringify(plainObject));
// Output: {"orderId":42,"price":150.25,"symbol":"NVDA","filled":false}
```

### Copying Between Records
To duplicate record data in memory without serializing:

```typescript
const source = list.get(0);
const target = list.get(5);

target.copyFrom(source); // Performs an ultra-fast raw memory copy
```
