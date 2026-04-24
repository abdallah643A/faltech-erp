import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MapPin, Plus, ChevronRight, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Territory {
  id: string; name: string; name_ar?: string; code?: string;
  parent_id?: string; region?: string; country_code?: string; city?: string;
  owner_user_id?: string; owner_name?: string; is_active: boolean; notes?: string;
}

export default function CRMTerritories() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Territory> | null>(null);

  const { data: territories = [], isLoading } = useQuery({
    queryKey: ['crm-territories'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('crm_territories' as any).select('*').order('name') as any);
      if (error) throw error;
      return (data ?? []) as Territory[];
    },
  });

  const tree = useMemo(() => {
    const byParent = new Map<string | null, Territory[]>();
    for (const t of territories) {
      const k = t.parent_id || null;
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k)!.push(t);
    }
    return byParent;
  }, [territories]);

  const save = useMutation({
    mutationFn: async (t: Partial<Territory>) => {
      const payload = { ...t };
      if (t.id) {
        const { error } = await (supabase.from('crm_territories' as any).update(payload).eq('id', t.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('crm_territories' as any).insert(payload) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-territories'] }); setEditing(null); toast.success(isAr ? 'تم الحفظ' : 'Saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('crm_territories' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-territories'] }); toast.success(isAr ? 'تم الحذف' : 'Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const renderNode = (t: Territory, depth: number) => {
    const children = tree.get(t.id) || [];
    return (
      <div key={t.id}>
        <div className="flex items-center justify-between py-2 border-b hover:bg-muted/30 px-2 rounded" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {children.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{isAr && t.name_ar ? t.name_ar : t.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {t.code && <span className="font-mono mr-2">{t.code}</span>}
                {[t.region, t.country_code, t.city].filter(Boolean).join(' • ')}
              </div>
            </div>
            {t.owner_name && <Badge variant="outline" className="text-[10px] gap-1"><Users className="h-3 w-3" />{t.owner_name}</Badge>}
            {!t.is_active && <Badge variant="secondary" className="text-[10px]">{isAr ? 'غير نشط' : 'Inactive'}</Badge>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing({ parent_id: t.id, is_active: true })}>{isAr ? 'إضافة فرعي' : '+ Sub'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>{isAr ? 'تعديل' : 'Edit'}</Button>
            <Button size="sm" variant="ghost" onClick={() => { if (confirm(isAr ? 'حذف؟' : 'Delete?')) remove.mutate(t.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  const roots = tree.get(null) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" />{isAr ? 'إدارة المناطق' : 'Territory Management'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'تنظيم المناطق الجغرافية ومالكي المبيعات' : 'Organize geographic territories and sales ownership'}</p>
        </div>
        <Button onClick={() => setEditing({ is_active: true })}><Plus className="h-4 w-4 mr-1" />{isAr ? 'منطقة جديدة' : 'New Territory'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{isAr ? 'هرم المناطق' : 'Territory Hierarchy'} ({territories.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">{isAr ? 'جارِ التحميل...' : 'Loading...'}</p>
            : roots.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{isAr ? 'لم يتم تعريف أي مناطق بعد.' : 'No territories yet — create your first one.'}</p>
            : roots.map((t) => renderNode(t, 0))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? (isAr ? 'تعديل المنطقة' : 'Edit Territory') : (isAr ? 'منطقة جديدة' : 'New Territory')}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</Label><Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>{isAr ? 'الاسم (AR)' : 'Name (AR)'}</Label><Input value={editing.name_ar || ''} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} dir="rtl" /></div>
                <div><Label>{isAr ? 'الرمز' : 'Code'}</Label><Input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></div>
                <div><Label>{isAr ? 'المنطقة الأم' : 'Parent'}</Label>
                  <Select value={editing.parent_id || 'none'} onValueChange={(v) => setEditing({ ...editing, parent_id: v === 'none' ? undefined : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{isAr ? 'بدون (جذر)' : 'None (root)'}</SelectItem>
                      {territories.filter(t => t.id !== editing.id).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{isAr ? 'الإقليم' : 'Region'}</Label><Input value={editing.region || ''} onChange={(e) => setEditing({ ...editing, region: e.target.value })} placeholder="GCC, EU, APAC..." /></div>
                <div><Label>{isAr ? 'الدولة' : 'Country'}</Label><Input value={editing.country_code || ''} onChange={(e) => setEditing({ ...editing, country_code: e.target.value })} placeholder="SA, AE, EG..." /></div>
                <div><Label>{isAr ? 'المدينة' : 'City'}</Label><Input value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
                <div><Label>{isAr ? 'اسم المالك' : 'Owner name'}</Label><Input value={editing.owner_name || ''} onChange={(e) => setEditing({ ...editing, owner_name: e.target.value })} /></div>
              </div>
              <div><Label>{isAr ? 'ملاحظات' : 'Notes'}</Label><Textarea rows={2} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>{isAr ? 'نشط' : 'Active'}</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => editing?.name && save.mutate(editing)} disabled={!editing?.name || save.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
