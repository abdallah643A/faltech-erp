import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GitBranch, Plus, Trash2, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Pipeline { id: string; name: string; name_ar?: string; region: string; country_code?: string; business_unit?: string; description?: string; is_default: boolean; is_active: boolean; }
interface Stage { id: string; pipeline_id: string; stage_order: number; stage_key: string; label_en: string; label_ar?: string; probability_pct: number; is_won: boolean; is_lost: boolean; }

export default function CRMRegionalPipelines() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Pipeline> | null>(null);
  const [stageEdit, setStageEdit] = useState<{ pipeline: Pipeline; stage: Partial<Stage> } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: pipelines = [] } = useQuery({
    queryKey: ['regional-pipelines'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('crm_regional_pipelines' as any).select('*').order('region') as any);
      if (error) throw error;
      return (data ?? []) as Pipeline[];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('crm_pipeline_stages' as any).select('*').order('stage_order') as any);
      if (error) throw error;
      return (data ?? []) as Stage[];
    },
  });

  const stagesByPipeline = useMemo(() => {
    const m = new Map<string, Stage[]>();
    for (const s of stages) {
      if (!m.has(s.pipeline_id)) m.set(s.pipeline_id, []);
      m.get(s.pipeline_id)!.push(s);
    }
    return m;
  }, [stages]);

  const savePipeline = useMutation({
    mutationFn: async (p: Partial<Pipeline>) => {
      if (p.id) {
        const { error } = await (supabase.from('crm_regional_pipelines' as any).update(p).eq('id', p.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('crm_regional_pipelines' as any).insert(p) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regional-pipelines'] }); setEditing(null); toast.success(isAr ? 'تم الحفظ' : 'Saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const removePipeline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('crm_regional_pipelines' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regional-pipelines'] }); qc.invalidateQueries({ queryKey: ['pipeline-stages'] }); toast.success(isAr ? 'تم الحذف' : 'Deleted'); },
  });

  const saveStage = useMutation({
    mutationFn: async (s: Partial<Stage>) => {
      if (s.id) {
        const { error } = await (supabase.from('crm_pipeline_stages' as any).update(s).eq('id', s.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('crm_pipeline_stages' as any).insert(s) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline-stages'] }); setStageEdit(null); toast.success(isAr ? 'تم الحفظ' : 'Saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('crm_pipeline_stages' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  });

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6" />{isAr ? 'خطوط الأنابيب الإقليمية' : 'Regional Sales Pipelines'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'خطوط مبيعات مخصصة لكل منطقة بمراحل ثنائية اللغة' : 'Region-specific pipelines with bilingual stage labels'}</p>
        </div>
        <Button onClick={() => setEditing({ is_active: true, is_default: false, region: 'GCC' })}><Plus className="h-4 w-4 mr-1" />{isAr ? 'خط أنابيب جديد' : 'New Pipeline'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{isAr ? 'خطوط الأنابيب' : 'Pipelines'} ({pipelines.length})</CardTitle></CardHeader>
        <CardContent>
          {pipelines.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{isAr ? 'لا توجد خطوط أنابيب بعد.' : 'No pipelines yet.'}</p> : (
            <div className="space-y-2">
              {pipelines.map(p => {
                const ps = stagesByPipeline.get(p.id) || [];
                const isOpen = expanded.has(p.id);
                return (
                  <div key={p.id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-3 hover:bg-muted/30 cursor-pointer" onClick={() => toggleExpanded(p.id)}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Layers className="h-4 w-4 text-primary" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{isAr && p.name_ar ? p.name_ar : p.name}</div>
                          <div className="text-[11px] text-muted-foreground">{p.region}{p.country_code && ` • ${p.country_code}`}{p.business_unit && ` • ${p.business_unit}`}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{ps.length} {isAr ? 'مرحلة' : 'stages'}</Badge>
                        {p.is_default && <Badge className="text-[10px]">{isAr ? 'افتراضي' : 'Default'}</Badge>}
                        {!p.is_active && <Badge variant="secondary" className="text-[10px]">{isAr ? 'غير نشط' : 'Inactive'}</Badge>}
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => setStageEdit({ pipeline: p, stage: { pipeline_id: p.id, stage_order: ps.length + 1, probability_pct: 0, is_won: false, is_lost: false } })}>+ {isAr ? 'مرحلة' : 'Stage'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>{isAr ? 'تعديل' : 'Edit'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(isAr ? 'حذف؟' : 'Delete?')) removePipeline.mutate(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t p-2">
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead className="w-12">#</TableHead><TableHead>{isAr ? 'المرحلة' : 'Stage'}</TableHead><TableHead>{isAr ? 'الاحتمالية' : 'Probability'}</TableHead><TableHead>{isAr ? 'النتيجة' : 'Outcome'}</TableHead><TableHead></TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {ps.map(s => (
                              <TableRow key={s.id}>
                                <TableCell className="text-xs">{s.stage_order}</TableCell>
                                <TableCell><div className="text-sm">{isAr && s.label_ar ? s.label_ar : s.label_en}</div><div className="text-[10px] text-muted-foreground font-mono">{s.stage_key}</div></TableCell>
                                <TableCell className="text-xs">{s.probability_pct}%</TableCell>
                                <TableCell>{s.is_won ? <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Won</Badge> : s.is_lost ? <Badge variant="destructive" className="text-[10px]">Lost</Badge> : <Badge variant="outline" className="text-[10px]">Open</Badge>}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="ghost" onClick={() => setStageEdit({ pipeline: p, stage: s })}>{isAr ? 'تعديل' : 'Edit'}</Button>
                                  <Button size="sm" variant="ghost" onClick={() => removeStage.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {ps.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-3">{isAr ? 'لا توجد مراحل' : 'No stages'}</TableCell></TableRow>}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? (isAr ? 'تعديل' : 'Edit Pipeline') : (isAr ? 'خط أنابيب جديد' : 'New Pipeline')}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</Label><Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>{isAr ? 'الاسم (AR)' : 'Name (AR)'}</Label><Input dir="rtl" value={editing.name_ar || ''} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} /></div>
                <div><Label>{isAr ? 'الإقليم' : 'Region'}</Label><Input value={editing.region || ''} onChange={(e) => setEditing({ ...editing, region: e.target.value })} placeholder="GCC, EU, APAC..." /></div>
                <div><Label>{isAr ? 'الدولة' : 'Country'}</Label><Input value={editing.country_code || ''} onChange={(e) => setEditing({ ...editing, country_code: e.target.value })} placeholder="SA, AE..." /></div>
                <div><Label>{isAr ? 'وحدة الأعمال' : 'Business unit'}</Label><Input value={editing.business_unit || ''} onChange={(e) => setEditing({ ...editing, business_unit: e.target.value })} /></div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><Switch checked={editing.is_default ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} /><Label>{isAr ? 'افتراضي' : 'Default'}</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>{isAr ? 'نشط' : 'Active'}</Label></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => editing?.name && editing?.region && savePipeline.mutate(editing)} disabled={!editing?.name || !editing?.region || savePipeline.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage editor */}
      <Dialog open={!!stageEdit} onOpenChange={(o) => !o && setStageEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{stageEdit?.stage.id ? (isAr ? 'تعديل المرحلة' : 'Edit Stage') : (isAr ? 'مرحلة جديدة' : 'New Stage')}</DialogTitle></DialogHeader>
          {stageEdit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{isAr ? 'الترتيب' : 'Order'}</Label><Input type="number" value={stageEdit.stage.stage_order ?? 1} onChange={(e) => setStageEdit({ ...stageEdit, stage: { ...stageEdit.stage, stage_order: Number(e.target.value) } })} /></div>
                <div><Label>{isAr ? 'الاحتمالية %' : 'Probability %'}</Label><Input type="number" value={stageEdit.stage.probability_pct ?? 0} onChange={(e) => setStageEdit({ ...stageEdit, stage: { ...stageEdit.stage, probability_pct: Number(e.target.value) } })} /></div>
                <div><Label>{isAr ? 'المفتاح' : 'Key (slug)'}</Label><Input value={stageEdit.stage.stage_key || ''} onChange={(e) => setStageEdit({ ...stageEdit, stage: { ...stageEdit.stage, stage_key: e.target.value } })} placeholder="qualified, demo, proposal..." /></div>
                <div></div>
                <div><Label>{isAr ? 'التسمية (EN)' : 'Label (EN)'}</Label><Input value={stageEdit.stage.label_en || ''} onChange={(e) => setStageEdit({ ...stageEdit, stage: { ...stageEdit.stage, label_en: e.target.value } })} /></div>
                <div><Label>{isAr ? 'التسمية (AR)' : 'Label (AR)'}</Label><Input dir="rtl" value={stageEdit.stage.label_ar || ''} onChange={(e) => setStageEdit({ ...stageEdit, stage: { ...stageEdit.stage, label_ar: e.target.value } })} /></div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><Switch checked={stageEdit.stage.is_won ?? false} onCheckedChange={(v) => setStageEdit({ ...stageEdit, stage: { ...stageEdit.stage, is_won: v, is_lost: v ? false : stageEdit.stage.is_lost } })} /><Label>Won</Label></div>
                <div className="flex items-center gap-2"><Switch checked={stageEdit.stage.is_lost ?? false} onCheckedChange={(v) => setStageEdit({ ...stageEdit, stage: { ...stageEdit.stage, is_lost: v, is_won: v ? false : stageEdit.stage.is_won } })} /><Label>Lost</Label></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStageEdit(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => stageEdit?.stage.label_en && stageEdit?.stage.stage_key && saveStage.mutate(stageEdit.stage)} disabled={!stageEdit?.stage.label_en || !stageEdit?.stage.stage_key || saveStage.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
