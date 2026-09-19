import { FieldDefinition } from './primitives.js';

export type SchemaShape = Record<string, FieldDefinition<any>>;

export type Infer<T extends StructDefinition<any>> = T extends StructDefinition<infer S> ? S : never;

export interface CompiledField {
  name: string;
  offset: number;
  byteLength: number;
  alignment: number;
  getter: (view: DataView, offset: number, buffer: ArrayBufferLike) => any;
  setter: (view: DataView, offset: number, value: any, buffer: ArrayBufferLike) => void;
}

export interface StructOptions {
  alignment?: number; // Default: 64 (Silicon CPU cache line)
}

export class StructDefinition<T extends Record<string, any> = Record<string, any>> {
  public readonly shape: SchemaShape;
  public readonly fields: CompiledField[] = [];
  public readonly fieldMap: Map<string, CompiledField> = new Map();
  public readonly rawSize: number;
  public readonly stride: number;
  public readonly paddingBytes: number;
  public readonly alignment: number;
  private customMethods: Record<string, Function> = {};

  constructor(shape: SchemaShape, options: StructOptions = {}) {
    this.shape = shape;
    this.alignment = options.alignment ?? 64;

    let currentOffset = 0;

    // Compile fields with natural alignment packing
    for (const [name, def] of Object.entries(shape)) {
      // Align offset to field natural alignment
      const align = def.alignment;
      if (align > 1) {
        const remainder = currentOffset % align;
        if (remainder !== 0) {
          currentOffset += (align - remainder);
        }
      }

      const compiled: CompiledField = {
        name,
        offset: currentOffset,
        byteLength: def.byteLength,
        alignment: def.alignment,
        getter: def.getter,
        setter: def.setter
      };

      this.fields.push(compiled);
      this.fieldMap.set(name, compiled);
      currentOffset += def.byteLength;
    }

    this.rawSize = currentOffset;

    // Pad struct stride to 64-byte silicon cache line boundary
    if (this.alignment > 0) {
      const remainder = this.rawSize % this.alignment;
      this.paddingBytes = remainder === 0 ? 0 : (this.alignment - remainder);
    } else {
      this.paddingBytes = 0;
    }

    this.stride = this.rawSize + this.paddingBytes;
  }

  public get size(): number {
    return this.rawSize;
  }

  /**
   * Attach custom domain methods to the record cursor prototype.
   * Runs with zero allocation overhead during loops.
   */
  public methods<M extends Record<string, (this: T & M, ...args: any[]) => any>>(
    methodsDict: M
  ): StructDefinition<T & M> {
    const clone = new StructDefinition<T & M>(this.shape, { alignment: this.alignment });
    clone.customMethods = { ...this.customMethods, ...methodsDict };
    return clone;
  }

  public getCustomMethods(): Record<string, Function> {
    return this.customMethods;
  }
}

/**
 * Define an Aegis silicon struct with 64-byte cache line alignment.
 */
export function struct<S extends SchemaShape, M extends Record<string, (cursor: any, ...args: any[]) => any> = {}>(
  shape: S,
  optionsOrMethods?: StructOptions | M,
  methodsDict?: M
): StructDefinition<{ [K in keyof S]: S[K]['_typeBrand'] extends infer U ? U : any } & M> {
  let options: StructOptions = {};
  let methods: any = {};

  if (optionsOrMethods) {
    // Check if optionsOrMethods contains function methods
    const values = Object.values(optionsOrMethods);
    const hasFunctions = values.some(v => typeof v === 'function');
    if (hasFunctions) {
      methods = optionsOrMethods;
    } else {
      options = optionsOrMethods as StructOptions;
    }
  }

  if (methodsDict) {
    methods = { ...methods, ...methodsDict };
  }

  const def = new StructDefinition(shape, options);
  if (Object.keys(methods).length > 0) {
    return def.methods(methods) as any;
  }
  return def as any;
}
