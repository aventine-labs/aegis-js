import { StructDefinition, CompiledField } from '../types/struct.js';

/**
 * Flyweight Cursor: Reusable pointer slider that maps JavaScript property access
 * directly to raw typed buffer offsets with zero heap allocations.
 */
export class Cursor<T = any> {
  public _baseOffset: number = 0;
  public _view: DataView;
  public _buffer: ArrayBufferLike;
  public readonly _struct: StructDefinition<any>;
  public _index: number = 0;

  constructor(structDef: StructDefinition<any>, buffer: ArrayBufferLike, initialIndex: number = 0) {
    this._struct = structDef;
    this._buffer = buffer;
    this._view = new DataView(buffer);
    this.moveTo(initialIndex);

    // Bind property accessors directly to compiled field offsets
    for (const field of structDef.fields) {
      this.bindField(field);
    }

    // Bind custom domain methods (passes this as first argument and context)
    const methods = structDef.getCustomMethods();
    for (const [name, fn] of Object.entries(methods)) {
      (this as any)[name] = (...args: any[]) => fn.call(this, this, ...args);
    }
  }

  private bindField(field: CompiledField): void {
    Object.defineProperty(this, field.name, {
      enumerable: true,
      configurable: false,
      get: () => {
        return field.getter(this._view, this._baseOffset + field.offset, this._buffer);
      },
      set: (value: any) => {
        field.setter(this._view, this._baseOffset + field.offset, value, this._buffer);
      }
    });
  }

  /**
   * Fast slider: reposition cursor to target row index with zero allocation.
   */
  public moveTo(index: number): this {
    this._index = index;
    this._baseOffset = index * this._struct.stride;
    return this;
  }

  /**
   * Copy values from a plain JavaScript object or another cursor into the current row.
   */
  public copyFrom(source: Partial<T> | Record<string, any>): this {
    const src = source as Record<string, any>;
    for (const field of this._struct.fields) {
      if (src[field.name] !== undefined) {
        field.setter(this._view, this._baseOffset + field.offset, src[field.name], this._buffer);
      }
    }
    return this;
  }

  /**
   * Export the current row as a plain JavaScript POJO (allocates a new object).
   */
  public toObject(): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const field of this._struct.fields) {
      obj[field.name] = field.getter(this._view, this._baseOffset + field.offset, this._buffer);
    }
    return obj;
  }

  /**
   * Remount the cursor to a new or reallocated memory buffer.
   */
  public remount(newBuffer: ArrayBufferLike): void {
    this._buffer = newBuffer;
    this._view = new DataView(newBuffer);
  }
}
