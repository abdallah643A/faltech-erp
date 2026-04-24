import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkflowNotifications, NotificationCategory } from '@/hooks/useWorkflowNotifications';
import { VirtualList } from '@/components/shared/VirtualList';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORIES: Array<{ value: NotificationCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'approval', label: 'Approvals' },
  { value: 'finance', label: 'Finance' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'hr', label: 'HR' },
  { value: 'project', label: 'Projects' },
  { value: 'task', label: 'Tasks' },
  { value: 'system', label: 'System' },
];

export default function NotificationsInbox() {
  const [category, setCategory] = useState<NotificationCategory | 'all'>('all');
  const navigate = useNavigate();
  const {
    notifications, unreadCount, isLoading,
    markAsRead, markAllAsRead, deleteNotification,
  } = useWorkflowNotifications(category);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()} aria-label="Mark all notifications as read">
            <CheckCheck className="h-4 w-4 mr-2" /> Mark all read
          </Button>
        )}
      </header>

      <Tabs value={category} onValueChange={(v) => setCategory(v as any)}>
        <TabsList className="flex-wrap h-auto">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value} className="text-xs">{c.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="enterprise-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications in this category</p>
          </div>
        ) : (
          <VirtualList
            items={notifications}
            estimateSize={84}
            className="h-[calc(100vh-320px)] min-h-[400px] overflow-auto"
            getKey={(n) => n.id}
            renderItem={(n) => (
              <div
                className={cn(
                  'flex items-start gap-3 p-3 border-b border-border hover:bg-muted/40 cursor-pointer transition-colors',
                  !n.is_read && 'bg-primary/5'
                )}
                onClick={() => {
                  if (!n.is_read) markAsRead.mutate(n.id);
                  if (n.action_url || n.link_url) navigate(n.action_url || n.link_url!);
                }}
                role="button"
                tabIndex={0}
                aria-label={`Notification: ${n.title}${!n.is_read ? ' (unread)' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />}
                    <span className={cn('text-sm truncate', !n.is_read ? 'font-semibold' : 'font-medium')}>{n.title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{n.priority}</Badge>
                  </div>
                  {n.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.message}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                    <span className="capitalize">{n.category}</span>
                    {(n.action_url || n.link_url) && <ExternalLink className="h-3 w-3" />}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
