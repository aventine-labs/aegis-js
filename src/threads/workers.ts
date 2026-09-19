/**
 * Threading, Web Workers, and Atomics utilities for Aegis.js.
 */
export const Threads = {
  /**
   * Helper to format postMessage transfer options for zero-copy buffer handoff.
   */
  transferable(buffer: ArrayBuffer): [ArrayBuffer, Transferable[]] {
    return [buffer, [buffer]];
  },

  /**
   * Atomic operations on 32-bit integer fields across threads.
   */
  atomics: {
    add(buffer: SharedArrayBuffer, byteOffset: number, value: number): number {
      const i32 = new Int32Array(buffer, byteOffset, 1);
      return Atomics.add(i32, 0, value);
    },
    sub(buffer: SharedArrayBuffer, byteOffset: number, value: number): number {
      const i32 = new Int32Array(buffer, byteOffset, 1);
      return Atomics.sub(i32, 0, value);
    },
    load(buffer: SharedArrayBuffer, byteOffset: number): number {
      const i32 = new Int32Array(buffer, byteOffset, 1);
      return Atomics.load(i32, 0);
    },
    store(buffer: SharedArrayBuffer, byteOffset: number, value: number): number {
      const i32 = new Int32Array(buffer, byteOffset, 1);
      return Atomics.store(i32, 0, value);
    },
    compareExchange(
      buffer: SharedArrayBuffer,
      byteOffset: number,
      expected: number,
      replacement: number
    ): number {
      const i32 = new Int32Array(buffer, byteOffset, 1);
      return Atomics.compareExchange(i32, 0, expected, replacement);
    }
  }
};
