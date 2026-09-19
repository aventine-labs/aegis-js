import { StructDefinition } from '../types/struct.js';
import { Cursor } from '../cursor/cursor.js';

export interface RingBufferOptions {
  capacity: number; // Rounded up to nearest power of 2 for fast bitmask arithmetic
  shared?: boolean;
  overwrite?: boolean;
}

/**
 * AegisRingBuffer: High-throughput circular FIFO ring buffer.
 * Ideal for audio processing, real-time WebSocket ingestion, and telemetry logging.
 * Zero memory allocations during enqueue and dequeue.
 */
export class AegisRingBuffer<T = any> {
  public readonly struct: StructDefinition<any>;
  private _buffer: ArrayBufferLike;
  private _cursor: Cursor<T>;
  private _capacity: number;
  private _mask: number;
  private _head: number = 0; // Write pointer
  private _tail: number = 0; // Read pointer
  private _count: number = 0;
  private _shared: boolean;
  private _overwrite: boolean;

  constructor(structDef: StructDefinition<any>, options: RingBufferOptions) {
    this.struct = structDef;
    this._shared = options.shared ?? false;
    this._overwrite = options.overwrite ?? false;

    // Round capacity to next power of 2
    let cap = 1;
    while (cap < options.capacity) {
      cap <<= 1;
    }
    this._capacity = cap;
    this._mask = cap - 1;

    const totalBytes = this._capacity * structDef.stride;
    this._buffer = this._shared ? new SharedArrayBuffer(totalBytes) : new ArrayBuffer(totalBytes);
    this._cursor = new Cursor<T>(structDef, this._buffer, 0);
  }

  public get capacity(): number {
    return this._capacity;
  }

  public get length(): number {
    return this._count;
  }

  public get isFull(): boolean {
    return this._count >= this._capacity;
  }

  public get isEmpty(): boolean {
    return this._count === 0;
  }

  public get buffer(): ArrayBufferLike {
    return this._buffer;
  }

  /**
   * Enqueue a new item into the ring buffer.
   * Returns false if the buffer is full (zero-allocation overflow rejection).
   */
  public enqueue(item: Partial<T> | Record<string, any>): boolean {
    if (this._count >= this._capacity) {
      return false; // Queue is full
    }
    const slot = this._head & this._mask;
    this._cursor.moveTo(slot).copyFrom(item);
    this._head++;
    this._count++;
    return true;
  }

  /**
   * Overwrite enqueue: If full, automatically overwrites the oldest element.
   * Essential for continuous real-time telemetry and sliding window logs.
   */
  public enqueueOverwrite(item: Partial<T> | Record<string, any>): void {
    if (this._count >= this._capacity) {
      this._tail++;
      this._count--;
    }
    const slot = this._head & this._mask;
    this._cursor.moveTo(slot).copyFrom(item);
    this._head++;
    this._count++;
  }

  /**
   * Dequeue the oldest item. Returns cursor pointing to the item, or null if empty.
   */
  public dequeue(): T | null {
    if (this._count === 0) {
      return null;
    }
    const slot = this._tail & this._mask;
    const item = this._cursor.moveTo(slot) as unknown as T;
    this._tail++;
    this._count--;
    return item;
  }

  /**
   * Push an item into the ring buffer.
   * If overwrite mode is enabled and the buffer is full, overwrites the oldest element.
   * Otherwise returns false when full.
   */
  public push(item: Partial<T> | Record<string, any>): boolean {
    if (this._overwrite) {
      this.enqueueOverwrite(item);
      return true;
    }
    return this.enqueue(item);
  }

  /**
   * Pop the oldest item. Returns cursor pointing to the item, or null if empty.
   */
  public pop(): T | null {
    return this.dequeue();
  }

  /**
   * Peek at the oldest item without removing it.
   */
  public peek(): T | null {
    if (this._count === 0) return null;
    const slot = this._tail & this._mask;
    return this._cursor.moveTo(slot) as unknown as T;
  }

  public clear(): void {
    this._head = 0;
    this._tail = 0;
    this._count = 0;
  }
}

export function createRingBuffer<T>(
  structDef: StructDefinition<any>,
  options: RingBufferOptions
): AegisRingBuffer<T> {
  return new AegisRingBuffer<T>(structDef, options);
}
