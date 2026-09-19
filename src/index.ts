import {
  uint8,
  int8,
  uint16,
  int16,
  uint32,
  int32,
  float32,
  float64,
  bigint64,
  biguint64,
  boolean,
  fixedString,
  fixedBytes,
  FieldDefinition
} from './types/primitives.js';

import { struct, StructDefinition, Infer, StructOptions, SchemaShape } from './types/struct.js';
import { Cursor } from './cursor/cursor.js';
import { AegisList, createList, ListOptions } from './collections/list.js';
import { AegisRingBuffer, createRingBuffer, RingBufferOptions } from './collections/ring_buffer.js';
import { AegisMap, createMap, MapOptions } from './collections/map.js';
import { AegisPool, createPool, PoolOptions } from './collections/pool.js';
import { IO } from './io/serialization.js';
import { Threads } from './threads/workers.js';

export interface AegisPlugin {
  name: string;
  install: (aegis: any) => void;
}

const customTypesRegistry = new Map<string, FieldDefinition<any>>();

export const Aegis = {
  // Primitives
  uint8,
  int8,
  uint16,
  int16,
  uint32,
  int32,
  float32,
  float64,
  bigint64,
  biguint64,
  boolean,
  fixedString,
  fixedBytes,

  // Struct & Schema
  struct,

  // Collections
  createList,
  list: createList,
  createRingBuffer,
  ringBuffer: createRingBuffer,
  createMap,
  map: createMap,
  createPool,
  pool: createPool,

  // Subsystems
  IO,
  Threads,

  /**
   * Register a custom data type into the Aegis type system.
   */
  defineType<T>(name: string, definition: Omit<FieldDefinition<T>, 'name'>): FieldDefinition<T> {
    const fullDef: FieldDefinition<T> = {
      name,
      ...definition
    };
    customTypesRegistry.set(name, fullDef);
    return fullDef;
  },

  /**
   * Install an ecosystem plugin.
   */
  use(plugin: AegisPlugin): any {
    plugin.install(this);
    return this;
  }
};

// Direct named exports
export {
  uint8,
  int8,
  uint16,
  int16,
  uint32,
  int32,
  float32,
  float64,
  bigint64,
  biguint64,
  boolean,
  fixedString,
  fixedBytes,
  struct,
  StructDefinition,
  Infer,
  StructOptions,
  SchemaShape,
  Cursor,
  AegisList,
  createList,
  createList as list,
  ListOptions,
  AegisRingBuffer,
  createRingBuffer,
  createRingBuffer as ringBuffer,
  RingBufferOptions,
  AegisMap,
  createMap,
  createMap as map,
  MapOptions,
  AegisPool,
  createPool,
  createPool as pool,
  PoolOptions,
  IO,
  Threads
};

export default Aegis;
