import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Target } from 'lucide-react';

const PERSPECTIVES = [
  { value: 'financial', label: 'Financial', labelAr: 'مالي' },
  { value: 'customer', label: 'Customer', labelAr: 'العميل' },
  { value: 'internal', label: 'Internal Process', labelAr: 'العمليات الداخلية' },
  { value: 'learning', label: 'Learning & Growth', labelAr: 'التعلم والنمو' },
];

interface Props { isAr?: boolean }

/**
 * StrategicScorecard — Balanced Scorecard view for PR1.
 * Reads scorecard_entries grouped by perspective, with RAG status and inline add.
 */
export function StrategicScorecard({ isAr = false }: Props) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    perspective: 'financial',
    measure_name: '',
    target_value: 0,
    actual_value: 0,
    period: 'mtd',
    rag_status: 'green',
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['scorecard_entries', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('scorecard_entries' as any).select('*').order('perspective');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const addEntry = useMutation({
    mutationFn: async (payload: any) => {
      const variance = payload.target_value
        ? ((payload.actual_value - payload.target_value) / payload.target_value) * 100
        : 0;
      const { error } = await supabase.from('scorecard_entries' as any).insert({
        ...payload,
        company_id: activeCompanyId,
        variance_percent: variance,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isAr ? 'تمت الإضافة' : 'Scorecard entry added');
      qc.invalidateQueries({ queryKey: ['scorecard_entries'] });
      setOpen(false);
      setForm({ perspective: 'financial', measure_name: '', target_value: 0, actual_value: 0, period: 'mtd', rag_status: 'green' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ragVariant = (rag: string): 'default' | 'secondary' | 'destructive' | 'outline' =>
    rag === 'green' ? 'default' : rag === 'amber' ? 'secondary' : rag === 'red' ? 'destructive' : 'outline';

  const grouped = PERSPECTIVES.map((p) => ({
    ...p,
    items: entries.filter((e) => e.perspective === p.value),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          {isAr ? 'بطاقة الأداء المتوازن' : 'Balanced Scorecard'}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />{isAr ? 'إضافة' : 'Add Measure'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'إضافة مقياس' : 'Add Scorecard Measure'}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>{isAr ? 'المنظور' : 'Perspective'}</Label>
              <Select value={form.perspective} onValueChange={(v) => setForm({ ...form, perspective: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERSPECTIVES.map((p) => <SelectItem key={p.value} value={p.value}>{isAr ? p.labelAr : p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Label>{isAr ? 'اسم المقياس' : 'Measure name'}</Label>
              <Input value={form.measure_name} onChange={(e) => setForm({ ...form, measure_name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{isAr ? 'الهدف' : 'Target'}</Label>
                  <Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>{isAr ? 'الفعلي' : 'Actual'}</Label>
                  <Input type="number" value={form.actual_value} onChange={(e) => setForm({ ...form, actual_value: Number(e.target.value) })} />
                </div>
              </div>
              <Label>RAG</Label>
              <Select value={form.rag_status} onValueChange={(v) => setForm({ ...form, rag_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={() => addEntry.mutate(form)} disabled={!form.measure_name}>
                {isAr ? 'حفظ' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped.map((g) => (
          <div key={g.value}>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              {isAr ? g.labelAr : g.label}
            </div>
            {g.items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{isAr ? 'لا توجد مقاييس' : 'No measures yet'}</p>
            ) : (
              <div className="space-y-1">
                {g.items.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{isAr && e.measure_name_ar ? e.measure_name_ar : e.measure_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {isAr ? 'الفعلي' : 'Actual'}: {Number(e.actual_value).toLocaleString()} •
                        {' '}{isAr ? 'الهدف' : 'Target'}: {Number(e.target_value).toLocaleString()} •
                        {' '}{isAr ? 'الانحراف' : 'Var'}: {Number(e.variance_percent || 0).toFixed(1)}%
                      </div>
                    </div>
                    <Badge variant={ragVariant(e.rag_status)}>{e.rag_status?.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
