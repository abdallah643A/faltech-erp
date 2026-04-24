import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Play, CheckCircle, XCircle, AlertTriangle, Zap, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

type SimResult = { ruleName: string; matched: boolean; reason: string; actions: string[]; priority: number };

export default function BusinessRulesSimulator() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [tab, setTab] = useState('approval');
  const [docType, setDocType] = useState('purchase_order');
  const [amount, setAmount] = useState('50000');
  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [results, setResults] = useState<SimResult[]>([]);
  const [running, setRunning] = useState(false);

  // Approval templates
  const { data: templates = [] } = useQuery({
    queryKey: ['sim-approval-templates', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('approval_templates' as any).select('*').eq('is_active', true) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  // Margin rules
  const { data: marginRules = [] } = useQuery({
    queryKey: ['sim-margin-rules', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('margin_rules' as any).select('*').eq('is_active', true) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  // Workflow status rules
  const { data: statusRules = [] } = useQuery({
    queryKey: ['sim-status-rules', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('workflow_status_rules' as any).select('*').eq('is_active', true) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  // Accounting rules
  const { data: acctRules = [] } = useQuery({
    queryKey: ['sim-acct-rules', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('acct_determination_rules').select('*').eq('is_active', true) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const simulateApproval = () => {
    const amt = Number(amount);
    const res: SimResult[] = [];
    for (const t of templates) {
      const matchType = t.document_type === docType;
      const matchMin = !t.min_amount || amt >= t.min_amount;
      const matchMax = !t.max_amount || amt <= t.max_amount;
      const matched = matchType && matchMin && matchMax;
      res.push({
        ruleName: t.name, matched, priority: t.priority || 0,
        reason: !matchType ? `Document type mismatch (${t.document_type} ≠ ${docType})` : !matchMin ? `Amount ${amt} below min ${t.min_amount}` : !matchMax ? `Amount ${amt} above max ${t.max_amount}` : 'All conditions met',
        actions: matched ? ['Approval workflow triggered', `SLA: ${t.sla_hours || 24}h`] : [],
      });
    }
    return res.sort((a, b) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0));
  };

  const simulateMargin = () => {
    const amt = Number(amount);
    const res: SimResult[] = [];
    for (const r of marginRules) {
      const matchType = !r.document_type || r.document_type === docType;
      const matched = matchType;
      res.push({
        ruleName: r.rule_name, matched, priority: r.priority || 0,
        reason: matched ? `Min margin: ${r.min_margin_percent}%, Warning at: ${r.warning_margin_percent}%` : `Type mismatch`,
        actions: matched ? [r.block_below_min ? 'Block if below minimum' : 'Warn only', `Approval required below ${r.approval_required_below}%`] : [],
      });
    }
    return res;
  };

  const simulateWorkflow = () => {
    const res: SimResult[] = [];
    for (const r of statusRules) {
      const matchType = r.module === docType;
      res.push({
        ruleName: `${r.from_status} → ${r.to_status}`, matched: matchType, priority: r.priority || 0,
        reason: matchType ? `Transition allowed: ${r.from_status} → ${r.to_status}` : `Module mismatch (${r.module})`,
        actions: matchType ? [r.requires_approval ? 'Requires approval' : 'Auto-transition', ...(r.required_fields || []).map((f: string) => `Required: ${f}`)] : [],
      });
    }
    return res;
  };

  const simulateAccounting = () => {
    const res: SimResult[] = [];
    for (const r of acctRules) {
      const matchType = r.document_type === docType;
      res.push({
        ruleName: r.rule_name, matched: matchType, priority: r.priority,
        reason: matchType ? `Priority ${r.priority} - ${r.description || 'No description'}` : `Document type mismatch`,
        actions: matchType ? ['Journal entry will be generated', `Active: ${r.is_active}`] : [],
      });
    }
    return res.sort((a, b) => a.priority - b.priority);
  };

  const runSimulation = () => {
    setRunning(true);
    setTimeout(() => {
      let res: SimResult[] = [];
      if (tab === 'approval') res = simulateApproval();
      else if (tab === 'margin') res = simulateMargin();
      else if (tab === 'workflow') res = simulateWorkflow();
      else if (tab === 'accounting') res = simulateAccounting();
      setResults(res);
      setRunning(false);
      toast.success(`Simulation complete. ${res.filter(r => r.matched).length}/${res.length} rules matched.`);
    }, 500);
  };

  const matchedCount = results.filter(r => r.matched).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Rules Simulator</h1>
        <p className="text-muted-foreground">Test rules before publishing — see which conditions match and what actions trigger</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Test Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Rule Category</Label>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="approval">Approval</TabsTrigger>
                  <TabsTrigger value="margin">Margin</TabsTrigger>
                </TabsList>
                <TabsList className="w-full grid grid-cols-2 mt-1">
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="accounting">Accounting</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div><Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="purchase_order">Purchase Order</SelectItem>
                <SelectItem value="sales_order">Sales Order</SelectItem>
                <SelectItem value="ar_invoice">AR Invoice</SelectItem>
                <SelectItem value="ap_invoice">AP Invoice</SelectItem>
                <SelectItem value="leave_request">Leave Request</SelectItem>
                <SelectItem value="material_request">Material Request</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="goods_receipt">Goods Receipt PO</SelectItem>
              </SelectContent></Select>
            </div>
            <div><Label>Amount (SAR)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div><Label>Branch (optional)</Label><Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Branch name" /></div>
            <Separator />
            <Button className="w-full" onClick={runSimulation} disabled={running}><Play className="h-4 w-4 mr-2" />{running ? 'Running...' : 'Run Simulation'}</Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-6 text-center"><CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" /><p className="text-xl font-bold text-green-600">{matchedCount}</p><p className="text-xs text-muted-foreground">Rules Matched</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><XCircle className="h-6 w-6 mx-auto text-muted-foreground mb-1" /><p className="text-xl font-bold">{results.length - matchedCount}</p><p className="text-xs text-muted-foreground">Not Matched</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><BookOpen className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-xl font-bold">{results.length}</p><p className="text-xs text-muted-foreground">Total Rules</p></CardContent></Card>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Simulation Results</CardTitle></CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Configure parameters and run simulation</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Rule</TableHead><TableHead>Match</TableHead><TableHead>Reason</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow key={i} className={r.matched ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                        <TableCell className="font-medium">{r.ruleName}</TableCell>
                        <TableCell>{r.matched ? <Badge className="bg-green-100 text-green-800">✓ Matched</Badge> : <Badge variant="secondary">✗ No Match</Badge>}</TableCell>
                        <TableCell className="text-sm">{r.reason}</TableCell>
                        <TableCell>{r.actions.map((a, j) => <Badge key={j} variant="outline" className="mr-1 mb-1">{a}</Badge>)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
