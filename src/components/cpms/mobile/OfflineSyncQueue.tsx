import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QueuedAction {
  id: string;
  type: 'daily_report' | 'photo_upload';
  payload: any;
  createdAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
  retryCount: number;
}

const DB_NAME = 'cpms_offline_db';
const STORE_NAME = 'sync_queue';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllQueued(): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function addToQueue(action: QueuedAction): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(action);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateInQueue(action: QueuedAction): Promise<void> {
  return addToQueue(action);
}

async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useOfflineSync() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const refreshQueue = useCallback(async () => {
    try {
      const items = await getAllQueued();
      setQueue(items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } catch {
      // IndexedDB not available
    }
  }, []);

  useEffect(() => {
    refreshQueue();
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [refreshQueue]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.some(q => q.status === 'pending' || q.status === 'error')) {
      syncAll();
    }
  }, [isOnline]);

  const queueDailyReport = useCallback(async (reportData: any) => {
    const action: QueuedAction = {
      id: `dr_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'daily_report',
      payload: reportData,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    await addToQueue(action);
    await refreshQueue();
    toast({ title: 'Report queued', description: 'Will sync when online.' });

    if (isOnline) {
      await syncAction(action);
    }
  }, [isOnline, refreshQueue, toast]);

  const queuePhotoUpload = useCallback(async (photoData: { projectId: string; file: File; caption?: string }) => {
    // Convert File to base64 for IndexedDB storage
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(photoData.file);
    });

    const action: QueuedAction = {
      id: `ph_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'photo_upload',
      payload: {
        projectId: photoData.projectId,
        fileName: photoData.file.name,
        fileType: photoData.file.type,
        base64Data: base64,
        caption: photoData.caption,
      },
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    await addToQueue(action);
    await refreshQueue();
    toast({ title: 'Photo queued', description: 'Will upload when online.' });

    if (isOnline) {
      await syncAction(action);
    }
  }, [isOnline, refreshQueue, toast]);

  const syncAction = async (action: QueuedAction) => {
    try {
      action.status = 'syncing';
      await updateInQueue(action);
      await refreshQueue();

      if (action.type === 'daily_report') {
        const { error } = await supabase.from('cpms_daily_reports' as any).insert(action.payload as any);
        if (error) throw error;
      } else if (action.type === 'photo_upload') {
        const { base64Data, fileName, fileType, projectId, caption } = action.payload;
        // Convert base64 back to blob
        const response = await fetch(base64Data);
        const blob = await response.blob();
        const path = `projects/${projectId}/${Date.now()}_${fileName}`;
        const { error: uploadError } = await supabase.storage.from('cpms-documents').upload(path, blob, { contentType: fileType });
        if (uploadError) throw uploadError;

        // Get public URL and save reference
        const { data: urlData } = supabase.storage.from('cpms-documents').getPublicUrl(path);
        await supabase.from('cpms_documents' as any).insert({
          project_id: projectId,
          title: caption || fileName,
          file_url: urlData.publicUrl,
          file_name: fileName,
          file_type: fileType,
          category: 'photo',
        } as any);
      }

      action.status = 'synced';
      await updateInQueue(action);
      await refreshQueue();
      // Remove after short delay so user sees "synced" state
      setTimeout(async () => {
        await removeFromQueue(action.id);
        await refreshQueue();
      }, 3000);
    } catch (err: any) {
      action.status = 'error';
      action.errorMessage = err.message || 'Sync failed';
      action.retryCount += 1;
      await updateInQueue(action);
      await refreshQueue();
    }
  };

  const syncAll = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    const items = await getAllQueued();
    const pending = items.filter(i => i.status === 'pending' || (i.status === 'error' && i.retryCount < 3));
    for (const item of pending) {
      await syncAction(item);
    }
    setIsSyncing(false);
    toast({ title: 'Sync complete', description: `${pending.length} items processed.` });
  };

  const clearSynced = async () => {
    const items = await getAllQueued();
    for (const item of items.filter(i => i.status === 'synced')) {
      await removeFromQueue(item.id);
    }
    await refreshQueue();
  };

  return {
    queue,
    isOnline,
    isSyncing,
    queueDailyReport,
    queuePhotoUpload,
    syncAll,
    clearSynced,
    pendingCount: queue.filter(q => q.status === 'pending').length,
    errorCount: queue.filter(q => q.status === 'error').length,
  };
}

// UI Widget for sync status
export function OfflineSyncStatus() {
  const { queue, isOnline, isSyncing, syncAll, clearSynced, pendingCount, errorCount } = useOfflineSync();

  if (queue.length === 0 && isOnline) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? <Cloud className="h-4 w-4 text-green-500" /> : <CloudOff className="h-4 w-4 text-destructive" />}
            Sync Queue ({queue.length})
          </div>
          <div className="flex gap-1">
            {pendingCount > 0 && isOnline && (
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={syncAll} disabled={isSyncing}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            )}
            {queue.some(q => q.status === 'synced') && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={clearSynced}>
                <Trash2 className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {queue.slice(0, 10).map(item => (
          <div key={item.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
            <div className="flex items-center gap-2 truncate">
              {item.status === 'synced' && <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />}
              {item.status === 'pending' && <Clock className="h-3 w-3 text-amber-500 shrink-0" />}
              {item.status === 'syncing' && <RefreshCw className="h-3 w-3 text-primary animate-spin shrink-0" />}
              {item.status === 'error' && <AlertCircle className="h-3 w-3 text-destructive shrink-0" />}
              <span className="truncate">
                {item.type === 'daily_report' ? 'Daily Report' : 'Photo'} - {new Date(item.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <Badge variant={item.status === 'synced' ? 'default' : item.status === 'error' ? 'destructive' : 'outline'} className="text-[9px] shrink-0">
              {item.status}
            </Badge>
          </div>
        ))}
        {!isOnline && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Items will sync automatically when you're back online
          </p>
        )}
        {errorCount > 0 && (
          <p className="text-[10px] text-destructive text-center">
            {errorCount} item(s) failed. Will retry up to 3 times.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
