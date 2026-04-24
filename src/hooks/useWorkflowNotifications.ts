import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo } from 'react';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationCategory = 'approval' | 'finance' | 'inventory' | 'hr' | 'project' | 'task' | 'ai' | 'system';

export interface WorkflowNotification {
  id: string;
  user_id: string;
  project_id: string | null;
  sales_order_id: string | null;
  phase: string;
  title: string;
  message: string | null;
  notification_type: string;
  is_read: boolean;
  read_at: string | null;
  link_url: string | null;
  email_sent: boolean;
  created_at: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  source_module: string | null;
  snoozed_until: string | null;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, any> | null;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  category: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  frequency: string;
  min_priority: string;
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function useWorkflowNotifications(categoryFilter?: NotificationCategory | 'all') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['workflow-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []).map((n: any) => ({
        ...n,
        priority: n.priority || 'medium',
        category: n.category || 'system',
        metadata: n.metadata || {},
      })) as WorkflowNotification[];
    },
    enabled: !!user,
  });

  // Notification preferences
  const { data: preferences = [] } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*');
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        category: d.category || d.notification_type || 'system',
        in_app_enabled: d.in_app_enabled ?? true,
        email_enabled: d.email_enabled ?? true,
        push_enabled: d.push_enabled ?? false,
        frequency: d.frequency || 'immediate',
        min_priority: d.min_priority || 'low',
      })) as NotificationPreference[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('workflow-notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'workflow_notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['workflow-notifications', user.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Filtered & sorted notifications
  const filteredNotifications = useMemo(() => {
    const now = new Date().toISOString();
    return notifications
      .filter(n => {
        // Exclude snoozed
        if (n.snoozed_until && n.snoozed_until > now) return false;
        // Category filter
        if (categoryFilter && categoryFilter !== 'all' && n.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Unread first, then by priority, then by date
        if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
        const pA = PRIORITY_ORDER[a.priority] ?? 2;
        const pB = PRIORITY_ORDER[b.priority] ?? 2;
        if (pA !== pB) return pA - pB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [notifications, categoryFilter]);

  const snoozedNotifications = useMemo(() => {
    const now = new Date().toISOString();
    return notifications.filter(n => n.snoozed_until && n.snoozed_until > now);
  }, [notifications]);

  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

  const unreadByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.filter(n => !n.is_read).forEach(n => {
      counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('workflow_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('workflow_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] });
    },
  });

  const snoozeNotification = useMutation({
    mutationFn: async ({ id, until }: { id: string; until: string }) => {
      const { error } = await supabase
        .from('workflow_notifications')
        .update({ snoozed_until: until } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] });
    },
  });

  const upsertPreference = useMutation({
    mutationFn: async (pref: Partial<NotificationPreference> & { category: string }) => {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user!.id,
          ...pref,
        } as any, { onConflict: 'user_id,category' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
    },
  });

  return {
    notifications: filteredNotifications,
    allNotifications: notifications,
    snoozedNotifications,
    unreadCount,
    unreadByCategory,
    isLoading,
    preferences,
    markAsRead,
    markAllAsRead,
    snoozeNotification,
    deleteNotification,
    upsertPreference,
  };
}
