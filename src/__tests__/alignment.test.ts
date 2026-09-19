import test from 'node:test';
import assert from 'node:assert/strict';
import { struct } from '../types/struct.js';
import { uint16, uint32, float64, boolean, fixedString } from '../types/primitives.js';

test('Aegis Struct: 64-byte silicon cache line alignment', () => {
  const Trade = struct({
    orderId: uint32,   // 4 bytes (offset 0)
    symbolId: uint16,  // 2 bytes (offset 4)
    price: float64,    // 8 bytes (offset 8, naturally aligned)
    quantity: uint32,  // 4 bytes (offset 16)
    filled: boolean    // 1 byte  (offset 20)
  });

  // Total raw size = 21 bytes
  assert.equal(Trade.rawSize, 21);
  // Stride must be strictly padded to 64 bytes
  assert.equal(Trade.stride, 64);
  // Padding bytes = 64 - 21 = 43 bytes
  assert.equal(Trade.paddingBytes, 43);

  // Field offsets
  assert.equal(Trade.fields[0].offset, 0);
  assert.equal(Trade.fields[1].offset, 4);
  assert.equal(Trade.fields[2].offset, 8); // Aligned to 8-byte boundary
  assert.equal(Trade.fields[3].offset, 16);
  assert.equal(Trade.fields[4].offset, 20);
});

test('Aegis Struct: Multi-cache line scaling for large structs', () => {
  const HeavyRecord = struct({
    id: uint32,
    name: fixedString(60), // 4 + 60 = 64 bytes raw
    active: boolean        // + 1 byte = 65 bytes raw
  });

  assert.equal(HeavyRecord.rawSize, 65);
  // Must snap to next 64-byte multiple: 128 bytes (2 cache lines)
  assert.equal(HeavyRecord.stride, 128);
  assert.equal(HeavyRecord.paddingBytes, 63);
});
