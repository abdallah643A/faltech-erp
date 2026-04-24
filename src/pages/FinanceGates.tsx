import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCostVariances } from '@/hooks/useDesignCosting';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import {
  DollarSign, Search, MoreHorizontal, CheckCircle, XCircle,
  AlertTriangle, TrendingUp, CreditCard, ShieldCheck, FileText, X, Plus, Smartphone,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import BankPOSPaymentDialog from '@/components/pos/BankPOSPaymentDialog';
import { useLanguage } from '@/contexts/LanguageContext';

// Fetch projects in a specific finance phase with payment info
function useFinanceGateProjects(gate: 'gate1' | 'gate2' | 'gate3') {
  const { t } = useLanguage();

  const phase = gate === 'gate1' ? 'finance_verification' : gate === 'gate2' ? 'finance_gate_2' : 'final_payment';

  return useQuery({
    queryKey: ['finance-gate-projects', gate],
    queryFn: async () => {
      // Get projects in this phase
      const { data: phases, error: phaseError } = await supabase
        .from('project_phases')
        .select('project_id')
        .eq('phase', phase)
        .eq('status', 'in_progress');
      if (phaseError) throw phaseError;
      if (!phases || phases.length === 0) return [];

      const projectIds = phases.map(p => p.project_id);

      // Get project + sales order details
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select('id, name, contract_value, sap_sales_order_id')
        .in('id', projectIds);
      if (projError) throw projError;

      // For each project get linked sales order and payments
      const results = await Promise.all((projects || []).map(async (proj) => {
        const { data: salesOrder } = await supabase
          .from('sales_orders')
          .select('id, doc_num, customer_name, customer_code, contract_value, total')
          .eq('project_id', proj.id)
          .limit(1)
          .single();

        const salesOrderId = salesOrder?.id;
        let totalPaid = 0;
        let payments: any[] = [];

        if (salesOrderId) {
          const { data: paymentData } = await supabase
            .from('incoming_payments')
            .select('*')
            .eq('sales_order_id', salesOrderId)
            .neq('status', 'cancelled')
            .order('doc_date', { ascending: false });
          payments = paymentData || [];
          totalPaid = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        }

        const contractValue = salesOrder?.contract_value || salesOrder?.total || proj.contract_value || 0;
        const required = gate === 'gate1' ? contractValue * 0.5 : gate === 'gate2' ? contractValue * 0.5 : contractValue;

        return {
          projectId: proj.id,
          projectName: proj.name,
          salesOrderId,
          docNum: salesOrder?.doc_num,
          customerName: salesOrder?.customer_name,
          customerCode: salesOrder?.customer_code,
          contractValue,
          totalPaid,
          required,
          remaining: Math.max(0, required - totalPaid),
          isSufficient: totalPaid >= required,
          payments,
        };
      }));

      return results;
    },
  });
}

export default function FinanceGates() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { variances, isLoading: variancesLoading, approveVariance, rejectVariance } = useCostVariances();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGate, setActiveGate] = useState('gate1');
  const [cardFilter, setCardFilter] = useState<'all' | 'ready' | 'insufficient'>('all');
  const [showBankPOS, setShowBankPOS] = useState(false);
  const [posPaymentProject, setPosPaymentProject] = useState<any>(null);

  const { data: gate1Projects, isLoading: gate1Loading } = useFinanceGateProjects('gate1');
  const { data: gate2Projects, isLoading: gate2Loading } = useFinanceGateProjects('gate2');
  const { data: gate3Projects, isLoading: gate3Loading } = useFinanceGateProjects('gate3');

  const navigateToPayment = (proj: any) => {
    const prefill = encodeURIComponent(JSON.stringify({
      sales_order_id: proj.salesOrderId || '',
      customer_code: proj.customerCode || '',
      customer_name: proj.customerName || '',
      total_amount: proj.remaining || 0,
      reference: `SO-${proj.docNum || ''}`,
      remarks: `Payment for SO-${proj.docNum || ''} - ${proj.projectName || ''}`,
    }));
    navigate(`/incoming-payments?prefill=${prefill}`);
  };

  // Fetch payment_verification alerts for Gate 1
  const { data: gate1Alerts } = useQuery({
    queryKey: ['gate1-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`*, sales_order:sales_orders(doc_num, customer_name, contract_value)`)
        .in('alert_type', ['payment_verification'])
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch cost_variance_sales alerts for Gate 2
  const { data: gate2Alerts } = useQuery({
    queryKey: ['gate2-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`*, sales_order:sales_orders(doc_num, customer_name, contract_value)`)
        .in('alert_type', ['cost_variance_sales'])
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch final_payment_sales alerts for Gate 3
  const { data: gate3Alerts } = useQuery({
    queryKey: ['gate3-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`*, sales_order:sales_orders(doc_num, customer_name, contract_value)`)
        .in('alert_type', ['final_payment_sales'])
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Approve Gate 1 (50% down payment)
  const confirmGate1 = useMutation({
    mutationFn: async ({ clearanceId, notes }: { clearanceId: string; notes?: string }) => {
      const { error } = await supabase.rpc('approve_financial_clearance', {
        p_clearance_id: clearanceId,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-gate-projects'] });
      queryClient.invalidateQueries({ queryKey: ['gate1-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-clearances'] });
      toast({ title: 'Finance Gate 1 approved', description: 'Project advanced to Technical Assessment' });
    },
    onError: (error: Error) => {
      toast({ title: 'Cannot confirm Gate 1', description: error.message, variant: 'destructive' });
    },
  });

  // Confirm Finance Gate 2
  const confirmGate2 = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('confirm_finance_gate_2', { p_project_id: projectId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-gate-projects'] });
      queryClient.invalidateQueries({ queryKey: ['gate2-alerts'] });
      toast({ title: 'Finance Gate 2 approved', description: 'Project advanced to Procurement phase' });
    },
    onError: (error: Error) => {
      toast({ title: 'Cannot confirm Gate 2', description: error.message, variant: 'destructive' });
    },
  });

  // Confirm Final Payment (Gate 3)
  const confirmGate3 = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('confirm_final_payment', { p_project_id: projectId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-gate-projects'] });
      queryClient.invalidateQueries({ queryKey: ['gate3-alerts'] });
      toast({ title: 'Final payment confirmed', description: 'Project advanced to Delivery & Installation' });
    },
    onError: (error: Error) => {
      toast({ title: 'Cannot confirm final payment', description: error.message, variant: 'destructive' });
    },
  });

  // Gate 1: fetch financial clearances for pending projects
  const { data: gate1Clearances } = useQuery({
    queryKey: ['gate1-clearances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_clearances')
        .select('id, sales_order_id, project_id, status')
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
  });

  // Cost variance stats
  const gate2Variances = (variances || []).filter(v =>
    !searchTerm || v.variance_reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const pendingGate1 = gate1Projects?.filter(p => !p.isSufficient).length || 0;
  const pendingGate2 = gate2Projects?.filter(p => !p.isSufficient).length || 0;
  const gate3Pending = gate3Projects?.filter(p => !p.isSufficient).length || 0;

  // Helper to find clearance for a project
  const getClearanceForProject = (projectId: string) => 
    gate1Clearances?.find(c => c.project_id === projectId);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Gates</h1>
          <p className="text-muted-foreground">Down payment (Gate 1), cost variance (Gate 2), and final payment (Gate 3) — linked to Incoming Payments</p>
        </div>
      </div>

      {/* Gate Selector */}
      <Tabs value={activeGate} onValueChange={(v) => { setActiveGate(v); setCardFilter('all'); }}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="gate1" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Gate 1 — Down Payment ({gate1Projects?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="gate2" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Gate 2 — Cost Variance ({gate2Projects?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="gate3" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Gate 3 — Final Payment ({gate3Projects?.length || 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Finance Gate 1: Down Payment 50% */}
      {activeGate === 'gate1' && (
        <>
          {gate1Alerts && gate1Alerts.length > 0 && (
            <div className="space-y-3">
              {gate1Alerts.map((alert) => (
                <Alert key={alert.id} variant="destructive" className="border-primary bg-primary/5 text-foreground">
                  <ShieldCheck className="h-4 w-4 !text-primary" />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription className="text-sm mt-1">{alert.description}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'all' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('all')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ShieldCheck className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{gate1Projects?.length || 0}</p><p className="text-xs text-muted-foreground">Pending Down Payment</p></div></div></CardContent></Card>
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'ready' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('ready')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{gate1Projects?.filter(p => p.isSufficient).length || 0}</p><p className="text-xs text-muted-foreground">Ready to Approve</p></div></div></CardContent></Card>
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'insufficient' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('insufficient')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10"><XCircle className="h-5 w-5 text-red-500" /></div><div><p className="text-2xl font-bold">{pendingGate1}</p><p className="text-xs text-muted-foreground">Insufficient Payment</p></div></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Down Payment Verification (50% of Contract)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contract Value</TableHead>
                    <TableHead>Required (50%)</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-[50px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gate1Loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                  ) : !gate1Projects || gate1Projects.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No projects pending Gate 1 verification</TableCell></TableRow>
                  ) : (
                    gate1Projects.filter(p => cardFilter === 'all' ? true : cardFilter === 'ready' ? p.isSufficient : !p.isSufficient).map((proj) => {
                      const clearance = getClearanceForProject(proj.projectId);
                      return (
                        <TableRow key={proj.projectId}>
                          <TableCell className="font-mono">SO-{proj.docNum || '—'}</TableCell>
                          <TableCell className="font-medium">{proj.customerName || '—'}</TableCell>
                          <TableCell>{proj.contractValue.toLocaleString()} SAR</TableCell>
                          <TableCell className="font-semibold">{proj.required.toLocaleString()} SAR</TableCell>
                          <TableCell className={proj.isSufficient ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                            {proj.totalPaid.toLocaleString()} SAR
                          </TableCell>
                          <TableCell className={proj.remaining > 0 ? 'text-red-500' : 'text-green-600'}>
                            {proj.remaining.toLocaleString()} SAR
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{proj.payments.length} payment(s)</Badge>
                          </TableCell>
                          <TableCell>
                            {proj.isSufficient ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">Ready</Badge>
                            ) : (
                              <Badge variant="destructive">Insufficient</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => navigateToPayment(proj)}>
                                <Plus className="h-4 w-4 mr-1" />Payment
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setPosPaymentProject(proj); setShowBankPOS(true); }}>
                                <Smartphone className="h-4 w-4 mr-1" />POS
                              </Button>
                              {proj.isSufficient && clearance && (
                                <Button size="sm" onClick={() => confirmGate1.mutate({ clearanceId: clearance.id })} disabled={confirmGate1.isPending}>
                                  <CheckCircle className="h-4 w-4 mr-1" />Approve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Finance Gate 2 */}
      {activeGate === 'gate2' && (
        <>
          {/* Alerts */}
          {gate2Alerts && gate2Alerts.length > 0 && (
            <div className="space-y-3">
              {gate2Alerts.map((alert) => (
                <Alert key={alert.id} variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 !text-amber-600" />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription className="text-sm mt-1">{alert.description}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'all' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('all')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{gate2Projects?.length || 0}</p><p className="text-xs text-muted-foreground">Projects in Gate 2</p></div></div></CardContent></Card>
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'ready' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('ready')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{gate2Projects?.filter(p => p.isSufficient).length || 0}</p><p className="text-xs text-muted-foreground">Ready to Approve</p></div></div></CardContent></Card>
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'insufficient' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('insufficient')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10"><XCircle className="h-5 w-5 text-red-500" /></div><div><p className="text-2xl font-bold">{pendingGate2}</p><p className="text-xs text-muted-foreground">Insufficient Payment</p></div></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Variance Payment Verification (50% of New Cost)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>New Contract Value</TableHead>
                    <TableHead>Required (50%)</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-[50px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gate2Loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                  ) : !gate2Projects || gate2Projects.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No projects pending Gate 2 verification</TableCell></TableRow>
                  ) : (
                    gate2Projects.filter(p => cardFilter === 'all' ? true : cardFilter === 'ready' ? p.isSufficient : !p.isSufficient).map((proj) => (
                      <TableRow key={proj.projectId}>
                        <TableCell className="font-mono">SO-{proj.docNum || '—'}</TableCell>
                        <TableCell className="font-medium">{proj.customerName || '—'}</TableCell>
                        <TableCell>{proj.contractValue.toLocaleString()} SAR</TableCell>
                        <TableCell className="font-semibold">{proj.required.toLocaleString()} SAR</TableCell>
                        <TableCell className={proj.isSufficient ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {proj.totalPaid.toLocaleString()} SAR
                        </TableCell>
                        <TableCell className={proj.remaining > 0 ? 'text-red-500' : 'text-green-600'}>
                          {proj.remaining.toLocaleString()} SAR
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{proj.payments.length} payment(s)</Badge>
                        </TableCell>
                        <TableCell>
                          {proj.isSufficient ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">Ready</Badge>
                          ) : (
                            <Badge variant="destructive">Insufficient</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={() => navigateToPayment(proj)}>
                              <Plus className="h-4 w-4 mr-1" />Payment
                            </Button>
                            {proj.isSufficient && (
                              <Button size="sm" onClick={() => confirmGate2.mutate(proj.projectId)} disabled={confirmGate2.isPending}>
                                <CheckCircle className="h-4 w-4 mr-1" />Confirm
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Finance Gate 3: Final Payment */}
      {activeGate === 'gate3' && (
        <>
          {/* Alerts */}
          {gate3Alerts && gate3Alerts.length > 0 && (
            <div className="space-y-3">
              {gate3Alerts.map((alert) => (
                <Alert key={alert.id} variant="destructive" className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
                  <CreditCard className="h-4 w-4 !text-emerald-600" />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription className="text-sm mt-1">{alert.description}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'all' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('all')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{gate3Projects?.length || 0}</p><p className="text-xs text-muted-foreground">Pending Final Payment</p></div></div></CardContent></Card>
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'ready' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('ready')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{gate3Projects?.filter(p => p.isSufficient).length || 0}</p><p className="text-xs text-muted-foreground">Ready to Confirm</p></div></div></CardContent></Card>
            <Card className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'insufficient' ? 'ring-2 ring-primary' : ''}`} onClick={() => setCardFilter('insufficient')}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10"><XCircle className="h-5 w-5 text-red-500" /></div><div><p className="text-2xl font-bold">{gate3Pending}</p><p className="text-xs text-muted-foreground">Awaiting Payment</p></div></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Final Payment Verification (100% of Contract)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contract Value</TableHead>
                    <TableHead>Required (100%)</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-[50px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gate3Loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                  ) : !gate3Projects || gate3Projects.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No projects pending final payment verification</TableCell></TableRow>
                  ) : (
                    gate3Projects.filter(p => cardFilter === 'all' ? true : cardFilter === 'ready' ? p.isSufficient : !p.isSufficient).map((proj) => (
                      <TableRow key={proj.projectId}>
                        <TableCell className="font-mono">SO-{proj.docNum || '—'}</TableCell>
                        <TableCell className="font-medium">{proj.customerName || '—'}</TableCell>
                        <TableCell>{proj.contractValue.toLocaleString()} SAR</TableCell>
                        <TableCell className="font-semibold">{proj.required.toLocaleString()} SAR</TableCell>
                        <TableCell className={proj.isSufficient ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {proj.totalPaid.toLocaleString()} SAR
                        </TableCell>
                        <TableCell className={proj.remaining > 0 ? 'text-red-500' : 'text-green-600'}>
                          {proj.remaining.toLocaleString()} SAR
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{proj.payments.length} payment(s)</Badge>
                        </TableCell>
                        <TableCell>
                          {proj.isSufficient ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">Ready</Badge>
                          ) : (
                            <Badge variant="destructive">Insufficient</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={() => navigateToPayment(proj)}>
                              <Plus className="h-4 w-4 mr-1" />Payment
                            </Button>
                            {proj.isSufficient && (
                              <Button size="sm" onClick={() => confirmGate3.mutate(proj.projectId)} disabled={confirmGate3.isPending}>
                                <CheckCircle className="h-4 w-4 mr-1" />Confirm
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      <BankPOSPaymentDialog
        open={showBankPOS}
        onOpenChange={setShowBankPOS}
        amount={posPaymentProject?.remaining || 0}
        sourceModule="finance_gates"
        sourceDocumentId={posPaymentProject?.salesOrderId}
        sourceDocumentNumber={posPaymentProject?.contractNumber || `SO-${posPaymentProject?.docNum}`}
        customerName={posPaymentProject?.customerName}
        onPaymentComplete={() => {
          setShowBankPOS(false);
          queryClient.invalidateQueries({ queryKey: ['finance-gate-projects'] });
        }}
      />
    </div>
  );
}
