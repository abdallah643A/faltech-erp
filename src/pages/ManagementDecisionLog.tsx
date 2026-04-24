import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ManagementDecisionLog() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ decision_title: '', decision_type: 'approval', description: '', rationale: '', decided_by_name: '', decision_date: new Date().toISOString().split('T')[0] });

  const { data: decisions = [] } = useQuery({
    queryKey: ['management-decisions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('management_decisions' as any).select('*').order('decision_date', { ascending: false }).limit(100) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const createDecision = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('management_decisions' as any).insert({ ...form, company_id: activeCompanyId, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['management-decisions'] }); setShowCreate(false); toast({ title: 'Decision recorded' }); },
  });

  const TYPES = ['approval', 'policy_override', 'exception', 'pricing_approval', 'budget_override', 'commercial_decision', 'strategic', 'risk_acceptance'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Management Decision Log</h1>
          <p className="text-muted-foreground">Record major approvals, overrides, and strategic decisions</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Record Decision</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {[{ label: 'Total Decisions', value: decisions.length, icon: BookOpen },
          { label: 'This Month', value: decisions.filter((d: any) => new Date(d.decision_date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length, icon: Calendar },
          { label: 'Active', value: decisions.filter((d: any) => d.status === 'active').length, icon: FileText },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Decision</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Decided By</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>Document</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {decisions.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell><div className="font-medium text-sm">{d.decision_title}</div><div className="text-xs text-muted-foreground max-w-[250px] truncate">{d.rationale}</div></TableCell>
                  <TableCell><Badge variant="outline">{d.decision_type}</Badge></TableCell>
                  <TableCell className="text-sm">{d.decided_by_name || '—'}</TableCell>
                  <TableCell className="text-sm">{format(new Date(d.decision_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-sm">{d.linked_document_number || '—'}</TableCell>
                  <TableCell><Badge variant={d.status === 'active' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell>
                </TableRow>
              ))}
              {decisions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No decisions recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Decision</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Decision Title</Label><Input value={form.decision_title} onChange={e => setForm(p => ({ ...p, decision_title: e.target.value }))} placeholder="e.g. Approved 15% discount for Project XYZ" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.type')}</Label><Select value={form.decision_type} onValueChange={v => setForm(p => ({ ...p, decision_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('common.date')}</Label><Input type="date" value={form.decision_date} onChange={e => setForm(p => ({ ...p, decision_date: e.target.value }))} /></div>
            </div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Rationale</Label><Textarea value={form.rationale} onChange={e => setForm(p => ({ ...p, rationale: e.target.value }))} placeholder="Why was this decision made?" /></div>
            <div><Label>Decided By</Label><Input value={form.decided_by_name} onChange={e => setForm(p => ({ ...p, decided_by_name: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => createDecision.mutate()} disabled={!form.decision_title}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
