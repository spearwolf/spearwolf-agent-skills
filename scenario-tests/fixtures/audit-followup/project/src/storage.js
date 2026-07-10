import { writeFile, readFile } from 'node:fs/promises';

export async function saveCart(key, items) {
  await writeFile(`.cart-${key}.json`, JSON.stringify(items));
}

export async function loadCart(key) {
  const raw = await readFile(`.cart-${key}.json`, 'utf8');
  return JSON.parse(raw);
}
