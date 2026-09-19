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
