import { saveCart } from './storage.js';

export class Cart {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.items = [];
  }

  add(item) {
    this.items.push(item);
    saveCart(this.storageKey, this.items);
  }

  remove(sku) {
    this.items = this.items.filter((it) => it.sku !== sku);
    saveCart(this.storageKey, this.items);
  }

  total() {
    return this.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  }
}
