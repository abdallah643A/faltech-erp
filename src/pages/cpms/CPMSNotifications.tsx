import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCPMS } from '@/hooks/useCPMS';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Bell, BellRing, Check, CheckCheck, Trash2, AlertTriangle, Info, AlertCircle, Calendar, DollarSign, Shield, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface Notification {
  id: string; project_id: string; type: string; title: string; message: string;
  severity: string; is_read: boolean; link_url: string; created_at: string; metadata: any;
}

const typeIcons: Record<string, React.ElementType> = {
  deadline: Calendar, budget_alert: DollarSign, milestone: Target, safety: Shield, quality: AlertTriangle, info: Info,
};
const severityStyles: Record<string, string> = {
  info: 'border-l-blue-400 bg-blue-50/50', warning: 'border-l-yellow-400 bg-yellow-50/50', critical: 'border-l-red-400 bg-red-50/50',
};

export default function CPMSNotifications() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useCPMS();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase.from('cpms_notifications' as any).select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(200);
    setNotifications((data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { if (user?.id) fetchNotifications(); }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel('cpms-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cpms_notifications', filter: `user_id=eq.${user.id}` },
        (payload) => { setNotifications(prev => [payload.new as any, ...prev]); toast({ title: (payload.new as any).title, description: (payload.new as any).message }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase.from('cpms_notifications' as any).update({ is_read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from('cpms_notifications' as any).update({ is_read: true } as any).eq('user_id', user?.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast({ title: 'All marked as read' });
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('cpms_notifications' as any).delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'critical') return n.severity === 'critical';
    if (filter !== 'all') return n.type === filter;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => n.severity === 'critical' && !n.is_read).length;

  const getProjectName = (pid: string) => projects.find(p => p.id === pid)?.name || '';

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cpms')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" /> CPMS Notifications
            {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">إشعارات المشاريع – Project alerts and updates</p>
        </div>
        {unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4 mr-1" /> Mark All Read</Button>}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-sm" onClick={() => setFilter('all')}>
          <CardContent className="p-3 flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">{t('common.total')}</p><p className="text-lg font-bold">{notifications.length}</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-sm" onClick={() => setFilter('unread')}>
          <CardContent className="p-3 flex items-center gap-3">
            <BellRing className="h-5 w-5 text-primary" />
            <div><p className="text-xs text-muted-foreground">Unread</p><p className="text-lg font-bold text-primary">{unreadCount}</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-sm" onClick={() => setFilter('critical')}>
          <CardContent className="p-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div><p className="text-xs text-muted-foreground">Critical</p><p className="text-lg font-bold text-red-500">{criticalCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="deadline">Deadlines</SelectItem>
                <SelectItem value="budget_alert">Budget Alerts</SelectItem>
                <SelectItem value="milestone">Milestones</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.map(n => {
          const Icon = typeIcons[n.type] || Info;
          return (
            <Card key={n.id} className={`border-l-4 transition-all ${severityStyles[n.severity] || 'border-l-muted'} ${!n.is_read ? 'ring-1 ring-primary/20' : 'opacity-80'}`}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.severity === 'critical' ? 'bg-red-100' : n.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                  <Icon className={`h-4 w-4 ${n.severity === 'critical' ? 'text-red-600' : n.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                  {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">{n.type.replace('_', ' ')}</Badge>
                    {n.project_id && <span className="text-xs text-muted-foreground">{getProjectName(n.project_id)}</span>}
                    <span className="text-xs text-muted-foreground">{n.created_at ? format(new Date(n.created_at), 'dd MMM HH:mm') : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.is_read && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markRead(n.id)}><Check className="h-3.5 w-3.5" /></Button>}
                  {n.link_url && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(n.link_url)}><ArrowLeft className="h-3.5 w-3.5 rotate-180" /></Button>}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNotification(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
