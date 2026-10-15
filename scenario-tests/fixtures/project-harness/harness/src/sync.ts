import { loadAll } from './core';
import { exportCsv } from './export';

export async function sync(endpoint: string): Promise<void> {
  await fetch(endpoint, { method: 'POST', body: exportCsv(loadAll()) });
}
