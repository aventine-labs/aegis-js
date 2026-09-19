import { StructDefinition } from '../types/struct.js';
import { Cursor } from '../cursor/cursor.js';

export interface MapOptions {
  capacity: number; // Max slots, rounded to power of 2
  keyField: string; // Struct field name to use as key
  shared?: boolean;
}

/**
 * Fast 32-bit FNV-1a hash function for strings and numbers.
 */
export function fnv1a(input: string | number): number {
  let hash = 0x811c9dc5;
  if (typeof input === 'number') {
    hash ^= (input & 0xff);
    hash = Math.imul(hash, 0x01000193);
    hash ^= ((input >> 8) & 0xff);
    hash = Math.imul(hash, 0x01000193);
    hash ^= ((input >> 16) & 0xff);
    hash = Math.imul(hash, 0x01000193);
    hash ^= ((input >> 24) & 0xff);
    hash = Math.imul(hash, 0x01000193);
  } else {
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return hash >>> 0;
}

/**
 * AegisMap: High-speed open-addressing flat hash table stored in a contiguous ArrayBuffer.
 * Zero pointer indirection and zero GC churn.
 */
export class AegisMap<T = any> {
  public readonly struct: StructDefinition<any>;
  private _buffer: ArrayBufferLike;
  private _occupiedBuffer: Uint8Array; // 1 byte per slot: 0=empty, 1=occupied
  private _cursor: Cursor<T>;
  private _capacity: number;
  private _mask: number;
  private _size: number = 0;
  private _keyField: string;

  constructor(structDef: StructDefinition<any>, options: MapOptions) {
    this.struct = structDef;
    this._keyField = options.keyField;

    if (!structDef.fieldMap.has(this._keyField)) {
      throw new Error(`Key field '${this._keyField}' not found in struct definition`);
    }

    // Capacity must be power of 2
    let cap = 1;
    while (cap < options.capacity) {
      cap <<= 1;
    }
    this._capacity = cap;
    this._mask = cap - 1;

    const totalBytes = this._capacity * structDef.stride;
    this._buffer = options.shared ? new SharedArrayBuffer(totalBytes) : new ArrayBuffer(totalBytes);
    this._occupiedBuffer = new Uint8Array(this._capacity);
    this._cursor = new Cursor<T>(structDef, this._buffer, 0);
  }

  public get size(): number {
    return this._size;
  }

  public get capacity(): number {
    return this._capacity;
  }

  public set(key: string | number, value: Partial<T>): boolean {
    if (this._size >= (this._capacity * 0.75)) {
      throw new Error(`AegisMap reached 75% load factor (${this._size}/${this._capacity}). Resize required.`);
    }

    let slot = fnv1a(key) & this._mask;
    const c = this._cursor;

    while (this._occupiedBuffer[slot] === 1) {
      // Check if existing slot matches key
      c.moveTo(slot);
      if ((c as any)[this._keyField] === key) {
        c.copyFrom(value);
        (c as any)[this._keyField] = key;
        return true;
      }
      slot = (slot + 1) & this._mask; // Linear probing
    }

    // Found empty slot
    this._occupiedBuffer[slot] = 1;
    c.moveTo(slot).copyFrom(value);
    (c as any)[this._keyField] = key;
    this._size++;
    return true;
  }

  public get(key: string | number): T | null {
    let slot = fnv1a(key) & this._mask;
    let probes = 0;
    const c = this._cursor;

    while (probes < this._capacity) {
      if (this._occupiedBuffer[slot] === 0) {
        return null; // Key not present
      }
      c.moveTo(slot);
      if ((c as any)[this._keyField] === key) {
        return c as unknown as T;
      }
      slot = (slot + 1) & this._mask;
      probes++;
    }
    return null;
  }

  public has(key: string | number): boolean {
    return this.get(key) !== null;
  }

  public delete(key: string | number): boolean {
    let slot = fnv1a(key) & this._mask;
    let probes = 0;
    const c = this._cursor;

    while (probes < this._capacity) {
      if (this._occupiedBuffer[slot] === 0) {
        return false;
      }
      c.moveTo(slot);
      if ((c as any)[this._keyField] === key) {
        this._occupiedBuffer[slot] = 0;
        this._size--;
        return true;
      }
      slot = (slot + 1) & this._mask;
      probes++;
    }
    return false;
  }

  public clear(): void {
    this._occupiedBuffer.fill(0);
    this._size = 0;
  }
}

export function createMap<T>(
  structDef: StructDefinition<any>,
  options: MapOptions
): AegisMap<T> {
  return new AegisMap<T>(structDef, options);
}
