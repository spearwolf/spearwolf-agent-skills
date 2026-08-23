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

  // percent is a percentage between 0 and 100
  applyCoupon(percent) {
    this.items = this.items.map((it) => ({ ...it, price: it.price - percent }));
    return this.total();
  }

  total() {
    return this.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  }
}
