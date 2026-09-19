import { StructDefinition } from '../types/struct.js';
import { Cursor } from '../cursor/cursor.js';

export interface PoolOptions {
  capacity: number;
  shared?: boolean;
}

/**
 * AegisPool: Zero-allocation memory slot pool.
 * Pre-allocates a fixed pool of records with sub-nanosecond alloc() and free() operations.
 * Ideal for game entities, network packet allocators, and short-lived transaction workers.
 */
export class AegisPool<T = any> {
  public readonly struct: StructDefinition<any>;
  private _buffer: ArrayBufferLike;
  private _cursor: Cursor<T>;
  private _freeIndices: Int32Array;
  private _freeTop: number;
  private _capacity: number;
  private _activeCount: number = 0;

  constructor(structDef: StructDefinition<any>, options: PoolOptions) {
    this.struct = structDef;
    this._capacity = options.capacity;

    const totalBytes = this._capacity * structDef.stride;
    this._buffer = options.shared ? new SharedArrayBuffer(totalBytes) : new ArrayBuffer(totalBytes);
    this._cursor = new Cursor<T>(structDef, this._buffer, 0);

    // Free stack initialized with all slot indices
    this._freeIndices = new Int32Array(this._capacity);
    for (let i = 0; i < this._capacity; i++) {
      this._freeIndices[i] = i;
    }
    this._freeTop = this._capacity; // Pointer to top of free stack
  }

  public get capacity(): number {
    return this._capacity;
  }

  public get activeCount(): number {
    return this._activeCount;
  }

  public get availableCount(): number {
    return this._freeTop;
  }

  /**
   * Allocate a slot from the pool.
   * Returns slot index (0 to capacity-1) or -1 if pool is exhausted.
   */
  public alloc(): number {
    if (this._freeTop <= 0) {
      return -1; // Pool exhausted
    }
    this._freeTop--;
    const slotIndex = this._freeIndices[this._freeTop];
    this._activeCount++;
    return slotIndex;
  }

  /**
   * Release a slot back to the pool in O(1) time.
   */
  public free(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this._capacity) {
      return false;
    }
    this._freeIndices[this._freeTop] = slotIndex;
    this._freeTop++;
    this._activeCount--;
    return true;
  }

  /**
   * Access an allocated slot by index with the Flyweight Cursor.
   */
  public get(slotIndex: number): T {
    if (slotIndex < 0 || slotIndex >= this._capacity) {
      throw new RangeError(`Slot index ${slotIndex} out of bounds (capacity: ${this._capacity})`);
    }
    return this._cursor.moveTo(slotIndex) as unknown as T;
  }

  public clear(): void {
    for (let i = 0; i < this._capacity; i++) {
      this._freeIndices[i] = i;
    }
    this._freeTop = this._capacity;
    this._activeCount = 0;
  }
}

export function createPool<T>(
  structDef: StructDefinition<any>,
  options: PoolOptions
): AegisPool<T> {
  return new AegisPool<T>(structDef, options);
}
