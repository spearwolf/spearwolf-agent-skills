import { test } from 'node:test';
import assert from 'node:assert';
import { Cart } from '../src/cart.js';

test('total sums price * qty', () => {
  const cart = new Cart('t1');
  cart.add({ sku: 'a', price: 100, qty: 2 });
  cart.add({ sku: 'b', price: 50, qty: 1 });
  assert.equal(cart.total(), 250);
});

test('remove drops the matching sku', () => {
  const cart = new Cart('t2');
  cart.add({ sku: 'a', price: 100, qty: 1 });
  cart.add({ sku: 'b', price: 50, qty: 1 });
  cart.remove('a');
  assert.equal(cart.total(), 50);
});
