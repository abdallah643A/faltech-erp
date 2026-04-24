import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Bell, Mail, BellOff, Clock, Target, Calendar, UserPlus, MessageCircle, RefreshCw, Save } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const NOTIFICATION_TYPES = [
  { key: 'lead_assigned', label: 'Lead Assigned', description: 'When a lead is assigned to you', icon: Target, color: 'text-emerald-500' },
  { key: 'meeting_reminder', label: 'Meeting Reminders', description: '24h, 1h, and 15min before meetings', icon: Calendar, color: 'text-blue-500' },
  { key: 'daily_digest', label: 'Daily Digest', description: 'Summary of assigned leads & upcoming activities', icon: Mail, color: 'text-primary' },
  { key: 'follow_up_reminder', label: 'Follow-up Reminders', description: 'When a lead hasn\'t been contacted in X days', icon: RefreshCw, color: 'text-amber-500' },
  { key: 'deal_assigned', label: 'Deal Assigned', description: 'When you\'re assigned to a deal', icon: UserPlus, color: 'text-purple-500' },
  { key: 'activity_assigned', label: 'Activity Assigned', description: 'When an activity is assigned to you', icon: MessageCircle, color: 'text-rose-500' },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function NotificationPreferences() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences = [] } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: dndSchedule } = useQuery({
    queryKey: ['notification-dnd', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_dnd_schedule').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [dnd, setDnd] = useState({
    dnd_enabled: false,
    dnd_start_time: '22:00',
    dnd_end_time: '07:00',
    dnd_days: DAYS,
  });

  useEffect(() => {
    if (dndSchedule) {
      setDnd({
        dnd_enabled: dndSchedule.dnd_enabled,
        dnd_start_time: dndSchedule.dnd_start_time,
        dnd_end_time: dndSchedule.dnd_end_time,
        dnd_days: dndSchedule.dnd_days || DAYS,
      });
    }
  }, [dndSchedule]);

  const prefMap = new Map(preferences.map((p: any) => [p.notification_type, p]));

  const togglePref = useMutation({
    mutationFn: async ({ type, field, value }: { type: string; field: 'email_enabled' | 'in_app_enabled'; value: boolean }) => {
      const existing = prefMap.get(type);
      if (existing) {
        const { error } = await supabase.from('notification_preferences').update({ [field]: value }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notification_preferences').insert({
          user_id: user!.id,
          notification_type: type,
          [field]: value,
          ...(field === 'email_enabled' ? { in_app_enabled: true } : { email_enabled: true }),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  const saveDnd = useMutation({
    mutationFn: async () => {
      if (dndSchedule) {
        const { error } = await supabase.from('notification_dnd_schedule').update(dnd).eq('id', dndSchedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notification_dnd_schedule').insert({ ...dnd, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-dnd'] });
      toast({ title: 'Do Not Disturb settings saved' });
    },
  });

  const getEnabled = (type: string, field: 'email_enabled' | 'in_app_enabled') => {
    const pref = prefMap.get(type);
    return pref ? pref[field] : true;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notification Preferences</h1>
        <p className="text-muted-foreground">Control how and when you receive notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Channels</CardTitle>
          <CardDescription>Choose how you want to be notified for each event type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="grid grid-cols-[1fr,80px,80px] gap-4 pb-2 border-b">
            <span className="text-sm font-medium text-muted-foreground">Event Type</span>
            <span className="text-sm font-medium text-muted-foreground text-center">{t('common.email')}</span>
            <span className="text-sm font-medium text-muted-foreground text-center">In-App</span>
          </div>
          {NOTIFICATION_TYPES.map(({ key, label, description, icon: Icon, color }) => (
            <div key={key} className="grid grid-cols-[1fr,80px,80px] gap-4 py-3 items-center border-b last:border-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><Icon className={`h-4 w-4 ${color}`} /></div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={getEnabled(key, 'email_enabled')}
                  onCheckedChange={(v) => togglePref.mutate({ type: key, field: 'email_enabled', value: v })}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={getEnabled(key, 'in_app_enabled')}
                  onCheckedChange={(v) => togglePref.mutate({ type: key, field: 'in_app_enabled', value: v })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BellOff className="h-5 w-5" /> Do Not Disturb</CardTitle>
          <CardDescription>Pause notifications during specific hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Do Not Disturb</Label>
            <Switch checked={dnd.dnd_enabled} onCheckedChange={(v) => setDnd(p => ({ ...p, dnd_enabled: v }))} />
          </div>
          {dnd.dnd_enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> Start Time</Label>
                  <Input type="time" value={dnd.dnd_start_time} onChange={e => setDnd(p => ({ ...p, dnd_start_time: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> End Time</Label>
                  <Input type="time" value={dnd.dnd_end_time} onChange={e => setDnd(p => ({ ...p, dnd_end_time: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Active Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <Badge
                      key={day}
                      variant={dnd.dnd_days.includes(day) ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => setDnd(p => ({
                        ...p,
                        dnd_days: p.dnd_days.includes(day) ? p.dnd_days.filter(d => d !== day) : [...p.dnd_days, day],
                      }))}
                    >
                      {day.slice(0, 3)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
          <Button onClick={() => saveDnd.mutate()} disabled={saveDnd.isPending}>
            <Save className="h-4 w-4 mr-2" />Save DND Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
