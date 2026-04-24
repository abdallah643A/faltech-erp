import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceTabs } from '@/contexts/WorkspaceTabsContext';

/**
 * Hook to open a document/form as a workspace tab.
 * Usage: const openTab = useOpenTab(); openTab('/ar-invoices/new', 'New AR Invoice');
 */
export function useOpenTab() {
  const { openTab } = useWorkspaceTabs();
  const navigate = useNavigate();

  return useCallback((path: string, title: string) => {
    openTab({ title, path });
    navigate(path);
  }, [openTab, navigate]);
}
