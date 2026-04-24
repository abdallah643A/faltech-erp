import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface SyncState {
  isLoading: boolean;
  entityLabel: string;
  result: { success: boolean; synced?: number; created?: number; error?: string } | null;
  syncedSoFar: number;
  totalToSync: number;
  dateFrom?: string;
  dateTo?: string;
}

interface SyncProgressContextType {
  syncState: SyncState;
  startSync: (entityLabel: string, total?: number, dateFrom?: string, dateTo?: string) => void;
  updateProgress: (syncedSoFar: number, total?: number) => void;
  endSync: (result: { success: boolean; synced?: number; created?: number; error?: string }) => void;
}

const SyncProgressContext = createContext<SyncProgressContextType | undefined>(undefined);

export function SyncProgressProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>({
    isLoading: false,
    entityLabel: '',
    result: null,
    syncedSoFar: 0,
    totalToSync: 0,
  });

  const startSync = useCallback((entityLabel: string, total: number = 0, dateFrom?: string, dateTo?: string) => {
    setSyncState({ isLoading: true, entityLabel, result: null, syncedSoFar: 0, totalToSync: total, dateFrom, dateTo });
  }, []);

  const updateProgress = useCallback((syncedSoFar: number, total?: number) => {
    setSyncState(prev => ({
      ...prev,
      syncedSoFar,
      ...(total !== undefined ? { totalToSync: total } : {}),
    }));
  }, []);

  const endSync = useCallback((result: { success: boolean; synced?: number; created?: number; error?: string }) => {
    setSyncState(prev => ({ ...prev, isLoading: false, result, syncedSoFar: prev.totalToSync || prev.syncedSoFar }));
  }, []);

  return (
    <SyncProgressContext.Provider value={{ syncState, startSync, updateProgress, endSync }}>
      {children}
    </SyncProgressContext.Provider>
  );
}

export function useSyncProgress() {
  const context = useContext(SyncProgressContext);
  if (!context) {
    // Fallback for edge cases where provider hasn't mounted yet
    return {
      syncState: { isLoading: false, entityLabel: '', result: null, syncedSoFar: 0, totalToSync: 0, dateFrom: undefined, dateTo: undefined },
      startSync: () => {},
      updateProgress: () => {},
      endSync: () => {},
    } as SyncProgressContextType;
  }
  return context;
}
