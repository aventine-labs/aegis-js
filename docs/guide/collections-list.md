# AegisList: Contiguous Flat Array

`AegisList<T>` is a contiguous flat memory array that mimics JavaScript's native `Array` methods (`push`, `pop`, `forEach`, `find`, `filter`, `map`, `reduce`) while guaranteeing zero garbage collection allocations.

---

## Creation

Create an `AegisList` by passing a compiled struct schema and options:

```typescript
import { Aegis, uint32, float64, fixedString } from '@aventine/aegis-js';

const Order = Aegis.struct({
  id: uint32,
  price: float64,
  symbol: fixedString(8),
});

// Allocate contiguous arena for 500,000 orders
const list = Aegis.list(Order, { capacity: 500_000 });
```

---

## Basic Operations

### Adding Records
```typescript
list.push({ id: 1, price: 99.5, symbol: 'AAPL' });
list.push({ id: 2, price: 142.1, symbol: 'MSFT' });

console.log(`Current length: ${list.length}`);
console.log(`Max capacity: ${list.capacity}`);
```

### Accessing & Mutating
```typescript
// Obtain a flyweight cursor to record 0
const order = list.get(0);
console.log(order.symbol); // 'AAPL'

// Mutate directly in binary memory
order.price = 101.25;
```

### Removing Elements
```typescript
// Remove and copy the last record
const poppedRecord = list.pop();

// Clear the list (resets length to 0, preserves allocated buffer)
list.clear();
```

---

## High-Performance Iterators

All Aegis iterator methods reuse a single internal flyweight cursor across iterations. **Zero objects are created on the V8 heap during loops.**

```typescript
// forEach iteration
list.forEach((order, index) => {
  console.log(`Order #${index}: ${order.symbol} at $${order.price}`);
});

// find: returns cursor mounted to matching record, or null
const found = list.find(order => order.id === 42);
if (found) {
  console.log(`Found order: $${found.price}`);
}

// reduce: aggregate values without allocating objects
const totalVolume = list.reduce((acc, order) => acc + order.price, 0);
```

---

## In-Place Dual-Pivot Sorting

`AegisList` provides an ultra-fast in-place quicksort that sorts records directly in binary memory by swapping 64-byte chunks without creating JavaScript wrappers:

```typescript
// Sort descending by price
list.sortBy('price', 'desc');

// Sort ascending by ID
list.sortBy('id', 'asc');
```

---

## Hardware Math Accelerators

Skip JavaScript loops entirely for numerical aggregations. These methods scan the underlying binary buffer directly:

```typescript
const sum = list.sum('price');
const avg = list.average('price');
const minimum = list.min('price');
const maximum = list.max('price');
const count = list.countWhere(order => order.price > 100);
```

---

## Serialization & Snapshotting

Convert to and from plain JSON arrays when interoperating with external services:

```typescript
// Export to plain JavaScript array
const plainArray = list.toJSON();

// Populate list from plain array
list.fromJSON([
  { id: 10, price: 50.0, symbol: 'TSLA' },
  { id: 11, price: 75.5, symbol: 'AMZN' },
]);
```
