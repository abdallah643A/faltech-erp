import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground text-center py-1 text-xs font-medium flex items-center justify-center gap-1 md:hidden">
      <WifiOff className="h-3 w-3" /> You are offline – data will sync when reconnected
    </div>
  );
}
