export function parseConfig(raw) {
  return JSON.parse(raw);
}

export function formatPrice(cents) {
  return (cents / 100).toFixed(2) + ' EUR';
}
