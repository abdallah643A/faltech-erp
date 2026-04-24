import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useBankPOS } from '@/hooks/useBankPOS';
import { format } from 'date-fns';
import { CreditCard, CheckCircle2, XCircle, AlertTriangle, Search, RefreshCw, ArrowLeftRight, RotateCcw, BarChart3, DollarSign, Activity, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const reconColors: Record<string, string> = {
  unreconciled: 'bg-yellow-100 text-yellow-800', reconciled: 'bg-green-100 text-green-800',
  mismatch: 'bg-red-100 text-red-800', missing_settlement: 'bg-orange-100 text-orange-800',
  duplicate: 'bg-purple-100 text-purple-800',
};
const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-800', declined: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800', failed: 'bg-red-100 text-red-800',
};

export default function POSCardReconciliationPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const { refundPayment, loading: refundLoading } = useBankPOS();
  const [payments, setPayments] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconFilter, setReconFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [payRes, refRes, auditRes] = await Promise.all([
      supabase.from('bank_pos_payments').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(500),
      supabase.from('pos_card_refunds').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('pos_payment_audit_log').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setPayments((payRes.data || []) as any[]);
    setRefunds((refRes.data || []) as any[]);
    setAuditLog((auditRes.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredPayments = payments.filter(p => {
    if (reconFilter !== 'all' && p.reconciliation_status !== reconFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return p.transaction_ref?.toLowerCase().includes(s) || p.auth_code?.toLowerCase().includes(s) || p.card_last_four?.includes(s) || p.customer_name?.toLowerCase().includes(s);
    }
    return true;
  });

  const markReconciled = async (id: string) => {
    await supabase.from('bank_pos_payments').update({ reconciliation_status: 'reconciled', reconciled_at: new Date().toISOString() } as any).eq('id', id);
    toast({ title: 'Marked as reconciled' });
    loadData();
  };

  const handleRefund = async () => {
    if (!selectedPayment || !refundAmount) return;
    const result = await refundPayment({ original_payment_id: selectedPayment.id, refund_amount: parseFloat(refundAmount), reason: refundReason });
    if (result) { setShowRefundDialog(false); loadData(); }
  };

  const openRefundDialog = (payment: any) => {
    setSelectedPayment(payment);
    setRefundAmount(String(payment.amount - (payment.refund_amount || 0)));
    setRefundReason('');
    setShowRefundDialog(true);
  };

  // Stats
  const totalApproved = payments.reduce((s, p) => s + p.amount, 0);
  const unreconciled = payments.filter(p => p.reconciliation_status === 'unreconciled' || !p.reconciliation_status);
  const unreconciledAmt = unreconciled.reduce((s, p) => s + p.amount, 0);
  const reconciledAmt = payments.filter(p => p.reconciliation_status === 'reconciled').reduce((s, p) => s + p.amount, 0);
  const totalRefunded = refunds.filter(r => r.status === 'approved').reduce((s, r) => s + r.refund_amount, 0);
  const approvalRate = payments.length > 0 ? Math.round((payments.filter(p => p.status === 'approved').length / payments.length) * 100) : 0;

  // Chart data
  const byTerminal = Object.entries(payments.reduce((acc: Record<string, number>, p) => { const k = p.terminal_id?.slice(0, 8) || 'Unknown'; acc[k] = (acc[k] || 0) + p.amount; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const byProvider = Object.entries(payments.reduce((acc: Record<string, number>, p) => { const k = p.provider || 'geidea'; acc[k] = (acc[k] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6 p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowLeftRight className="h-6 w-6 text-primary" />{lang === 'ar' ? 'تسوية مدفوعات البطاقات' : 'POS Card Reconciliation & Reports'}</h1>
          <p className="text-muted-foreground">{lang === 'ar' ? 'تسوية وتقارير مدفوعات نقاط البيع' : 'Reconcile card payments, manage refunds, and view reports'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Card Sales', value: `${totalApproved.toLocaleString()} SAR`, icon: DollarSign },
          { label: 'Unreconciled', value: `${unreconciledAmt.toLocaleString()} SAR`, icon: AlertTriangle },
          { label: 'Reconciled', value: `${reconciledAmt.toLocaleString()} SAR`, icon: CheckCircle2 },
          { label: 'Total Refunded', value: `${totalRefunded.toLocaleString()} SAR`, icon: RotateCcw },
          { label: 'Transactions', value: payments.length, icon: CreditCard },
          { label: 'Approval Rate', value: `${approvalRate}%`, icon: Activity },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><s.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="reconciliation">
        <TabsList>
          <TabsTrigger value="reconciliation"><ArrowLeftRight className="h-4 w-4 mr-1" />Reconciliation</TabsTrigger>
          <TabsTrigger value="refunds"><RotateCcw className="h-4 w-4 mr-1" />Refunds ({refunds.length})</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1" />Reports</TabsTrigger>
          <TabsTrigger value="audit"><Shield className="h-4 w-4 mr-1" />Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="reconciliation">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Card Payment Reconciliation</CardTitle>
                <div className="flex gap-2">
                  <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-8 h-8 w-48" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                  <Select value={reconFilter} onValueChange={setReconFilter}><SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="unreconciled">Unreconciled</SelectItem><SelectItem value="reconciled">Reconciled</SelectItem><SelectItem value="mismatch">Mismatch</SelectItem></SelectContent></Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Card</TableHead><TableHead>Auth Code</TableHead><TableHead>Terminal</TableHead>
                    <TableHead>Recon Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{format(new Date(p.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">{p.transaction_ref}</TableCell>
                        <TableCell className="font-semibold">{Number(p.amount).toLocaleString()} {p.currency}</TableCell>
                        <TableCell className="text-xs">{p.card_type} ****{p.card_last_four}</TableCell>
                        <TableCell className="font-mono text-xs">{p.auth_code}</TableCell>
                        <TableCell className="text-xs">{p.terminal_id?.slice(0, 8)}</TableCell>
                        <TableCell><Badge className={reconColors[p.reconciliation_status || 'unreconciled']}>{p.reconciliation_status || 'unreconciled'}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(!p.reconciliation_status || p.reconciliation_status === 'unreconciled') && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markReconciled(p.id)}>Reconcile</Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openRefundDialog(p)}><RotateCcw className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds">
          <Card>
            <CardHeader><CardTitle className="text-base">Card Refunds & Reversals</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Refund #</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead><TableHead>Provider Ref</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {refunds.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell className="font-mono text-sm">{r.refund_number}</TableCell>
                      <TableCell className="font-semibold text-destructive">{Number(r.refund_amount).toLocaleString()} {r.currency}</TableCell>
                      <TableCell className="text-sm">{r.reason || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.provider_refund_ref || '-'}</TableCell>
                      <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base">Sales by Terminal</CardTitle></CardHeader><CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={byTerminal}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Transactions by Provider</CardTitle></CardHeader><CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byProvider} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{byProvider.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle className="text-base">Payment Audit Trail</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Type</TableHead>
                    <TableHead>User</TableHead><TableHead>Details</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {auditLog.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{format(new Date(a.created_at), 'dd/MM/yy HH:mm:ss')}</TableCell>
                        <TableCell className="text-sm font-medium">{a.action}</TableCell>
                        <TableCell><Badge variant={a.action_type === 'success' ? 'default' : a.action_type === 'error' ? 'destructive' : 'outline'}>{a.action_type}</Badge></TableCell>
                        <TableCell className="text-xs">{a.performed_by_name || '-'}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate">{JSON.stringify(a.details)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'استرداد دفعة بطاقة' : 'Refund Card Payment'}</DialogTitle></DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm"><strong>Original:</strong> {selectedPayment.transaction_ref}</p>
                <p className="text-sm"><strong>Amount:</strong> {selectedPayment.amount} {selectedPayment.currency}</p>
                <p className="text-sm"><strong>Card:</strong> {selectedPayment.card_type} ****{selectedPayment.card_last_four}</p>
                {selectedPayment.refund_amount > 0 && <p className="text-sm text-destructive"><strong>Already refunded:</strong> {selectedPayment.refund_amount} {selectedPayment.currency}</p>}
              </div>
              <div><Label>Refund Amount</Label><Input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} max={selectedPayment.amount - (selectedPayment.refund_amount || 0)} /></div>
              <div><Label>Reason</Label><Textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason for refund..." /></div>
              <Button onClick={handleRefund} disabled={refundLoading} className="w-full"><RotateCcw className="h-4 w-4 mr-2" />{lang === 'ar' ? 'تنفيذ الاسترداد' : 'Process Refund'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
