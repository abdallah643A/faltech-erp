import { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, FileText, Receipt, Trash2, Edit } from 'lucide-react';
import { useScheduleOfValues, useProgressBillings } from '@/hooks/useProgressBilling';
import { useCPMS } from '@/hooks/useCPMS';
import { formatSAR } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProgressBillingPage() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { items: sovItems, createItem: createSOV, updateItem: updateSOV, deleteItem: deleteSOV, getSummary } = useScheduleOfValues(selectedProjectId);
  const { billings, createBilling } = useProgressBillings(selectedProjectId);
  const [showSOVDialog, setShowSOVDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [sovForm, setSovForm] = useState({ description: '', scheduled_value: 0 });
  const [billingLines, setBillingLines] = useState<any[]>([]);
  const [billingForm, setBillingForm] = useState({
    billing_date: new Date().toISOString().split('T')[0],
    retainage_percent: 10,
    period_from: '',
    period_to: '',
    notes: '',
  });

  const sovData = sovItems.data || [];
  const billingsData = billings.data || [];
  const summary = getSummary(sovData);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const contractValue = selectedProject?.contract_value || 0;

  const handleCreateSOV = () => {
    if (!selectedProjectId || !sovForm.description) return;
    createSOV.mutate({
      project_id: selectedProjectId,
      line_number: sovData.length + 1,
      description: sovForm.description,
      scheduled_value: sovForm.scheduled_value,
      sort_order: sovData.length,
      retainage_pct: 10,
    });
    setShowSOVDialog(false);
    setSovForm({ description: '', scheduled_value: 0 });
  };

  const openBillingDialog = () => {
    if (sovData.length === 0) {
      toast({ title: 'Add SOV lines first', variant: 'destructive' });
      return;
    }
    const lines = sovData.map((s: any) => {
      const prevPct = s.scheduled_value > 0 ? ((s.previous_billed_amount || 0) / s.scheduled_value) * 100 : 0;
      return {
        sov_item_id: s.id,
        description: s.description,
        scheduled_value: s.scheduled_value || 0,
        previous_billed_pct: Math.min(prevPct, 100),
        previous_billed_amount: s.previous_billed_amount || 0,
        current_pct: 0,
        current_amount: 0,
      };
    });
    setBillingLines(lines);
    setShowBillingDialog(true);
  };

  const updateLinePct = (idx: number, totalPct: number) => {
    const clamped = Math.min(Math.max(totalPct, 0), 100);
    setBillingLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const thisPeriodPct = Math.max(clamped - l.previous_billed_pct, 0);
      return { ...l, current_pct: thisPeriodPct, current_amount: l.scheduled_value * (thisPeriodPct / 100) };
    }));
  };

  const billingTotalCurrent = billingLines.reduce((s, l) => s + (l.current_amount || 0), 0);
  const billingRetainage = billingTotalCurrent * (billingForm.retainage_percent / 100);
  const billingNetDue = billingTotalCurrent - billingRetainage;

  const handleCreateBilling = () => {
    if (!selectedProjectId || billingTotalCurrent <= 0) return;
    createBilling.mutate({
      project_id: selectedProjectId,
      billing_number: `PB-${String(billingsData.length + 1).padStart(3, '0')}`,
      billing_date: billingForm.billing_date,
      billing_method: 'percentage',
      period_from: billingForm.period_from || null,

      period_to: billingForm.period_to || null,
      total_scheduled_value: summary?.totalScheduled || 0,
      total_previous_billed: summary?.totalPrevBilled || 0,
      total_current_billed: billingTotalCurrent,
      total_cumulative: (summary?.totalPrevBilled || 0) + billingTotalCurrent,
      total_retainage: billingRetainage,
      net_payment_due: billingNetDue,
      notes: billingForm.notes,
    });
    setShowBillingDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Progress Billing & SOV</h1>
          <p className="text-muted-foreground">Schedule of Values, Progress Billing & Retention</p>
        </div>
        <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select Project" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total SOV</p><p className="text-xl font-bold">{formatSAR(summary?.totalScheduled || 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Previous Billed</p><p className="text-xl font-bold">{formatSAR(summary?.totalPrevBilled || 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Current Period</p><p className="text-xl font-bold">{formatSAR(summary?.totalCurrBilled || 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Retainage Held</p><p className="text-xl font-bold text-orange-600">{formatSAR(summary?.totalRetainage || 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Balance</p><p className="text-xl font-bold">{formatSAR(summary?.balanceToFinish || 0)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="sov">
        <TabsList>
          <TabsTrigger value="sov"><FileText className="h-4 w-4 mr-1" /> Schedule of Values</TabsTrigger>
          <TabsTrigger value="billings"><Receipt className="h-4 w-4 mr-1" /> Progress Billings</TabsTrigger>
        </TabsList>

        <TabsContent value="sov" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Dialog open={showSOVDialog} onOpenChange={setShowSOVDialog}>
              <DialogTrigger asChild><Button disabled={!selectedProjectId}><Plus className="h-4 w-4 mr-2" />Add Line Item</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Schedule of Values Line</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Description *</Label><Input value={sovForm.description} onChange={e => setSovForm({ ...sovForm, description: e.target.value })} placeholder="e.g. Site Clearing, Excavation" /></div>
                  <div><Label>Contract Amount (SAR)</Label><Input type="number" value={sovForm.scheduled_value} onChange={e => setSovForm({ ...sovForm, scheduled_value: Number(e.target.value) })} /></div>
                  <Button onClick={handleCreateSOV} className="w-full" disabled={!sovForm.description}>Add Line</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={openBillingDialog} disabled={!selectedProjectId || sovData.length === 0}>
              <Receipt className="h-4 w-4 mr-2" /> Create Progress Billing
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>{t('common.description')}</TableHead>
                <TableHead className="text-right">Contract Amount</TableHead>
                <TableHead className="text-right">Prev Billed</TableHead>
                <TableHead className="text-right">% Complete</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Retainage</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sovData.map((s: any, idx: number) => {
                  const pct = s.scheduled_value > 0 ? ((s.previous_billed_amount || 0) / s.scheduled_value) * 100 : 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{s.description}</TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(s.scheduled_value)}</TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(s.previous_billed_amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Progress value={Math.min(pct, 100)} className="w-12 h-2" />
                          <span className="text-xs">{pct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatSAR((s.scheduled_value || 0) - (s.previous_billed_amount || 0))}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">{formatSAR(s.retainage_amount)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-destructive h-6 w-6 p-0" onClick={() => deleteSOV.mutate(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sovData.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No SOV lines. Select a project and add line items.</TableCell></TableRow>}
              </TableBody>
              {sovData.length > 0 && (
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2} className="text-right">TOTALS</TableCell>
                    <TableCell className="text-right font-mono">{formatSAR(summary?.totalScheduled)}</TableCell>
                    <TableCell className="text-right font-mono">{formatSAR(summary?.totalPrevBilled)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono">{formatSAR(summary?.balanceToFinish)}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">{formatSAR(summary?.totalRetainage)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="billings" className="space-y-4">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Billing #</TableHead><TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">Work This Period</TableHead>
                <TableHead className="text-right">Retainage</TableHead>
                <TableHead className="text-right font-bold">Net Due</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {billingsData.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-bold">{b.billing_number}</TableCell>
                    <TableCell>{b.billing_date}</TableCell>
                    <TableCell className="text-right font-mono">{formatSAR(b.total_current_billed)}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">-{formatSAR(b.total_retainage)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">{formatSAR(b.net_payment_due)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{b.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {billingsData.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No billing applications</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Progress Billing Dialog with line-level % complete */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Progress Billing</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><Label>{t('common.date')}</Label><Input type="date" value={billingForm.billing_date} onChange={e => setBillingForm({ ...billingForm, billing_date: e.target.value })} /></div>
            <div><Label>Retainage %</Label><Input type="number" min={0} max={100} value={billingForm.retainage_percent} onChange={e => setBillingForm({ ...billingForm, retainage_percent: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Period From</Label><Input type="date" value={billingForm.period_from} onChange={e => setBillingForm({ ...billingForm, period_from: e.target.value })} /></div>
            <div><Label>Period To</Label><Input type="date" value={billingForm.period_to} onChange={e => setBillingForm({ ...billingForm, period_to: e.target.value })} /></div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead className="text-right">Contract Amt</TableHead>
                  <TableHead className="text-right">Prev %</TableHead>
                  <TableHead className="text-right">Prev Billed</TableHead>
                  <TableHead className="text-right w-24">% Complete</TableHead>
                  <TableHead className="text-right">This Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingLines.map((line, idx) => (
                  <TableRow key={idx} className="text-xs">
                    <TableCell className="font-medium">{line.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatSAR(line.scheduled_value)}</TableCell>
                    <TableCell className="text-right">{line.previous_billed_pct.toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-mono">{formatSAR(line.previous_billed_amount)}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} max={100} className="w-20 h-7 text-xs text-right"
                        value={(line.previous_billed_pct + (line.current_pct || 0)).toFixed(0)}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          if (val > 100) return;
                          updateLinePct(idx, val);
                        }} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatSAR(line.current_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Work This Period:</span><span className="font-mono font-semibold">{formatSAR(billingTotalCurrent)} SAR</span></div>
            <div className="flex justify-between text-orange-600"><span>Less Retention ({billingForm.retainage_percent}%):</span><span className="font-mono">-{formatSAR(billingRetainage)} SAR</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Net Payment Due:</span><span className="font-mono text-green-600">{formatSAR(billingNetDue)} SAR</span></div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBillingDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreateBilling} disabled={billingTotalCurrent <= 0}>Create Billing</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
