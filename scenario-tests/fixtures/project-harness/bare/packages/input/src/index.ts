export type Command = { type: 'move'; dx: number; dy: number };

export function onKey(e: KeyboardEvent): Command | null {
  return e.key === 'ArrowLeft' ? { type: 'move', dx: -1, dy: 0 } : null;
}
