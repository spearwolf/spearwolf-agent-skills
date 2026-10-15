import type { WorkerMessage } from '../../shared/src/types';

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  // draw e.data.entities onto the OffscreenCanvas
};
