/**
 * Silicon primitive types and binary field encoders for Aegis.js.
 * Strictly maps JavaScript types to fixed-width binary representations.
 */

export interface FieldDefinition<T = any> {
  name: string;
  byteLength: number;
  alignment: number;
  getter: (view: DataView, offset: number, buffer: ArrayBufferLike) => T;
  setter: (view: DataView, offset: number, value: T, buffer: ArrayBufferLike) => void;
  _typeBrand?: T;
}

export type PrimitiveTypeCreator<T> = (name?: string) => FieldDefinition<T>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

export const uint8: FieldDefinition<number> = {
  name: 'uint8',
  byteLength: 1,
  alignment: 1,
  getter: (v, o) => v.getUint8(o),
  setter: (v, o, val) => v.setUint8(o, val)
};

export const int8: FieldDefinition<number> = {
  name: 'int8',
  byteLength: 1,
  alignment: 1,
  getter: (v, o) => v.getInt8(o),
  setter: (v, o, val) => v.setInt8(o, val)
};

export const uint16: FieldDefinition<number> = {
  name: 'uint16',
  byteLength: 2,
  alignment: 2,
  getter: (v, o) => v.getUint16(o, true),
  setter: (v, o, val) => v.setUint16(o, val, true)
};

export const int16: FieldDefinition<number> = {
  name: 'int16',
  byteLength: 2,
  alignment: 2,
  getter: (v, o) => v.getInt16(o, true),
  setter: (v, o, val) => v.setInt16(o, val, true)
};

export const uint32: FieldDefinition<number> = {
  name: 'uint32',
  byteLength: 4,
  alignment: 4,
  getter: (v, o) => v.getUint32(o, true),
  setter: (v, o, val) => v.setUint32(o, val, true)
};

export const int32: FieldDefinition<number> = {
  name: 'int32',
  byteLength: 4,
  alignment: 4,
  getter: (v, o) => v.getInt32(o, true),
  setter: (v, o, val) => v.setInt32(o, val, true)
};

export const float32: FieldDefinition<number> = {
  name: 'float32',
  byteLength: 4,
  alignment: 4,
  getter: (v, o) => v.getFloat32(o, true),
  setter: (v, o, val) => v.setFloat32(o, val, true)
};

export const float64: FieldDefinition<number> = {
  name: 'float64',
  byteLength: 8,
  alignment: 8,
  getter: (v, o) => v.getFloat64(o, true),
  setter: (v, o, val) => v.setFloat64(o, val, true)
};

export const bigint64: FieldDefinition<bigint> = {
  name: 'bigint64',
  byteLength: 8,
  alignment: 8,
  getter: (v, o) => v.getBigInt64(o, true),
  setter: (v, o, val) => v.setBigInt64(o, val, true)
};

export const biguint64: FieldDefinition<bigint> = {
  name: 'biguint64',
  byteLength: 8,
  alignment: 8,
  getter: (v, o) => v.getBigUint64(o, true),
  setter: (v, o, val) => v.setBigUint64(o, val, true)
};

export const boolean: FieldDefinition<boolean> = {
  name: 'boolean',
  byteLength: 1,
  alignment: 1,
  getter: (v, o) => v.getUint8(o) !== 0,
  setter: (v, o, val) => v.setUint8(o, val ? 1 : 0)
};

/**
 * Fixed-width UTF-8 encoded string field. Zero dynamic heap allocation on write.
 * Automatically handles null-termination and bounded reading.
 */
export function fixedString(bytes: number): FieldDefinition<string> {
  if (bytes <= 0) throw new Error('fixedString length must be greater than 0');
  return {
    name: `fixedString[${bytes}]`,
    byteLength: bytes,
    alignment: 1,
    getter: (_v, offset, buffer) => {
      const u8 = new Uint8Array(buffer, offset, bytes);
      let len = 0;
      while (len < bytes && u8[len] !== 0) len++;
      return textDecoder.decode(u8.subarray(0, len));
    },
    setter: (_v, offset, val, buffer) => {
      const u8 = new Uint8Array(buffer, offset, bytes);
      u8.fill(0);
      const encoded = textEncoder.encode(val);
      const writeLen = Math.min(encoded.length, bytes);
      u8.set(encoded.subarray(0, writeLen));
    }
  };
}

/**
 * Fixed-width raw binary buffer field.
 */
export function fixedBytes(bytes: number): FieldDefinition<Uint8Array> {
  if (bytes <= 0) throw new Error('fixedBytes length must be greater than 0');
  return {
    name: `fixedBytes[${bytes}]`,
    byteLength: bytes,
    alignment: 1,
    getter: (_v, offset, buffer) => {
      return new Uint8Array(buffer, offset, bytes);
    },
    setter: (_v, offset, val, buffer) => {
      const u8 = new Uint8Array(buffer, offset, bytes);
      u8.fill(0);
      const writeLen = Math.min(val.length, bytes);
      u8.set(val.subarray(0, writeLen));
    }
  };
}

// ============================================================================
// AEGIS v2.2 DETERMINISTIC FIXED-POINT DOMAIN TYPES & 128-BIT INTRINSICS
// ============================================================================

const I64_MIN = -9223372036854775808n;
const I64_MAX = 9223372036854775807n;

