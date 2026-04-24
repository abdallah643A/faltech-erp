import { useState, useCallback, useEffect } from 'react';

/**
 * Hook to guard against losing unsaved changes.
 * Returns state & helpers to show an UnsavedChangesDialog.
 *
 * Usage:
 *   const guard = useUnsavedChangesGuard(hasChanges);
 *   // Before switching record:
 *   guard.guardAction(() => switchRecord(newId));
 *   // In JSX:
 *   <UnsavedChangesDialog open={guard.dialogOpen} onSave={guard.handleSave} onDiscard={guard.handleDiscard} onCancel={guard.handleCancel} />
 *   // Provide a save callback:
 *   guard.setSaveCallback(handleSave);
 */
export function useUnsavedChangesGuard(hasChanges: boolean) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [saveCallback, setSaveCallback] = useState<(() => Promise<void> | void) | null>(null);

  // Guard an action – if there are unsaved changes, show the dialog; otherwise run immediately
  const guardAction = useCallback((action: () => void) => {
    if (hasChanges) {
      setPendingAction(() => action);
      setDialogOpen(true);
    } else {
      action();
    }
  }, [hasChanges]);

  const handleDiscard = useCallback(() => {
    setDialogOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const handleSave = useCallback(async () => {
    if (saveCallback) {
      await saveCallback();
    }
    setDialogOpen(false);
    if (pendingAction) {
      // Small delay to let save finish
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 100);
    }
  }, [saveCallback, pendingAction]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setPendingAction(null);
  }, []);

  // Browser beforeunload guard
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  return {
    dialogOpen,
    guardAction,
    handleSave,
    handleDiscard,
    handleCancel,
    setSaveCallback: (cb: (() => Promise<void> | void) | null) => setSaveCallback(() => cb),
  };
}
