import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import {
  getPendingTransactions,
  getFailedTransactions,
  getAllOfflineTransactions,
  saveOfflineTransaction,
  updateTransactionSyncStatus,
  clearSyncedTransactions,
  cacheProducts,
  getCachedProducts,
  isOnline,
  onConnectivityChange,
  generateTransactionHash,
  type OfflineTransaction,
} from '@/utils/posOfflineDB';

export function usePOSOfflineSync() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    return onConnectivityChange((status) => {
      setOnline(status);
      if (status) {
        toast({ title: 'Back Online', description: 'Syncing queued transactions...' });
        syncPendingTransactions();
      } else {
        toast({ title: 'Offline Mode', description: 'Transactions will be queued locally.', variant: 'destructive' });
      }
    });
  }, []);

  // Server-side offline transactions
  const { data: serverTransactions, isLoading: loadingServer } = useQuery({
    queryKey: ['pos-offline-transactions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_offline_transactions')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('local_timestamp', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && online,
  });

  const { data: syncLogs } = useQuery({
    queryKey: ['pos-sync-logs', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_sync_log')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && online,
  });

  const { data: productCache } = useQuery({
    queryKey: ['pos-product-cache', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_product_cache')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .eq('is_active', true);
      if (error) throw error;
      // Also cache locally
      if (data) {
        await cacheProducts(data.map(p => ({
          itemCode: p.item_code,
          itemName: p.item_name,
          barcode: p.barcode || undefined,
          price: Number(p.price),
          taxCode: p.tax_code || undefined,
          taxPercent: Number(p.tax_percent || 0),
          category: p.category || undefined,
          stockQuantity: Number(p.stock_quantity || 0),
          unit: p.unit || undefined,
          imageUrl: p.image_url || undefined,
          isActive: p.is_active ?? true,
          cacheVersion: p.cache_version ?? 1,
          lastServerSync: p.last_server_sync || undefined,
        })));
      }
      return data;
    },
    enabled: !!activeCompanyId && online,
  });

  const queueTransaction = useCallback(async (type: OfflineTransaction['type'], payload: any) => {
    const hash = await generateTransactionHash(payload);
    const tx: OfflineTransaction = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: new Date().toISOString(),
      syncStatus: 'pending',
      syncAttempts: 0,
      hashChecksum: hash,
    };
    await saveOfflineTransaction(tx);

    if (online) {
      await syncSingleTransaction(tx);
    }
    queryClient.invalidateQueries({ queryKey: ['pos-offline-transactions'] });
    return tx.id;
  }, [online, activeCompanyId]);

  const syncSingleTransaction = async (tx: OfflineTransaction) => {
    try {
      await updateTransactionSyncStatus(tx.id, 'syncing');
      const { error } = await supabase.from('pos_offline_transactions').insert({
        company_id: activeCompanyId,
        transaction_type: tx.type,
        transaction_payload: tx.payload,
        local_transaction_id: tx.id,
        local_timestamp: tx.timestamp,
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
        hash_checksum: tx.hashChecksum,
      });
      if (error) throw error;
      await updateTransactionSyncStatus(tx.id, 'synced');
    } catch (err: any) {
      if (err.message?.includes('duplicate') || err.code === '23505') {
        await updateTransactionSyncStatus(tx.id, 'conflict', 'Duplicate transaction detected');
      } else {
        await updateTransactionSyncStatus(tx.id, 'failed', err.message);
      }
    }
  };

  const syncPendingTransactions = async () => {
    if (syncing || !online) return;
    setSyncing(true);
    try {
      const pending = await getPendingTransactions();
      const failed = await getFailedTransactions();
      const retryable = failed.filter(t => (t.syncAttempts || 0) < 5);
      const toSync = [...pending, ...retryable];

      for (const tx of toSync) {
        await syncSingleTransaction(tx);
      }

      await clearSyncedTransactions();
      queryClient.invalidateQueries({ queryKey: ['pos-offline-transactions'] });
      if (toSync.length > 0) {
        toast({ title: 'Sync Complete', description: `${toSync.length} transactions processed` });
      }
    } finally {
      setSyncing(false);
    }
  };

  const refreshProductCache = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ['pos-product-cache'] });
  }, [queryClient]);

  const getLocalProducts = useCallback(async () => {
    return getCachedProducts();
  }, []);

  const getLocalTransactions = useCallback(async () => {
    return getAllOfflineTransactions();
  }, []);

  return {
    online,
    syncing,
    serverTransactions,
    syncLogs,
    productCache,
    loadingServer,
    queueTransaction,
    syncPendingTransactions,
    refreshProductCache,
    getLocalProducts,
    getLocalTransactions,
  };
}
