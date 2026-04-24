import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSyncSchedules } from '@/hooks/useSyncEnhanced';
import { Loader2, Clock, Play, Pause, Calendar, Timer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const FREQUENCIES = [
  { value: 'manual', label: 'Manual Only' },
  { value: '5min', label: 'Every 5 minutes' },
  { value: '15min', label: 'Every 15 minutes' },
  { value: '30min', label: 'Every 30 minutes' },
  { value: 'hourly', label: 'Hourly' },
  { value: '4hours', label: 'Every 4 hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'custom', label: 'Custom Cron' },
];

export function SyncScheduler() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { schedules, isLoading, updateSchedule } = useSyncSchedules();
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const openEdit = (config: any) => {
    setEditing(config);
    setEditForm({
      id: config.id,
      schedule_frequency: config.schedule_frequency || 'manual',
      schedule_cron: config.schedule_cron || '',
      schedule_enabled: config.schedule_enabled || false,
    });
  };

  const saveSchedule = () => {
    updateSchedule.mutate(editForm);
    setEditing(null);
  };

  const enabledCount = (schedules as any[]).filter((s: any) => s.schedule_enabled).length;
  const totalCount = (schedules as any[]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" /> {enabledCount} / {totalCount} {isAr ? 'مجدول' : 'scheduled'}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isAr ? 'جدولة المزامنة لكل كيان' : 'Per-Entity Sync Schedule'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">{isAr ? 'الكيان' : 'Entity'}</th>
                    <th className="p-2 text-center">{isAr ? 'سحب' : 'Pull'}</th>
                    <th className="p-2 text-center">{isAr ? 'دفع' : 'Push'}</th>
                    <th className="p-2 text-left">{isAr ? 'التكرار' : 'Frequency'}</th>
                    <th className="p-2 text-center">{isAr ? 'مفعّل' : 'Enabled'}</th>
                    <th className="p-2 text-left">{isAr ? 'آخر سحب' : 'Last Pull'}</th>
                    <th className="p-2 text-left">{isAr ? 'آخر دفع' : 'Last Push'}</th>
                    <th className="p-2 text-left">{isAr ? 'التالي' : 'Next Run'}</th>
                    <th className="p-2 text-center">{isAr ? 'قفل' : 'Lock'}</th>
                    <th className="p-2">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(schedules as any[]).map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{s.display_name}</td>
                      <td className="p-2 text-center">
                        <Badge variant={s.is_enabled ? 'secondary' : 'outline'} className="text-[10px]">
                          {s.is_enabled ? '✓' : '—'}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant={s.push_enabled ? 'secondary' : 'outline'} className="text-[10px]">
                          {s.push_enabled ? '✓' : '—'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">
                          {FREQUENCIES.find(f => f.value === s.schedule_frequency)?.label || s.schedule_frequency || 'Manual'}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        {s.schedule_enabled ? <Badge variant="secondary" className="text-[10px]">Active</Badge> : <Badge variant="outline" className="text-[10px]">Off</Badge>}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{s.last_pull_at ? format(new Date(s.last_pull_at), 'MMM dd HH:mm') : '-'}</td>
                      <td className="p-2 text-xs text-muted-foreground">{s.last_push_at ? format(new Date(s.last_push_at), 'MMM dd HH:mm') : '-'}</td>
                      <td className="p-2 text-xs text-muted-foreground">{s.next_scheduled_run ? format(new Date(s.next_scheduled_run), 'MMM dd HH:mm') : '-'}</td>
                      <td className="p-2 text-center">
                        {s.is_locked ? <Badge variant="destructive" className="text-[10px]">Locked</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(s)}>
                          <Timer className="h-3 w-3 mr-1" /> {isAr ? 'تعديل' : 'Edit'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!editing} onOpenChange={() => setEditing(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{isAr ? 'تعديل الجدول' : 'Edit Schedule'}: {editing?.display_name}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>{isAr ? 'التكرار' : 'Frequency'}</Label>
                <Select value={editForm.schedule_frequency} onValueChange={(v) => setEditForm({ ...editForm, schedule_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editForm.schedule_frequency === 'custom' && (
                <div className="space-y-2">
                  <Label>Cron Expression</Label>
                  <Input value={editForm.schedule_cron} onChange={(e) => setEditForm({ ...editForm, schedule_cron: e.target.value })} placeholder="*/15 * * * *" />
                  <p className="text-xs text-muted-foreground">Standard cron format: min hour day month weekday</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={editForm.schedule_enabled} onCheckedChange={(v) => setEditForm({ ...editForm, schedule_enabled: v })} />
                <Label>{isAr ? 'تفعيل الجدولة' : 'Enable Schedule'}</Label>
              </div>
              <Button onClick={saveSchedule} disabled={updateSchedule.isPending} className="w-full">
                {isAr ? 'حفظ' : 'Save Schedule'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
