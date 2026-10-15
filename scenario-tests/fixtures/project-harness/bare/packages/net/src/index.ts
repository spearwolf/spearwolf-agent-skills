import type { Entity } from '../../shared/src/types';

export function connect(url: string, onEntities: (es: Entity[]) => void): WebSocket {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => onEntities(JSON.parse(e.data));
  return ws;
}
