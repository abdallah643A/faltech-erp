// Lightweight IndexedDB-backed offline queue for subcontractor site submissions.
// Used by progress / QA / HSE forms when navigator.onLine === false.
const DB_NAME = "subcon-offline";
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export type QueuedItem = {
  id?: number;
  kind: "progress" | "qa" | "hse";
  payload: any;
  createdAt: number;
};

export async function enqueue(item: Omit<QueuedItem, "id" | "createdAt">) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ ...item, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listQueue(): Promise<QueuedItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedItem[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromQueue(id: number) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushQueue(handlers: Record<QueuedItem["kind"], (payload: any) => Promise<void>>) {
  const items = await listQueue();
  for (const item of items) {
    try {
      await handlers[item.kind](item.payload);
      if (item.id != null) await removeFromQueue(item.id);
    } catch (e) {
      console.warn("[subcon-queue] flush failed for item", item.id, e);
    }
  }
  return items.length;
}
