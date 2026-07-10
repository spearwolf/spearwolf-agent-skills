export class PricePoller {
  constructor(fetchPrices, intervalMs = 5000) {
    this.fetchPrices = fetchPrices;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  start(onUpdate) {
    this.timer = setInterval(async () => {
      const prices = await this.fetchPrices();
      onUpdate(prices);
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
