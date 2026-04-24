import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

export interface WorkspaceTab {
  id: string;
  title: string;
  path: string;
  icon?: string;
  hasUnsavedChanges?: boolean;
  /** Timestamp when tab was opened */
  openedAt: number;
}

interface WorkspaceTabsContextType {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  openTab: (tab: Omit<WorkspaceTab, 'id' | 'openedAt'>) => string;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (id: string) => void;
  markUnsaved: (id: string, unsaved: boolean) => void;
  getTabByPath: (path: string) => WorkspaceTab | undefined;
  updateTabTitle: (id: string, title: string) => void;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextType | null>(null);

export function useWorkspaceTabs() {
  const ctx = useContext(WorkspaceTabsContext);
  if (!ctx) throw new Error('useWorkspaceTabs must be used within WorkspaceTabsProvider');
  return ctx;
}

const MAX_TABS = 12;

export function WorkspaceTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const counterRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeTabId;

  const openTab = useCallback((tab: Omit<WorkspaceTab, 'id' | 'openedAt'>): string => {
    let resolvedId = '';

    setTabs(prev => {
      // Check if tab with same path already exists
      const existing = prev.find(t => t.path === tab.path);
      if (existing) {
        resolvedId = existing.id;
        return prev; // no change to tabs
      }

      const id = `tab-${++counterRef.current}-${Date.now()}`;
      resolvedId = id;
      const newTab: WorkspaceTab = { ...tab, id, openedAt: Date.now() };
      let updated = [...prev, newTab];
      // Enforce max tabs - remove oldest non-unsaved tab
      if (updated.length > MAX_TABS) {
        const removable = updated.filter(t => !t.hasUnsavedChanges && t.id !== id);
        if (removable.length > 0) {
          const oldest = removable.sort((a, b) => a.openedAt - b.openedAt)[0];
          updated = updated.filter(t => t.id !== oldest.id);
        }
      }
      return updated;
    });

    // Only update active tab if it actually changed (prevents render loops)
    if (resolvedId && resolvedId !== activeIdRef.current) {
      setActiveTabId(resolvedId);
    }
    return resolvedId;
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const updated = prev.filter(t => t.id !== id);
      // If closing active tab, activate adjacent
      if (activeTabId === id && updated.length > 0) {
        const newIdx = Math.min(idx, updated.length - 1);
        setActiveTabId(updated[newIdx].id);
      } else if (updated.length === 0) {
        setActiveTabId(null);
      }
      return updated;
    });
  }, [activeTabId]);

  const closeOtherTabs = useCallback((id: string) => {
    setTabs(prev => prev.filter(t => t.id === id));
    setActiveTabId(id);
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const markUnsaved = useCallback((id: string, unsaved: boolean) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, hasUnsavedChanges: unsaved } : t));
  }, []);

  const getTabByPath = useCallback((path: string) => {
    return tabs.find(t => t.path === path);
  }, [tabs]);

  const updateTabTitle = useCallback((id: string, title: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  }, []);

  const value = useMemo(() => ({
    tabs, activeTabId, openTab, closeTab, closeOtherTabs, closeAllTabs,
    setActiveTab: setActiveTabId, markUnsaved, getTabByPath, updateTabTitle,
  }), [tabs, activeTabId, openTab, closeTab, closeOtherTabs, closeAllTabs, markUnsaved, getTabByPath, updateTabTitle]);

  return (
    <WorkspaceTabsContext.Provider value={value}>
      {children}
    </WorkspaceTabsContext.Provider>
  );
}
