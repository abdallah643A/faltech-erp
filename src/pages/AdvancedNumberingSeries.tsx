import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdvancedNumberingSeries() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ seriesName: '', documentType: 'ar_invoice', prefix: '', suffix: '', nextNumber: '1', padLength: '6', fiscalYear: new Date().getFullYear(), resetRule: 'never', isDefault: false });

  const { data: series = [] } = useQuery({
    queryKey: ['numbering-series-adv', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('numbering_series' as any).select('*').order('document_type') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (f: any) => {
      const { error } = await (supabase.from('numbering_series' as any).insert({
        series_name: f.seriesName, document_type: f.documentType, prefix: f.prefix,
        suffix: f.suffix || null, next_number: parseInt(f.nextNumber) || 1,
        pad_length: parseInt(f.padLength) || 6, fiscal_year: f.fiscalYear,
        reset_rule: f.resetRule, is_default: f.isDefault,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['numbering-series-adv'] }); toast.success('Series created'); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const preview = `${form.prefix}${'0'.repeat(Math.max(0, parseInt(form.padLength || '6') - form.nextNumber.length))}${form.nextNumber}${form.suffix || ''}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advanced Numbering Series</h1>
          <p className="text-muted-foreground">Custom prefixes, reset rules and duplicate prevention per company, branch and document type</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Series</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Numbering Series</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Series Name</Label><Input value={form.seriesName} onChange={e => setForm(f => ({ ...f, seriesName: e.target.value }))} /></div>
              <div><Label>Document Type</Label>
                <Select value={form.documentType} onValueChange={v => setForm(f => ({ ...f, documentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['ar_invoice','ap_invoice','sales_order','purchase_order','delivery_note','goods_receipt','journal_entry','quotation','leave_request','payment'].map(d => (
                      <SelectItem key={d} value={d}>{d.replace(/_/g, ' ').toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Prefix</Label><Input value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} placeholder="INV-" /></div>
                <div><Label>Suffix</Label><Input value={form.suffix} onChange={e => setForm(f => ({ ...f, suffix: e.target.value }))} /></div>
                <div><Label>Pad Length</Label><Input type="number" value={form.padLength} onChange={e => setForm(f => ({ ...f, padLength: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Next Number</Label><Input type="number" value={form.nextNumber} onChange={e => setForm(f => ({ ...f, nextNumber: e.target.value }))} /></div>
                <div><Label>Fiscal Year</Label><Input type="number" value={form.fiscalYear} onChange={e => setForm(f => ({ ...f, fiscalYear: parseInt(e.target.value) }))} /></div>
              </div>
              <div><Label>Reset Rule</Label>
                <Select value={form.resetRule} onValueChange={v => setForm(f => ({ ...f, resetRule: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem><SelectItem value="yearly">Yearly</SelectItem><SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} /><Label>Default Series</Label></div>
              <div className="p-3 bg-muted rounded-lg text-center"><p className="text-sm text-muted-foreground">Preview</p><p className="font-mono text-lg">{preview}</p></div>
              <Button onClick={() => create.mutate(form)} disabled={create.isPending} className="w-full">Create Series</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Numbering Series</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>Doc Type</TableHead><TableHead>Prefix</TableHead><TableHead>Next #</TableHead><TableHead>Year</TableHead><TableHead>Reset</TableHead><TableHead>Default</TableHead><TableHead>{t('common.active')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {series.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.series_name}</TableCell>
                  <TableCell><Badge variant="outline">{s.document_type}</Badge></TableCell>
                  <TableCell className="font-mono">{s.prefix}</TableCell>
                  <TableCell>{s.next_number}</TableCell>
                  <TableCell>{s.fiscal_year || '—'}</TableCell>
                  <TableCell>{s.reset_rule}</TableCell>
                  <TableCell>{s.is_default ? <Badge>Default</Badge> : '—'}</TableCell>
                  <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
              {series.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No numbering series configured</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
