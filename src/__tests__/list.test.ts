import test from 'node:test';
import assert from 'node:assert/strict';
import { struct } from '../types/struct.js';
import { uint32, float64, boolean, fixedString } from '../types/primitives.js';
import { createList } from '../collections/list.js';

test('AegisList: CRUD and Flyweight Cursor mutation', () => {
  const OrderSchema = struct({
    id: uint32,
    price: float64,
    symbol: fixedString(8),
    active: boolean
  });

  const list = createList<any>(OrderSchema, { capacity: 100 });
  assert.equal(list.length, 0);

  // Push rows
  list.push({ id: 1, price: 100.5, symbol: 'AAPL', active: true });
  list.push({ id: 2, price: 250.0, symbol: 'TSLA', active: false });
  list.push({ id: 3, price: 75.25, symbol: 'MSFT', active: true });

  assert.equal(list.length, 3);

  // Read with Flyweight Cursor
  const item0 = list.get(0);
  assert.equal(item0.id, 1);
  assert.equal(item0.price, 100.5);
  assert.equal(item0.symbol, 'AAPL');
  assert.equal(item0.active, true);

  // Mutate through Cursor in-place
  item0.price = 105.0;
  assert.equal(list.get(0).price, 105.0);

  // Fast math
  assert.equal(list.sum('price'), 105.0 + 250.0 + 75.25);
  assert.equal(list.min('price'), 75.25);
  assert.equal(list.max('price'), 250.0);
  assert.equal(list.average('price'), (105.0 + 250.0 + 75.25) / 3);

  // Count where
  assert.equal(list.countWhere(r => r.active === true), 2);

  // In-place byte quicksort by price asc
  list.sortBy('price', 'asc');
  assert.equal(list.get(0).id, 3); // MSFT 75.25
  assert.equal(list.get(1).id, 1); // AAPL 105.0
  assert.equal(list.get(2).id, 2); // TSLA 250.0

  // In-place byte quicksort by price desc
  list.sortBy('price', 'desc');
  assert.equal(list.get(0).id, 2); // TSLA 250.0
  assert.equal(list.get(1).id, 1); // AAPL 105.0
  assert.equal(list.get(2).id, 3); // MSFT 75.25
});

test('AegisList: Custom domain methods on struct cursor', () => {
  const InvoiceSchema = struct({
    amount: float64,
    taxRate: float64
  }).methods({
    total(this: any) {
      return this.amount * (1 + this.taxRate);
    }
  });

  const invoices = createList<any>(InvoiceSchema, { capacity: 10 });
  invoices.push({ amount: 100, taxRate: 0.1 });
  invoices.push({ amount: 200, taxRate: 0.05 });

  assert.ok(Math.abs(invoices.get(0).total() - 110) < 1e-5);
  assert.ok(Math.abs(invoices.get(1).total() - 210) < 1e-5);
});
