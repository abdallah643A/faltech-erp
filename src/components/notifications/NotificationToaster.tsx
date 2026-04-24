import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Global awareness layer: shows a toast for every new notification
 * (in addition to the realtime invalidation in useWorkflowNotifications).
 * Mounted once in MainLayout.
 */
export function NotificationToaster() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('global-notification-toaster')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'workflow_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const n = payload.new;
        if (!n) return;
        qc.invalidateQueries({ queryKey: ['workflow-notifications', user.id] });
        const showToast = n.priority === 'critical' ? toast.error : n.priority === 'high' ? toast.warning : toast;
        showToast(n.title || 'New notification', {
          description: n.message || undefined,
          action: (n.action_url || n.link_url)
            ? { label: n.action_label || 'Open', onClick: () => navigate(n.action_url || n.link_url) }
            : undefined,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, navigate, qc]);

  return null;
}