/**
 * CurrencyCents (i64, 8 bytes): Deterministic monetary value in integer cents.
 */
export const currencyCents: FieldDefinition<bigint> = {
  name: 'CurrencyCents',
  byteLength: 8,
  alignment: 8,
  getter: (v, o) => v.getBigInt64(o, true),
  setter: (v, o, val) => v.setBigInt64(o, BigInt(val), true)
};

/**
 * BasisPoints (i32, 4 bytes): Deterministic rate in integer basis points (10,000 bps = 100%).
 */
export const basisPoints: FieldDefinition<number> = {
  name: 'BasisPoints',
  byteLength: 4,
  alignment: 4,
  getter: (v, o) => v.getInt32(o, true),
  setter: (v, o, val) => v.setInt32(o, Number(val) | 0, true)
};

/**
 * PriceTicks (i64, 8 bytes): Deterministic order-book price in integer ticks.
 */
export const priceTicks: FieldDefinition<bigint> = {
  name: 'PriceTicks',
  byteLength: 8,
  alignment: 8,
  getter: (v, o) => v.getBigInt64(o, true),
  setter: (v, o, val) => v.setBigInt64(o, BigInt(val), true)
};

/**
 * QuantityLots (i64, 8 bytes): Deterministic order-book quantity in integer lots.
 */
export const quantityLots: FieldDefinition<bigint> = {
  name: 'QuantityLots',
  byteLength: 8,
  alignment: 8,
  getter: (v, o) => v.getBigInt64(o, true),
  setter: (v, o, val) => v.setBigInt64(o, BigInt(val), true)
};

/**
 * TimestampNs (u64, 8 bytes): Deterministic nanosecond monotonic timestamp.
 */
export const timestampNs: FieldDefinition<bigint> = {
  name: 'TimestampNs',
  byteLength: 8,
  alignment: 8,
  getter: (v, o) => v.getBigUint64(o, true),
  setter: (v, o, val) => v.setBigUint64(o, BigInt(val), true)
};

/**
 * DurationNs (i64, 8 bytes): Deterministic signed nanosecond duration.
 */
export const durationNs: FieldDefinition<bigint> = {
  name: 'DurationNs',
  byteLength: 8,
  alignment: 8,
  getter: (v, o) => v.getBigInt64(o, true),
  setter: (v, o, val) => v.setBigInt64(o, BigInt(val), true)
};

/**
 * Checked 128-bit intermediate multiply-divide: `(a * b) / d` truncated toward zero.
 * Matches Aegis v2.2 `mul_div_i64(a, b, d)` with deterministic `AEGIS_TRAP_DIV_BY_ZERO`
 * and `AEGIS_TRAP_INT_OVERFLOW` traps.
 */
export function mulDivI64(a: bigint | number, b: bigint | number, d: bigint | number): bigint {
  const ba = BigInt(a);
  const bb = BigInt(b);
  const bd = BigInt(d);
  if (bd === 0n) {
    const err = new Error('AEGIS_TRAP_DIV_BY_ZERO: mulDivI64 divisor is 0');
    (err as any).trapCode = 'AEGIS_TRAP_DIV_BY_ZERO';
    (err as any).code = 'AEGIS_TRAP_DIV_BY_ZERO';
    throw err;
  }
  const q = (ba * bb) / bd;
  if (q < I64_MIN || q > I64_MAX) {
    const err = new Error('AEGIS_TRAP_INT_OVERFLOW: mulDivI64 quotient overflows i64');
    (err as any).trapCode = 'AEGIS_TRAP_INT_OVERFLOW';
    (err as any).code = 'AEGIS_TRAP_INT_OVERFLOW';
    throw err;
  }
  return q;
}

/**
 * Checked 128-bit intermediate rounded multiply-divide: `round_half_up((a * b) / d)`.
 * Matches Aegis v2.2 `mul_div_round_i64(a, b, d)` with deterministic trap semantics.
 */
export function mulDivRoundI64(a: bigint | number, b: bigint | number, d: bigint | number): bigint {
  const ba = BigInt(a);
  const bb = BigInt(b);
  const bd = BigInt(d);
  if (bd === 0n) {
    const err = new Error('AEGIS_TRAP_DIV_BY_ZERO: mulDivRoundI64 divisor is 0');
    (err as any).trapCode = 'AEGIS_TRAP_DIV_BY_ZERO';
    (err as any).code = 'AEGIS_TRAP_DIV_BY_ZERO';
    throw err;
  }
  const prod = ba * bb;
  const absD = bd < 0n ? -bd : bd;
  const half = absD / 2n;
  const sameSign = (prod >= 0n && bd > 0n) || (prod < 0n && bd < 0n);
  const adj = bd > 0n ? (sameSign ? half : -half) : (sameSign ? -half : half);
  const q = (prod + adj) / bd;
  if (q < I64_MIN || q > I64_MAX) {
    const err = new Error('AEGIS_TRAP_INT_OVERFLOW: mulDivRoundI64 quotient overflows i64');
    (err as any).trapCode = 'AEGIS_TRAP_INT_OVERFLOW';
    (err as any).code = 'AEGIS_TRAP_INT_OVERFLOW';
    throw err;
  }
  return q;
}

