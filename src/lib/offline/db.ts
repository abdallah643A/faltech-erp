/**
 * Offline IndexedDB store — shared cache + outbox for every mobile module.
 * Uses native IndexedDB (no extra deps) with a tiny promise wrapper.
 *
 * Stores:
 *   - cache:    namespaced read cache, keyed by `${module}:${entity}:${id}`.
 *   - outbox:   queued mutations awaiting sync (one per client_op_id).
 *   - meta:     small kv (deviceId, lastSync timestamps, etc.)
 */

const DB_NAME = "lov_mobile_offline";
const DB_VERSION = 1;

export type SyncOperation = "insert" | "update" | "delete";
export type SyncStatus =
  | "pending"
  | "syncing"
  | "applied"
  | "conflict"
  | "failed"
  | "superseded";

export interface OutboxItem {
  client_op_id: string;
  module: string;
  entity: string;
  entity_id?: string | null;
  operation: SyncOperation;
  payload: Record<string, any>;
  base_version?: string | null; // ISO of last known server updated_at
  status: SyncStatus;
  attempts: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CacheItem {
  key: string; // `${module}:${entity}:${id}`
  module: string;
  entity: string;
  id: string;
  data: any;
  cached_at: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache")) {
        const s = db.createObjectStore("cache", { keyPath: "key" });
        s.createIndex("by_entity", ["module", "entity"], { unique: false });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        const s = db.createObjectStore("outbox", { keyPath: "client_op_id" });
        s.createIndex("by_status", "status", { unique: false });
        s.createIndex("by_module", "module", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const req = fn(s) as IDBRequest<T>;
        if ((req as any)?.onsuccess !== undefined) {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } else {
          (req as any).then(resolve, reject);
        }
      }),
  );
}

// ---------- meta ------------------------------------------------------------

export async function metaGet<T = any>(key: string): Promise<T | undefined> {
  const row = await tx<{ key: string; value: T } | undefined>(
    "meta",
    "readonly",
    (s) => s.get(key),
  );
  return row?.value;
}

export async function metaSet(key: string, value: any) {
  await tx("meta", "readwrite", (s) => s.put({ key, value }));
}

export async function getDeviceId(): Promise<string> {
  let id = await metaGet<string>("device_id");
  if (!id) {
    id = `dev_${crypto.randomUUID()}`;
    await metaSet("device_id", id);
  }
  return id;
}

// ---------- cache -----------------------------------------------------------

export async function cachePut(
  module: string,
  entity: string,
  id: string,
  data: any,
) {
  const item: CacheItem = {
    key: `${module}:${entity}:${id}`,
    module,
    entity,
    id,
    data,
    cached_at: new Date().toISOString(),
  };
  await tx("cache", "readwrite", (s) => s.put(item));
}

export async function cachePutMany(
  module: string,
  entity: string,
  rows: Array<{ id: string; [k: string]: any }>,
) {
  const db = await open();
  const t = db.transaction("cache", "readwrite");
  const s = t.objectStore("cache");
  for (const row of rows) {
    s.put({
      key: `${module}:${entity}:${row.id}`,
      module,
      entity,
      id: row.id,
      data: row,
      cached_at: new Date().toISOString(),
    } as CacheItem);
  }
  return new Promise<void>((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

export async function cacheGet<T = any>(
  module: string,
  entity: string,
  id: string,
): Promise<T | undefined> {
  const row = await tx<CacheItem | undefined>("cache", "readonly", (s) =>
    s.get(`${module}:${entity}:${id}`),
  );
  return row?.data as T | undefined;
}

export async function cacheList<T = any>(
  module: string,
  entity: string,
): Promise<T[]> {
  return open().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const s = db.transaction("cache", "readonly").objectStore("cache");
        const idx = s.index("by_entity");
        const req = idx.getAll([module, entity]);
        req.onsuccess = () =>
          resolve((req.result as CacheItem[]).map((r) => r.data));
        req.onerror = () => reject(req.error);
      }),
  );
}

// ---------- outbox ----------------------------------------------------------

export async function outboxAdd(
  item: Omit<OutboxItem, "status" | "attempts" | "created_at" | "updated_at">,
) {
  const now = new Date().toISOString();
  const full: OutboxItem = {
    ...item,
    status: "pending",
    attempts: 0,
    created_at: now,
    updated_at: now,
  };
  await tx("outbox", "readwrite", (s) => s.put(full));
  return full;
}

export async function outboxUpdate(
  client_op_id: string,
  patch: Partial<OutboxItem>,
) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction("outbox", "readwrite");
    const s = t.objectStore("outbox");
    const g = s.get(client_op_id);
    g.onsuccess = () => {
      const cur = g.result as OutboxItem | undefined;
      if (!cur) return resolve();
      s.put({ ...cur, ...patch, updated_at: new Date().toISOString() });
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function outboxList(status?: SyncStatus): Promise<OutboxItem[]> {
  const db = await open();
  return new Promise<OutboxItem[]>((resolve, reject) => {
    const s = db.transaction("outbox", "readonly").objectStore("outbox");
    const req = status ? s.index("by_status").getAll(status) : s.getAll();
    req.onsuccess = () => resolve(req.result as OutboxItem[]);
    req.onerror = () => reject(req.error);
  });
}

export async function outboxRemove(client_op_id: string) {
  await tx("outbox", "readwrite", (s) => s.delete(client_op_id));
}

export async function outboxCountPending(): Promise<number> {
  const db = await open();
  return new Promise<number>((resolve, reject) => {
    const s = db.transaction("outbox", "readonly").objectStore("outbox");
    const req = s.index("by_status").count("pending");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
