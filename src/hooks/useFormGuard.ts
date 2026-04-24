import { useState, useCallback, useEffect } from 'react';

export function useFormGuard(isDirty: boolean) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Browser beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const confirmLeave = useCallback(() => {
    setShowDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const cancelLeave = useCallback(() => {
    setShowDialog(false);
    setPendingAction(null);
  }, []);

  const guardAction = useCallback((action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      setShowDialog(true);
    } else {
      action();
    }
  }, [isDirty]);

  return { showDialog, confirmLeave, cancelLeave, guardAction };
}
