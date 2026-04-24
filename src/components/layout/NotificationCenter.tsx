import { useState } from 'react';
import { Bell, CheckCheck, Clock, DollarSign, Settings, ExternalLink, AlertTriangle, Package, Users, Brain, ClipboardCheck, Folder, BellOff, Trash2, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWorkflowNotifications, WorkflowNotification, NotificationCategory } from '@/hooks/useWorkflowNotifications';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES: { key: NotificationCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Bell className="h-3 w-3" /> },
  { key: 'approval', label: 'Approvals', icon: <ClipboardCheck className="h-3 w-3" /> },
  { key: 'finance', label: 'Finance', icon: <DollarSign className="h-3 w-3" /> },
  { key: 'project', label: 'Projects', icon: <Folder className="h-3 w-3" /> },
  { key: 'inventory', label: 'Inventory', icon: <Package className="h-3 w-3" /> },
  { key: 'hr', label: 'HR', icon: <Users className="h-3 w-3" /> },
  { key: 'task', label: 'Tasks', icon: <Clock className="h-3 w-3" /> },
  { key: 'ai', label: 'AI', icon: <Brain className="h-3 w-3" /> },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-muted-foreground/50',
};

const PRIORITY_BADGE: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case 'approval': return <ClipboardCheck className="h-4 w-4 text-purple-500" />;
    case 'finance': return <DollarSign className="h-4 w-4 text-green-500" />;
    case 'project': return <Folder className="h-4 w-4 text-blue-500" />;
    case 'inventory': return <Package className="h-4 w-4 text-amber-500" />;
    case 'hr': return <Users className="h-4 w-4 text-pink-500" />;
    case 'task': return <Clock className="h-4 w-4 text-cyan-500" />;
    case 'ai': return <Brain className="h-4 w-4 text-violet-500" />;
    default: return <Settings className="h-4 w-4 text-muted-foreground" />;
  }
}

function NotificationItem({ notification, onRead, onSnooze, onDelete }: {
  notification: WorkflowNotification;
  onRead: (id: string) => void;
  onSnooze: (id: string, until: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.is_read) onRead(notification.id);
    const link = notification.action_url || notification.link_url;
    if (link) navigate(link);
  };

  const snoozeOptions = [
    { label: '1 hour', ms: 3600000 },
    { label: '4 hours', ms: 14400000 },
    { label: 'Tomorrow', ms: 86400000 },
    { label: '1 week', ms: 604800000 },
  ];

  return (
    <div className={`relative group flex gap-3 items-start p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${!notification.is_read ? 'bg-primary/5' : ''}`}>
      {/* Priority indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${PRIORITY_COLORS[notification.priority] || ''}`} />

      <button onClick={handleClick} className="flex gap-3 items-start flex-1 min-w-0 text-left pl-1">
        <div className="mt-0.5">
          <CategoryIcon category={notification.category} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm truncate ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
              {notification.title}
            </span>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          {notification.message && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={PRIORITY_BADGE[notification.priority] || 'secondary'} className="text-[9px] px-1 h-4">
              {notification.priority}
            </Badge>
            <span className="text-[10px] text-muted-foreground capitalize">{notification.category}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
            {(notification.action_url || notification.link_url) && (
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Action buttons - show on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <BellOff className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel className="text-xs">Snooze for</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {snoozeOptions.map(opt => (
              <DropdownMenuItem
                key={opt.label}
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onSnooze(notification.id, new Date(Date.now() + opt.ms).toISOString());
                }}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive/70 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function SnoozedSection({ notifications, onRead }: { notifications: WorkflowNotification[]; onRead: (id: string) => void }) {
  if (notifications.length === 0) return null;
  return (
    <div className="border-t border-border">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
        <BellOff className="h-3 w-3" /> Snoozed ({notifications.length})
      </div>
      {notifications.slice(0, 3).map(n => (
        <div key={n.id} className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <CategoryIcon category={n.category} />
          <span className="truncate flex-1">{n.title}</span>
          <span className="text-[10px]">
            until {formatDistanceToNow(new Date(n.snoozed_until!), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  );
}

export function NotificationCenter() {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | 'all'>('all');
  const {
    notifications,
    snoozedNotifications,
    unreadCount,
    unreadByCategory,
    markAsRead,
    markAllAsRead,
    snoozeNotification,
    deleteNotification,
  } = useWorkflowNotifications(activeCategory);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[440px] p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 h-5">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => markAllAsRead.mutate()}
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-2 py-1.5 border-b overflow-x-auto">
          <div className="flex gap-1">
            {CATEGORIES.map(cat => {
              const count = cat.key === 'all' ? unreadCount : (unreadByCategory[cat.key] || 0);
              return (
                <Button
                  key={cat.key}
                  variant={activeCategory === cat.key ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-[11px] gap-1 px-2 shrink-0"
                  onClick={() => setActiveCategory(cat.key)}
                >
                  {cat.icon}
                  {cat.label}
                  {count > 0 && (
                    <span className={`text-[9px] px-1 rounded-full ${
                      activeCategory === cat.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {activeCategory !== 'all' ? 'Try switching to "All" tab' : "You're all caught up!"}
              </p>
            </div>
          ) : (
            notifications.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={(id) => markAsRead.mutate(id)}
                onSnooze={(id, until) => snoozeNotification.mutate({ id, until })}
                onDelete={(id) => deleteNotification.mutate(id)}
              />
            ))
          )}

          {/* Snoozed section */}
          <SnoozedSection notifications={snoozedNotifications} onRead={(id) => markAsRead.mutate(id)} />
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-3 py-2 flex justify-between items-center">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
            const navigate = document.querySelector('[data-notification-settings]');
          }}>
            <Settings className="h-3 w-3" />
            Preferences
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {snoozedNotifications.length > 0 && `${snoozedNotifications.length} snoozed · `}
            {notifications.length} total
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
