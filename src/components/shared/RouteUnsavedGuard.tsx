import { useEffect, useCallback, useState } from 'react';
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog';

interface RouteGuardProps {
  when: boolean;
  onSave?: () => Promise<void> | void;
}

/**
 * Drop this component anywhere to guard against losing unsaved changes.
 * Uses the browser's beforeunload event (works with BrowserRouter).
 * For in-app record switching, use useUnsavedChangesGuard's guardAction instead.
 */
export function RouteUnsavedGuard({ when, onSave }: RouteGuardProps) {
  // Browser beforeunload guard — works with any router type
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);

  // No dialog needed here — record-level guarding is handled by useUnsavedChangesGuard
  return null;
}
