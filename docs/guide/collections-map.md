# AegisMap: Flat Open-Addressing Hash Table

`AegisMap<T>` is a high-speed, zero-allocation flat hash table using open addressing with linear probing and 32-bit FNV-1a hashing.

---

## Why Standard `Map` Causes Latency Spikes

JavaScript's native `new Map()` allocates node wrappers, hash buckets, and linked list entries on the V8 heap. As keys are inserted and deleted, hash buckets undergo rehashing and trigger garbage collection churn.

`AegisMap` eliminates this by storing all keys and record values in a single contiguous binary buffer.

---

## Creation

Specify the struct schema and choose which field acts as the primary key:

```typescript
import { Aegis, uint32, float64, fixedString } from '@aventine/aegis-js';

const UserSession = Aegis.struct({
  userId: uint32,
  token: fixedString(16),
  lastPing: float64,
});

// Create map keyed by userId with capacity for 50,000 sessions
const sessionMap = Aegis.map(UserSession, { 
  capacity: 50_000, 
  keyField: 'userId' 
});
```

---

## Operations

### Setting Entries
```typescript
sessionMap.set(1001, {
  userId: 1001,
  token: 'AUTH-TOKEN-A1B2',
  lastPing: Date.now(),
});
```

### Retrieving with Flyweight Cursor
`get()` returns an `AegisCursor<T>` mounted directly to the record's slot in the hash table, enabling sub-nanosecond lookups and in-place updates:

```typescript
const session = sessionMap.get(1001);
if (session) {
  console.log(`User 1001 Token: ${session.token}`);
  
  // Mutate in place with zero allocation
  session.lastPing = Date.now();
}
```

### Checking Existence & Deleting
```typescript
if (sessionMap.has(1001)) {
  sessionMap.delete(1001);
}

console.log(`Active sessions: ${sessionMap.size}`);
```

### Iterating Over Keys & Values
Iterate over all active entries without creating temporary key/value tuples:

```typescript
sessionMap.forEach((session, key) => {
  console.log(`Active session for user ${key}: ${session.token}`);
});
```
