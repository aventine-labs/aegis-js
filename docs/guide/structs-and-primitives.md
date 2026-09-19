# Primitives & Structs

Aegis.js provides a compile-time schema builder that mirrors low-level C struct declarations while providing full TypeScript type inference and runtime validation.

---

## Available Primitives

All primitives map directly to IEEE floating-point standards, signed/unsigned two's complement integers, boolean bitfields, or fixed-length byte arrays:

| Primitive | Byte Size | Alignment | TypeScript Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uint8` | 1 byte | 1 byte | `number` | Unsigned 8-bit integer (0 to 255) |
| `int8` | 1 byte | 1 byte | `number` | Signed 8-bit integer (-128 to 127) |
| `uint16` | 2 bytes | 2 bytes | `number` | Unsigned 16-bit integer (0 to 65,535) |
| `int16` | 2 bytes | 2 bytes | `number` | Signed 16-bit integer (-32,768 to 32,767) |
| `uint32` | 4 bytes | 4 bytes | `number` | Unsigned 32-bit integer (0 to 4,294,967,295) |
| `int32` | 4 bytes | 4 bytes | `number` | Signed 32-bit integer (-2,147,483,648 to 2,147,483,647) |
| `bigint64` | 8 bytes | 8 bytes | `bigint` | Signed 64-bit integer |
| `biguint64` | 8 bytes | 8 bytes | `bigint` | Unsigned 64-bit integer |
| `float32` | 4 bytes | 4 bytes | `number` | IEEE 754 single-precision float (32-bit) |
| `float64` | 8 bytes | 8 bytes | `number` | IEEE 754 double-precision float (64-bit) |
| `boolean` | 1 byte | 1 byte | `boolean` | Boolean flag (0 = false, 1 = true) |
| `fixedString(N)` | N bytes | 1 byte | `string` | Fixed-length UTF-8 / ASCII string |
| `fixedBytes(N)` | N bytes | 1 byte | `Uint8Array` | Fixed-length raw binary byte slice |

---

## Defining a Struct

Use `Aegis.struct({ ... })` to define a schema:

```typescript
import { 
  Aegis, 
  uint32, 
  float64, 
  boolean, 
  fixedString, 
  biguint64 
} from '@aventine/aegis-js';

export const TradeRecord = Aegis.struct({
  tradeId: biguint64,
  timestamp: biguint64,
  price: float64,
  quantity: uint32,
  isBuyerMaker: boolean,
  symbol: fixedString(8),
});
```

---

## Custom Domain Methods

You can attach custom computed properties and methods directly to your struct definition without increasing memory size:

```typescript
export const Position = Aegis.struct(
  {
    assetId: uint32,
    shares: float64,
    entryPrice: float64,
    currentPrice: float64,
  },
  {
    // Custom domain methods accessible on any cursor
    marketValue(cursor) {
      return cursor.shares * cursor.currentPrice;
    },
    unrealizedPnL(cursor) {
      return cursor.shares * (cursor.currentPrice - cursor.entryPrice);
    },
    returnOnInvestment(cursor) {
      return ((cursor.currentPrice - cursor.entryPrice) / cursor.entryPrice) * 100;
    },
  }
);
```

When you inspect a position with a cursor, you call these domain methods directly:

```typescript
const pos = positions.get(0);
console.log(`Market Value: $${pos.marketValue()}`);
console.log(`Unrealized PnL: $${pos.unrealizedPnL()}`);
console.log(`ROI: ${pos.returnOnInvestment().toFixed(2)}%`);
```

Zero heap allocation occurs. The methods execute against the existing cursor slider.
