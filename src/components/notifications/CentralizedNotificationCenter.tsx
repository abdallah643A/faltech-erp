import { useState } from 'react';
import { Bell, CheckCheck, Clock, DollarSign, AlertTriangle, FileText, X, BellOff, UserCheck, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkflowNotifications, WorkflowNotification } from '@/hooks/useWorkflowNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'bg-destructive text-destructive-foreground';
    case 'high': return 'bg-warning text-warning-foreground';
    case 'medium': return 'bg-info text-info-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'payment': return <DollarSign className="h-4 w-4 text-success" />;
    case 'workflow': return <Clock className="h-4 w-4 text-warning" />;
    case 'overdue': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'document': return <FileText className="h-4 w-4 text-info" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function getModule(n: WorkflowNotification): string {
  if (n.notification_type === 'payment') return 'finance';
  if (n.phase?.includes('procurement') || n.phase?.includes('material')) return 'procurement';
  if (n.phase?.includes('leave') || n.phase?.includes('payroll')) return 'hr';
  if (n.phase?.includes('production') || n.phase?.includes('manufacturing')) return 'manufacturing';
  if (n.phase?.includes('logistics') || n.phase?.includes('construction')) return 'construction';
  return 'general';
}

export function CentralizedNotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useWorkflowNotifications();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const filtered = notifications.filter(n => {
    if (moduleFilter !== 'all' && getModule(n) !== moduleFilter) return false;
    // Filter out snoozed
    const ext = n as any;
    if (ext.snoozed_until && new Date(ext.snoozed_until) > new Date()) return false;
    return true;
  });

  const snooze = async (id: string, hours: number) => {
    const until = new Date(Date.now() + hours * 3600000).toISOString();
    await supabase.from('workflow_notifications').update({ snoozed_until: until } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] });
    toast.success(`Snoozed for ${hours}h`);
  };

  const assignToMe = async (id: string) => {
    await supabase.from('workflow_notifications').update({ assigned_to: user!.id } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] });
    toast.success('Assigned to you');
  };

  const renderItem = (n: WorkflowNotification) => {
    const ext = n as any;
    return (
      <div key={n.id} className={`group flex gap-3 items-start p-3 hover:bg-muted/50 transition-colors border-b last:border-0 ${!n.is_read ? 'bg-primary/5' : ''}`}>
        <div className="mt-0.5 shrink-0"><NotificationIcon type={n.notification_type} /></div>
        <button className="flex-1 text-left min-w-0" onClick={() => {
          if (!n.is_read) markAsRead.mutate(n.id);
          if (n.link_url) navigate(n.link_url);
        }}>
          <div className="flex items-center gap-2">
            <span className={`text-sm truncate ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</span>
            {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
            {ext.severity && ext.severity !== 'info' && (
              <Badge className={`text-[9px] h-4 px-1 ${getSeverityColor(ext.severity)}`}>{ext.severity}</Badge>
            )}
          </div>
          {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
        </button>
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-5 w-5" title="Snooze 1h" onClick={() => snooze(n.id, 1)}>
            <BellOff className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" title="Assign to me" onClick={() => assignToMe(n.id)}>
            <UserCheck className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

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
      <DropdownMenuContent align="end" className="w-[460px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          <div className="flex items-center gap-2">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-6 w-28 text-[10px]">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="procurement">Procurement</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => markAllAsRead.mutate()}>
                <CheckCheck className="h-3 w-3" /> Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            filtered.map(renderItem)
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
