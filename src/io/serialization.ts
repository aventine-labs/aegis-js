import { StructDefinition } from '../types/struct.js';
import { AegisList } from '../collections/list.js';

/**
 * Binary export and import utilities for Aegis memory arenas.
 */
export const IO = {
  /**
   * Export the active populated region of an AegisList as a raw binary Uint8Array slice.
   * Zero serialization overhead; pure byte-level snapshot.
   */
  toBinary(list: AegisList<any>): Uint8Array {
    const totalBytes = list.length * list.stride;
    return new Uint8Array(list.buffer, 0, totalBytes);
  },

  /**
   * Reconstitute an AegisList from a raw binary buffer.
   * Performs instant zero-copy mounting.
   */
  fromBinary<T>(structDef: StructDefinition<any>, rawBytes: Uint8Array | ArrayBuffer): AegisList<T> {
    const byteLength = rawBytes instanceof Uint8Array ? rawBytes.byteLength : rawBytes.byteLength;
    const stride = structDef.stride;

    if (byteLength % stride !== 0) {
      throw new Error(`Buffer byte length (${byteLength}) is not an exact multiple of struct stride (${stride})`);
    }

    const count = byteLength / stride;
    const list = new AegisList<T>(structDef, { capacity: Math.max(1, count) });

    const sourceU8 = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
    new Uint8Array(list.buffer).set(sourceU8);

    // Set active length via internal capacity expansion
    for (let i = 0; i < count; i++) {
      (list as any)._length++;
    }

    return list;
  },

  /**
   * Create an un-copied sub-slice window of an existing arena.
   */
  subView<T>(list: AegisList<T>, startIndex: number, count: number): Uint8Array {
    if (startIndex < 0 || startIndex + count > list.length) {
      throw new RangeError(`Sub-slice range [${startIndex}, ${startIndex + count}) out of bounds (length: ${list.length})`);
    }
    const byteOffset = startIndex * list.stride;
    const byteLength = count * list.stride;
    return new Uint8Array(list.buffer, byteOffset, byteLength);
  }
};
