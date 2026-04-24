import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSyncAdminConfig, useSyncAdminActions } from '@/hooks/useSyncAdmin';
import { Loader2, Save, Settings, Pause, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function SyncConfiguration() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { configs, isLoading, updateConfig } = useSyncAdminConfig();
  const { pauseEntity, resumeEntity } = useSyncAdminActions();
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const openEdit = (config: any) => {
    setEditing(config);
    setEditForm({ ...config });
  };

  const saveEdit = () => {
    updateConfig.mutate({
      config_id: editForm.id,
      batch_size: editForm.batch_size,
      sync_priority: editForm.sync_priority,
      is_enabled: editForm.is_enabled,
    });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isAr ? 'إعدادات الكيانات' : 'Entity Sync Configuration'}</CardTitle>
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
                    <th className="p-2 text-left">{isAr ? 'المصدر' : 'Endpoint'}</th>
                    <th className="p-2 text-left">{isAr ? 'حقل التزايد' : 'Incr. Field'}</th>
                    <th className="p-2 text-right">{isAr ? 'حجم الدفعة' : 'Batch'}</th>
                    <th className="p-2 text-right">{isAr ? 'الأولوية' : 'Priority'}</th>
                    <th className="p-2 text-right">{isAr ? 'المحاولات' : 'Retries'}</th>
                    <th className="p-2 text-center">{isAr ? 'مفعّل' : 'Enabled'}</th>
                    <th className="p-2 text-center">{isAr ? 'نوع' : 'Type'}</th>
                    <th className="p-2">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(configs as any[]).map((c: any) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{c.display_name}</td>
                      <td className="p-2 font-mono text-xs text-muted-foreground">{c.source_endpoint}</td>
                      <td className="p-2 text-xs">{c.incremental_field}</td>
                      <td className="p-2 text-right">{c.batch_size}</td>
                      <td className="p-2 text-right">{c.sync_priority}</td>
                      <td className="p-2 text-right">{c.retry_max_attempts}</td>
                      <td className="p-2 text-center">
                        <Badge variant={c.is_enabled ? 'secondary' : 'outline'}>{c.is_enabled ? 'Yes' : 'No'}</Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[10px]">{c.is_master_data ? 'Master' : 'Transaction'}</Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)} title="Edit">
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                          {c.is_enabled ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => pauseEntity.mutate(c.entity_name)} title="Pause">
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resumeEntity.mutate(c.entity_name)} title="Resume">
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
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
            <SheetTitle>{isAr ? 'تعديل إعدادات' : 'Edit Configuration'}: {editForm.display_name}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>{isAr ? 'حجم الدفعة' : 'Batch Size'}</Label>
                <Input type="number" value={editForm.batch_size} onChange={(e) => setEditForm({ ...editForm, batch_size: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'الأولوية' : 'Priority'} (1=highest)</Label>
                <Input type="number" value={editForm.sync_priority} onChange={(e) => setEditForm({ ...editForm, sync_priority: parseInt(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editForm.is_enabled} onCheckedChange={(v) => setEditForm({ ...editForm, is_enabled: v })} />
                <Label>{isAr ? 'مفعّل' : 'Enabled'}</Label>
              </div>
              <Button onClick={saveEdit} className="w-full" disabled={updateConfig.isPending}>
                <Save className="h-4 w-4 mr-2" /> {isAr ? 'حفظ' : 'Save'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
