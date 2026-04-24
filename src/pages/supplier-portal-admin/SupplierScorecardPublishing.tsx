import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Award, Plus, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function SupplierScorecardPublishing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ vendor_id: '', period_start: '', period_end: '', overall_score: 0, on_time_pct: 0, quality_score: 0, response_time: 0 });

  const { data: pubs = [] } = useQuery({
    queryKey: ['scorecard-pubs'],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_scorecard_publications' as any).select('*').order('published_at', { ascending: false });
      return data || [];
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_scorecard_publications' as any).insert({
        vendor_id: form.vendor_id || null,
        period_start: form.period_start,
        period_end: form.period_end,
        overall_score: Number(form.overall_score),
        metrics: { on_time_pct: Number(form.on_time_pct), quality_score: Number(form.quality_score), response_time_hours: Number(form.response_time) },
        is_visible_to_supplier: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scorecard-pubs'] }); toast({ title: 'Scorecard published' }); setOpen(false); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase.from('supplier_scorecard_publications' as any).update({ is_visible_to_supplier: visible }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scorecard-pubs'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scorecard Publishing</h2>
          <p className="text-sm text-muted-foreground">Publish supplier performance scorecards visible in their portal</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Publish Scorecard</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Period</TableHead><TableHead>Score</TableHead><TableHead>Visible</TableHead><TableHead>Published</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {pubs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No published scorecards</TableCell></TableRow> :
                pubs.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.vendor_id?.slice(0, 8) || '-'}</TableCell>
                    <TableCell>{p.period_start} → {p.period_end}</TableCell>
                    <TableCell><Badge className="bg-purple-500/10 text-purple-500"><Award className="h-3 w-3 mr-1" />{p.overall_score?.toFixed(1)}</Badge></TableCell>
                    <TableCell>{p.is_visible_to_supplier ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-xs">{format(new Date(p.published_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: p.id, visible: !p.is_visible_to_supplier })}>Toggle</Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publish Scorecard</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Vendor ID (optional)</Label><Input value={form.vendor_id} onChange={e => setForm((p: any) => ({ ...p, vendor_id: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={e => setForm((p: any) => ({ ...p, period_start: e.target.value }))} /></div>
              <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={e => setForm((p: any) => ({ ...p, period_end: e.target.value }))} /></div>
            </div>
            <div><Label>Overall Score (0-100)</Label><Input type="number" value={form.overall_score} onChange={e => setForm((p: any) => ({ ...p, overall_score: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>On-time %</Label><Input type="number" value={form.on_time_pct} onChange={e => setForm((p: any) => ({ ...p, on_time_pct: e.target.value }))} /></div>
              <div><Label>Quality</Label><Input type="number" value={form.quality_score} onChange={e => setForm((p: any) => ({ ...p, quality_score: e.target.value }))} /></div>
              <div><Label>Response (h)</Label><Input type="number" value={form.response_time} onChange={e => setForm((p: any) => ({ ...p, response_time: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => publish.mutate()} disabled={publish.isPending}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
