/**
 * IndexedDB-based offline storage for POS transactions
 * Handles local caching, queue management, and sync coordination
 */

const DB_NAME = 'pos_offline_db';
const DB_VERSION = 2;

interface OfflineTransaction {
  id: string;
  type: 'sale' | 'return' | 'void' | 'refund' | 'exchange';
  payload: any;
  timestamp: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  syncAttempts: number;
  lastSyncAttempt?: string;
  errorMessage?: string;
  hashChecksum?: string;
  deviceId?: string;
}

interface CachedProduct {
  itemCode: string;
  itemName: string;
  barcode?: string;
  price: number;
  taxCode?: string;
  taxPercent: number;
  category?: string;
  stockQuantity: number;
  unit?: string;
  imageUrl?: string;
  isActive: boolean;
  cacheVersion: number;
  lastServerSync?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        txStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: 'itemCode' });
        prodStore.createIndex('barcode', 'barcode', { unique: false });
        prodStore.createIndex('category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains('syncMeta')) {
        db.createObjectStore('syncMeta', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== Transaction Queue ==========

export async function saveOfflineTransaction(tx: OfflineTransaction): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readwrite');
    transaction.objectStore('transactions').put(tx);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getPendingTransactions(): Promise<OfflineTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readonly');
    const index = transaction.objectStore('transactions').index('syncStatus');
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getFailedTransactions(): Promise<OfflineTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readonly');
    const index = transaction.objectStore('transactions').index('syncStatus');
    const request = index.getAll('failed');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllOfflineTransactions(): Promise<OfflineTransaction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readonly');
    const request = transaction.objectStore('transactions').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateTransactionSyncStatus(
  id: string,
  status: OfflineTransaction['syncStatus'],
  errorMessage?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readwrite');
    const store = transaction.objectStore('transactions');
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const tx = getRequest.result;
      if (tx) {
        tx.syncStatus = status;
        tx.syncAttempts = (tx.syncAttempts || 0) + 1;
        tx.lastSyncAttempt = new Date().toISOString();
        if (errorMessage) tx.errorMessage = errorMessage;
        store.put(tx);
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearSyncedTransactions(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readwrite');
    const store = transaction.objectStore('transactions');
    const index = store.index('syncStatus');
    const request = index.openCursor('synced');
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ========== Product Cache ==========

export async function cacheProducts(products: CachedProduct[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('products', 'readwrite');
    const store = transaction.objectStore('products');
    products.forEach(p => store.put(p));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('products', 'readonly');
    const request = transaction.objectStore('products').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedProductByBarcode(barcode: string): Promise<CachedProduct | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('products', 'readonly');
    const index = transaction.objectStore('products').index('barcode');
    const request = index.get(barcode);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== Sync Metadata ==========

export async function setSyncMeta(key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncMeta', 'readwrite');
    transaction.objectStore('syncMeta').put({ key, value, updatedAt: new Date().toISOString() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getSyncMeta(key: string): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncMeta', 'readonly');
    const request = transaction.objectStore('syncMeta').get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

// ========== Online Status Detection ==========

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ========== Hash for Duplicate Prevention ==========

export async function generateTransactionHash(payload: any): Promise<string> {
  const data = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export type { OfflineTransaction, CachedProduct };
