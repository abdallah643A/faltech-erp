import { useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert, Plus, Edit, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MarginProtection() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['margin-rules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('margin_rules' as any).select('*') as any).order('module');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['margin-exceptions', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('margin_exceptions' as any).select('*') as any).order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [ruleDialog, setRuleDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ module: 'quotes', min_margin_pct: 15, warning_margin_pct: 20, requires_approval_below: 10, block_below: 5, discount_reason_required: true, competitor_price_required: false, is_active: true });

  const saveRule = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, company_id: activeCompanyId, created_by: user?.id };
      if (editId) { await (supabase.from('margin_rules' as any).update(payload) as any).eq('id', editId); }
      else { await (supabase.from('margin_rules' as any).insert(payload) as any); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['margin-rules'] }); setRuleDialog(false); toast({ title: 'Saved' }); },
  });

  const approveException = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('margin_exceptions' as any).update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['margin-exceptions'] }); toast({ title: 'Approved' }); },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => { await supabase.from('margin_rules' as any).delete().eq('id', id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['margin-rules'] }),
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ShieldAlert className="h-6 w-6" /> Margin Protection & Pricing Guardrails</h1>
          <p className="text-muted-foreground text-sm">Configure minimum margins, discount controls, and pricing approval thresholds</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm({ module: 'quotes', min_margin_pct: 15, warning_margin_pct: 20, requires_approval_below: 10, block_below: 5, discount_reason_required: true, competitor_price_required: false, is_active: true }); setRuleDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Active Rules</div><div className="text-2xl font-bold">{rules.filter((r: any) => r.is_active).length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Pending Exceptions</div><div className="text-2xl font-bold">{exceptions.filter((e: any) => e.status === 'pending').length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Approved Exceptions</div><div className="text-2xl font-bold">{exceptions.filter((e: any) => e.status === 'approved').length}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Margin Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="exceptions">Pricing Exceptions ({exceptions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Min Margin %</TableHead><TableHead>Warning %</TableHead><TableHead>Approval Below %</TableHead><TableHead>Block Below %</TableHead><TableHead>{t('common.active')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="secondary">{r.module}</Badge></TableCell>
                    <TableCell className="font-mono">{r.min_margin_pct}%</TableCell>
                    <TableCell className="font-mono">{r.warning_margin_pct}%</TableCell>
                    <TableCell className="font-mono">{r.requires_approval_below || '-'}%</TableCell>
                    <TableCell className="font-mono">{r.block_below || '-'}%</TableCell>
                    <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Off'}</Badge></TableCell>
                    <TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => { setEditId(r.id); setForm(r); setRuleDialog(true); }}><Edit className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => deleteRule.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No rules</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="exceptions">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Requested Margin</TableHead><TableHead>Min Allowed</TableHead><TableHead>Discount %</TableHead><TableHead>Reason</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {exceptions.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.document_number || e.document_type}</TableCell>
                    <TableCell className="font-mono">{e.requested_margin?.toFixed(1)}%</TableCell>
                    <TableCell className="font-mono">{e.min_allowed_margin?.toFixed(1)}%</TableCell>
                    <TableCell className="font-mono">{e.discount_pct?.toFixed(1)}%</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">{e.reason || '-'}</TableCell>
                    <TableCell><Badge variant={e.status === 'pending' ? 'secondary' : e.status === 'approved' ? 'default' : 'destructive'}>{e.status}</Badge></TableCell>
                    <TableCell>{e.status === 'pending' && <Button size="sm" onClick={() => approveException.mutate(e.id)}><CheckCircle2 className="h-3 w-3 mr-1" /> Approve</Button>}</TableCell>
                  </TableRow>
                ))}
                {exceptions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No exceptions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Create'} Margin Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Module</Label><Select value={form.module} onValueChange={v => setForm({ ...form, module: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quotes">Quotations</SelectItem><SelectItem value="sales_orders">Sales Orders</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Margin %</Label><Input type="number" value={form.min_margin_pct} onChange={e => setForm({ ...form, min_margin_pct: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Warning Margin %</Label><Input type="number" value={form.warning_margin_pct} onChange={e => setForm({ ...form, warning_margin_pct: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Approval Below %</Label><Input type="number" value={form.requires_approval_below || ''} onChange={e => setForm({ ...form, requires_approval_below: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Block Below %</Label><Input type="number" value={form.block_below || ''} onChange={e => setForm({ ...form, block_below: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.discount_reason_required} onCheckedChange={v => setForm({ ...form, discount_reason_required: v })} /><Label>Require Discount Reason</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.competitor_price_required} onCheckedChange={v => setForm({ ...form, competitor_price_required: v })} /><Label>Require Competitor Price</Label></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>{t('common.active')}</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRuleDialog(false)}>{t('common.cancel')}</Button><Button onClick={() => saveRule.mutate(form)}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
