/**
 * Offline operation queue - stores failed writes and retries when online
 */

import { storageSetItem, storageGetItem, storageRemoveItem } from "@/utils/storage";

interface QueuedOperation {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = "inhust_offline_queue";

async function getQueue(): Promise<QueuedOperation[]> {
  try {
    const raw = await storageGetItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedOperation[]): Promise<void> {
  try {
    await storageSetItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export async function enqueueOperation(type: string, payload: Record<string, unknown>): Promise<void> {
  const queue = await getQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    timestamp: Date.now(),
  });
  await saveQueue(queue);
}

export async function dequeueOperation(id: string): Promise<void> {
  const queue = (await getQueue()).filter((op) => op.id !== id);
  await saveQueue(queue);
}

export async function getPendingOperations(): Promise<QueuedOperation[]> {
  return await getQueue();
}

export async function clearQueue(): Promise<void> {
  await storageRemoveItem(QUEUE_KEY);
}

export async function getQueueSize(): Promise<number> {
  return (await getQueue()).length;
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
  const queue = await getQueue();
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
      await dequeueOperation(op.id);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}
