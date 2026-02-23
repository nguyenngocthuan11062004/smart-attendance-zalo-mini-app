/**
 * Offline operation queue - stores failed writes and retries when online
 */

interface QueuedOperation {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = "inhust_offline_queue";

function getQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function enqueueOperation(type: string, payload: Record<string, unknown>): void {
  const queue = getQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    timestamp: Date.now(),
  });
  saveQueue(queue);
}

export function dequeueOperation(id: string): void {
  const queue = getQueue().filter((op) => op.id !== id);
  saveQueue(queue);
}

export function getPendingOperations(): QueuedOperation[] {
  return getQueue();
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function getQueueSize(): number {
  return getQueue().length;
}

type OperationHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, OperationHandler>();

/**
 * Register a handler for processing queued operations of a given type.
 */
export function registerQueueHandler(type: string, handler: OperationHandler): void {
  handlers.set(type, handler);
}

/**
 * Process all pending offline operations.
 * Each successful operation is removed from the queue.
 * Failed operations remain for next retry.
 */
export async function processOfflineQueue(): Promise<{ processed: number; failed: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const op of queue) {
    const handler = handlers.get(op.type);
    if (!handler) {
      // No handler registered — skip but keep in queue
      failed++;
      continue;
    }
    try {
      await handler(op.payload);
      dequeueOperation(op.id);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}
