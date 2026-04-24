import { Bell, CheckCheck, Clock, DollarSign, Settings, ExternalLink, AlertTriangle, FileText, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkflowNotifications, WorkflowNotification } from '@/hooks/useWorkflowNotifications';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'payment': return <DollarSign className="h-4 w-4 text-success" />;
    case 'workflow': return <Clock className="h-4 w-4 text-warning" />;
    case 'overdue': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'document': return <FileText className="h-4 w-4 text-info" />;
    default: return <Settings className="h-4 w-4 text-muted-foreground" />;
  }
}

function getCategory(n: WorkflowNotification): string {
  if (n.notification_type === 'payment') return 'payments';
  if (n.notification_type === 'workflow') return 'approvals';
  if (n.phase?.includes('overdue') || n.title?.toLowerCase().includes('overdue')) return 'overdue';
  return 'system';
}

function NotificationItem({ notification, onRead, onDismiss }: {
  notification: WorkflowNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.is_read) onRead(notification.id);
    if (notification.link_url) navigate(notification.link_url);
  };

  return (
    <div className={`flex gap-3 items-start p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${!notification.is_read ? 'bg-primary/5' : ''}`}>
      <button onClick={handleClick} className="flex gap-3 items-start flex-1 text-left min-w-0">
        <div className="mt-0.5 shrink-0"><NotificationIcon type={notification.notification_type} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm truncate ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>{notification.title}</span>
            {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
          </div>
          {notification.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
            {notification.link_url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
          </div>
        </div>
      </button>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => onDismiss(notification.id)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function EnhancedNotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useWorkflowNotifications();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const dismissNotification = async (id: string) => {
    await supabase.from('workflow_notifications').update({ is_read: true, read_at: new Date().toISOString() } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] });
  };

  const categorized = {
    all: notifications,
    approvals: notifications.filter(n => getCategory(n) === 'approvals'),
    payments: notifications.filter(n => getCategory(n) === 'payments'),
    overdue: notifications.filter(n => getCategory(n) === 'overdue'),
    system: notifications.filter(n => getCategory(n) === 'system'),
  };

  const renderList = (items: WorkflowNotification[]) => (
    <ScrollArea className="max-h-[350px]">
      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
      ) : (
        items.map(n => (
          <div key={n.id} className="group">
            <NotificationItem notification={n} onRead={id => markAsRead.mutate(id)} onDismiss={dismissNotification} />
          </div>
        ))
      )}
    </ScrollArea>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-tour="notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <Tabs defaultValue="all">
          <TabsList className="w-full rounded-none border-b h-8 bg-transparent p-0">
            <TabsTrigger value="all" className="text-xs h-8 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs h-8 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Approvals ({categorized.approvals.length})</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs h-8 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Payments ({categorized.payments.length})</TabsTrigger>
            <TabsTrigger value="system" className="text-xs h-8 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">System ({categorized.system.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="m-0">{renderList(categorized.all)}</TabsContent>
          <TabsContent value="approvals" className="m-0">{renderList(categorized.approvals)}</TabsContent>
          <TabsContent value="payments" className="m-0">{renderList(categorized.payments)}</TabsContent>
          <TabsContent value="system" className="m-0">{renderList(categorized.system)}</TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
