# pixel-cart

Tiny in-memory shopping cart with pluggable persistence.

```js
import { Cart } from 'pixel-cart';

const cart = new Cart('session-1');
cart.add({ sku: 'tee', price: 1900, qty: 2 });
cart.total(); // 3800
```
