export interface Measurement {
  id: number;
  createdAt: string;
  value: number;
}

const store = new Map<number, Measurement>();

export function save(m: Measurement): void {
  store.set(m.id, m);
}

export function loadAll(): Measurement[] {
  return [...store.values()];
}
