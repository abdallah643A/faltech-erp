import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Receipt, ShieldAlert, CheckCircle2, Clock, AlertTriangle,
  Trash2, FileText, DollarSign, Milestone, Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatSAR, formatSARShort } from '@/lib/currency';

interface ProjectBillingTabProps {
  project: any;
  onRefresh: () => void;
}

export default function ProjectBillingTab({ project, onRefresh }: ProjectBillingTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const projectId = project?.id;

  const [milestones, setMilestones] = useState<any[]>([]);
  const [sovItems, setSovItems] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [retentions, setRetentions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showSOVForm, setShowSOVForm] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [showRetentionRelease, setShowRetentionRelease] = useState(false);
  const [editingSOV, setEditingSOV] = useState<any>(null);
  const [milestoneForm, setMilestoneForm] = useState<any>({ description: '', percentage: 0, amount: 0, target_date: '' });
  const [sovForm, setSovForm] = useState<any>({ item_number: '', description: '', scheduled_value: 0 });
  const [billingForm, setBillingForm] = useState<any>({ billing_date: new Date().toISOString().split('T')[0], period_from: '', period_to: '', retainage_percent: project?.retention_percentage || 10, notes: '' });
  const [billingLines, setBillingLines] = useState<any[]>([]);
  const [releaseAmount, setReleaseAmount] = useState(0);

  const contractValue = project?.contract_value || project?.revised_contract_value || 0;
  const billingType = project?.billing_type || 'fixed_price';
  const retentionPct = project?.retention_percentage ?? 10;

  const loadBillingData = async () => {
    if (!projectId) return;
    setLoading(true);
    const [msRes, sovRes, billRes, retRes] = await Promise.all([
      supabase.from('cpms_payment_milestones' as any).select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('cpms_schedule_of_values' as any).select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('cpms_progress_billings' as any).select('*').eq('project_id', projectId).order('billing_date', { ascending: false }),
      supabase.from('cpms_retention_tracking' as any).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);
    setMilestones((msRes.data || []) as any[]);
    setSovItems((sovRes.data || []) as any[]);
    setBillings((billRes.data || []) as any[]);
    setRetentions((retRes.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { loadBillingData(); }, [projectId]);

  // Calculations
  const totalMilestonePct = milestones.reduce((s, m) => s + (m.percentage || 0), 0);
  const totalMilestoneAmt = milestones.reduce((s, m) => s + (m.amount || 0), 0);

  const totalScheduledValue = sovItems.reduce((s, i) => s + (i.scheduled_value || 0), 0);
  const totalPrevBilled = sovItems.reduce((s, i) => s + (i.previous_billed_amount || 0), 0);
  const totalCurrBilled = sovItems.reduce((s, i) => s + (i.current_billed_amount || 0), 0);
  const totalMaterialsStored = sovItems.reduce((s, i) => s + (i.materials_stored || 0), 0);
  const totalRetainageFromSOV = sovItems.reduce((s, i) => s + (i.retainage_amount || 0), 0);
  const totalCompleted = totalPrevBilled + totalCurrBilled + totalMaterialsStored;
  const sovPctComplete = totalScheduledValue > 0 ? (totalCompleted / totalScheduledValue) * 100 : 0;

  const totalRetentionHeld = retentions.filter(r => r.status === 'held').reduce((s, r) => s + (r.retention_amount || 0), 0);
  const totalRetentionReleased = retentions.filter(r => r.status === 'released').reduce((s, r) => s + (r.retention_amount || 0), 0);

  const sovDifference = totalScheduledValue - contractValue;
  const sovBalanced = Math.abs(sovDifference) < 0.01;

  // Handlers
  const handleUpdateBillingType = async (type: string) => {
    await supabase.from('cpms_projects').update({ billing_type: type } as any).eq('id', projectId);
    toast({ title: 'Billing type updated' });
    onRefresh();
  };

  const handleUpdateRetentionPct = async (pct: number) => {
    await supabase.from('cpms_projects').update({ retention_percentage: pct } as any).eq('id', projectId);
    toast({ title: `Retention set to ${pct}%` });
    onRefresh();
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.description) return;
    const amount = milestoneForm.amount || (contractValue * (milestoneForm.percentage / 100));
    const { error } = await supabase.from('cpms_payment_milestones' as any).insert({
      project_id: projectId,
      description: milestoneForm.description,
      percentage: milestoneForm.percentage,
      amount,
      target_date: milestoneForm.target_date || null,
      sort_order: milestones.length,
      ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Milestone added' });
    setShowMilestoneForm(false);
    setMilestoneForm({ description: '', percentage: 0, amount: 0, target_date: '' });
    loadBillingData();
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;
    await supabase.from('cpms_payment_milestones' as any).delete().eq('id', id);
    loadBillingData();
  };

  const handleCreateInvoiceFromMilestone = async (milestone: any) => {
    await supabase.from('cpms_payment_milestones' as any).update({ billing_status: 'billed', actual_invoice_date: new Date().toISOString().split('T')[0] }).eq('id', milestone.id);
    toast({ title: 'Milestone marked as billed' });
    loadBillingData();
  };

  // SOV CRUD
  const handleAddSOVItem = async () => {
    if (!sovForm.description) return;
    const { error } = await supabase.from('cpms_schedule_of_values' as any).insert({
      project_id: projectId,
      line_number: sovItems.length + 1,
      description: sovForm.description,
      scheduled_value: sovForm.scheduled_value,
      sort_order: sovItems.length,
      retainage_pct: retentionPct,
      ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'SOV line item added' });
    setShowSOVForm(false);
    setSovForm({ item_number: '', description: '', scheduled_value: 0 });
    loadBillingData();
  };

  const handleUpdateSOV = async () => {
    if (!editingSOV) return;
    const { id, description, scheduled_value } = editingSOV;
    await supabase.from('cpms_schedule_of_values' as any).update({ description, scheduled_value }).eq('id', id);
    toast({ title: 'SOV line updated' });
    setEditingSOV(null);
    loadBillingData();
  };

  const handleDeleteSOV = async (id: string) => {
    if (!confirm('Delete this SOV line item? This cannot be undone.')) return;
    await supabase.from('cpms_schedule_of_values' as any).delete().eq('id', id);
    loadBillingData();
  };

  // Progress Billing with line-level % complete
  const openBillingForm = () => {
    if (sovItems.length === 0) {
      toast({ title: 'Add SOV lines first', description: 'You need Schedule of Values line items before creating a progress billing.', variant: 'destructive' });
      return;
    }
    const lines = sovItems.map((s: any) => {
      const prevPct = s.scheduled_value > 0 ? ((s.previous_billed_amount || 0) / s.scheduled_value) * 100 : 0;
      return {
        sov_item_id: s.id,
        description: s.description,
        scheduled_value: s.scheduled_value || 0,
        previous_billed_pct: Math.min(prevPct, 100),
        previous_billed_amount: s.previous_billed_amount || 0,
        current_pct: 0,
        current_amount: 0,
        materials_stored: 0,
      };
    });
    setBillingLines(lines);
    setBillingForm({ billing_date: new Date().toISOString().split('T')[0], period_from: '', period_to: '', retainage_percent: retentionPct, notes: '' });
    setShowBillingForm(true);
  };

  const updateBillingLinePct = (idx: number, pct: number) => {
    const clamped = Math.min(Math.max(pct, 0), 100);
    setBillingLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const prevPct = l.previous_billed_pct;
      const thisPeriodPct = Math.max(clamped - prevPct, 0);
      const currentAmount = l.scheduled_value * (thisPeriodPct / 100);
      return { ...l, current_pct: thisPeriodPct, current_amount: currentAmount, cumulative_pct: clamped };
    }));
  };

  const updateBillingLineMaterials = (idx: number, val: number) => {
    setBillingLines(prev => prev.map((l, i) => i === idx ? { ...l, materials_stored: Math.max(val, 0) } : l));
  };

  const billingTotalCurrentWork = billingLines.reduce((s, l) => s + (l.current_amount || 0), 0);
  const billingTotalMaterials = billingLines.reduce((s, l) => s + (l.materials_stored || 0), 0);
  const billingGross = billingTotalCurrentWork + billingTotalMaterials;
  const billingRetainage = billingGross * ((billingForm.retainage_percent || 0) / 100);
  const billingNetDue = billingGross - billingRetainage;

  const handleCreateProgressBilling = async () => {
    if (billingGross <= 0) {
      toast({ title: 'No work entered', description: 'Enter % complete for at least one line item.', variant: 'destructive' });
      return;
    }

    const billingNumber = `PB-${String(billings.length + 1).padStart(3, '0')}`;

    // Create billing header
    const { data: billingData, error } = await supabase.from('cpms_progress_billings' as any).insert({
      project_id: projectId,
      billing_number: billingNumber,
      billing_date: billingForm.billing_date,
      period_from: billingForm.period_from || null,
      period_to: billingForm.period_to || null,
      total_scheduled_value: totalScheduledValue,
      total_previous_billed: totalPrevBilled,
      total_current_billed: billingTotalCurrentWork,
      total_cumulative: totalPrevBilled + billingTotalCurrentWork,
      total_retainage: billingRetainage,
      total_materials_stored: billingTotalMaterials,
      net_payment_due: billingNetDue,
      billing_method: 'percentage',
      status: 'draft',
      notes: billingForm.notes,
      created_by: user?.id,
      ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
    }).select('id').single();

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    const billingId = (billingData as any)?.id;

    // Insert billing lines
    if (billingId) {
      const lineInserts = billingLines.filter(l => l.current_amount > 0 || l.materials_stored > 0).map((l, idx) => ({
        billing_id: billingId,
        sov_item_id: l.sov_item_id,
        description: l.description,
        scheduled_value: l.scheduled_value,
        previous_billed_pct: l.previous_billed_pct,
        previous_billed_amount: l.previous_billed_amount,
        current_pct: l.current_pct,
        current_amount: l.current_amount,
        cumulative_pct: (l.previous_billed_pct || 0) + (l.current_pct || 0),
        cumulative_amount: (l.previous_billed_amount || 0) + (l.current_amount || 0),
        materials_stored: l.materials_stored,
        balance_to_finish: l.scheduled_value - (l.previous_billed_amount || 0) - (l.current_amount || 0),
        retainage_pct: billingForm.retainage_percent,
        retainage_amount: (l.current_amount + l.materials_stored) * (billingForm.retainage_percent / 100),
        sort_order: idx,
      }));

      if (lineInserts.length > 0) {
        await supabase.from('cpms_progress_billing_lines' as any).insert(lineInserts);
      }
    }

    // Track retention
    if (billingRetainage > 0) {
      await supabase.from('cpms_retention_tracking' as any).insert({
        project_id: projectId,
        billing_id: billingId,
        retention_amount: billingRetainage,
        status: 'held',
        notes: `Retention from ${billingNumber}`,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
    }

    // Move current to previous on SOV items
    for (const line of billingLines) {
      if (line.current_amount > 0 || line.materials_stored > 0) {
        const sov = sovItems.find(s => s.id === line.sov_item_id);
        if (sov) {
          const newPrevBilled = (sov.previous_billed_amount || 0) + line.current_amount + line.materials_stored;
          const newRetainage = (sov.retainage_amount || 0) + ((line.current_amount + line.materials_stored) * (billingForm.retainage_percent / 100));
          await supabase.from('cpms_schedule_of_values' as any).update({
            previous_billed_amount: newPrevBilled,
            previous_billed_pct: sov.scheduled_value > 0 ? (newPrevBilled / sov.scheduled_value) * 100 : 0,
            current_billed_amount: 0,
            current_billed_pct: 0,
            materials_stored: 0,
            cumulative_billed_amount: newPrevBilled,
            cumulative_billed_pct: sov.scheduled_value > 0 ? (newPrevBilled / sov.scheduled_value) * 100 : 0,
            balance_to_finish: sov.scheduled_value - newPrevBilled,
            retainage_amount: newRetainage,
          }).eq('id', sov.id);
        }
      }
    }

    toast({ title: `Progress Billing ${billingNumber} created`, description: `Net Payment Due: ${formatSAR(billingNetDue)} SAR` });
    setShowBillingForm(false);
    loadBillingData();
  };

  // Retention release
  const handleReleaseRetention = async () => {
    if (releaseAmount <= 0 || releaseAmount > totalRetentionHeld) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    // Create retention release billing
    const billingNumber = `RR-${String(billings.length + 1).padStart(3, '0')}`;
    await supabase.from('cpms_progress_billings' as any).insert({
      project_id: projectId,
      billing_number: billingNumber,
      billing_date: new Date().toISOString().split('T')[0],
      total_current_billed: 0,
      net_payment_due: releaseAmount,
      billing_method: 'retention_release',
      status: 'draft',
      notes: `Retention Release: ${formatSAR(releaseAmount)} SAR`,
      created_by: user?.id,
      ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
    });

    // Mark retention records as released (FIFO)
    let remaining = releaseAmount;
    const heldRetentions = retentions.filter(r => r.status === 'held');
    for (const r of heldRetentions) {
      if (remaining <= 0) break;
      if (r.retention_amount <= remaining) {
        await supabase.from('cpms_retention_tracking' as any).update({ status: 'released', release_date: new Date().toISOString().split('T')[0] }).eq('id', r.id);
        remaining -= r.retention_amount;
      } else {
        // Split: update existing to released partial, create new held for remainder
        await supabase.from('cpms_retention_tracking' as any).update({
          retention_amount: r.retention_amount - remaining,
        }).eq('id', r.id);
        await supabase.from('cpms_retention_tracking' as any).insert({
          project_id: projectId,
          retention_amount: remaining,
          status: 'released',
          release_date: new Date().toISOString().split('T')[0],
          notes: 'Partial release',
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        });
        remaining = 0;
      }
    }

    toast({ title: 'Retention released', description: `${formatSAR(releaseAmount)} SAR released` });
    setShowRetentionRelease(false);
    setReleaseAmount(0);
    loadBillingData();
  };

  const percentComplete = project?.percent_complete || 0;

  if (loading) return <div className="flex items-center justify-center h-32 text-muted-foreground">Loading billing data...</div>;

  return (
    <div className="space-y-6">
      {/* Billing Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <Label className="text-xs text-muted-foreground">Billing Type</Label>
            <Select value={billingType} onValueChange={handleUpdateBillingType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_price">Fixed Price</SelectItem>
                <SelectItem value="time_materials">Time & Materials</SelectItem>
                <SelectItem value="progress_billing">Progress Billing</SelectItem>
                <SelectItem value="cost_plus">Cost Plus</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Label className="text-xs text-muted-foreground">Retention %</Label>
            <Input type="number" min={0} max={100} value={retentionPct} className="mt-1"
              onChange={e => handleUpdateRetentionPct(parseFloat(e.target.value) || 0)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Label className="text-xs text-muted-foreground">% Complete</Label>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={percentComplete} className="flex-1 h-3" />
              <span className="text-sm font-bold">{percentComplete}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Contract Value</p>
            <p className="text-lg font-bold">{formatSARShort(contractValue)}</p>
            <p className="text-[10px] text-muted-foreground">{formatSAR(contractValue)} SAR</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Billed</p>
            <p className="text-lg font-bold">{formatSARShort(totalPrevBilled + totalCurrBilled)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Retention Held</p>
            <p className="text-lg font-bold text-orange-600">{formatSAR(totalRetentionHeld)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Retention Released</p>
            <p className="text-lg font-bold text-green-600">{formatSAR(totalRetentionReleased)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Remaining to Bill</p>
            <p className="text-lg font-bold">{formatSARShort(contractValue - totalPrevBilled - totalCurrBilled)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sov">
        <TabsList>
          <TabsTrigger value="milestones"><Milestone className="h-4 w-4 mr-1" /> Payment Schedule</TabsTrigger>
          <TabsTrigger value="sov"><FileText className="h-4 w-4 mr-1" /> Schedule of Values</TabsTrigger>
          <TabsTrigger value="progress"><Receipt className="h-4 w-4 mr-1" /> Progress Billings</TabsTrigger>
          <TabsTrigger value="retention"><ShieldAlert className="h-4 w-4 mr-1" /> Retention</TabsTrigger>
        </TabsList>

        {/* MILESTONES */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Payment Schedule</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Total: {totalMilestonePct.toFixed(0)}% • {formatSAR(totalMilestoneAmt)} SAR</p>
              </div>
              <Button size="sm" onClick={() => setShowMilestoneForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Milestone</Button>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No payment milestones defined.</p>
              ) : (
                <div className="space-y-3">
                  {milestones.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        m.billing_status === 'paid' ? 'bg-green-100 text-green-800' :
                        m.billing_status === 'billed' ? 'bg-blue-100 text-blue-800' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {m.billing_status === 'paid' ? <CheckCircle2 className="h-5 w-5" /> :
                         m.billing_status === 'billed' ? <Receipt className="h-5 w-5" /> :
                         <span>{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{m.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{m.percentage}%</span>
                          <span className="font-semibold text-foreground">{formatSAR(m.amount)} SAR</span>
                          {m.target_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(m.target_date), 'dd MMM yyyy')}</span>}
                        </div>
                      </div>
                      <Badge variant={m.billing_status === 'paid' ? 'secondary' : 'outline'}>
                        {m.billing_status === 'not_billed' ? 'Not Billed' : m.billing_status === 'billed' ? 'Billed' : 'Paid'}
                      </Badge>
                      {m.billing_status === 'not_billed' && (
                        <Button size="sm" variant="outline" onClick={() => handleCreateInvoiceFromMilestone(m)}>
                          <Receipt className="h-3 w-3 mr-1" /> Bill
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteMilestone(m.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {totalMilestonePct !== 100 && milestones.length > 0 && (
                <div className="mt-3 p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Milestones total {totalMilestonePct}% — should equal 100%
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULE OF VALUES */}
        <TabsContent value="sov">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Schedule of Values</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {sovPctComplete.toFixed(1)}% Complete • Total: {formatSAR(totalScheduledValue)} SAR
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowSOVForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Line Item</Button>
                <Button size="sm" variant="outline" onClick={openBillingForm} disabled={sovItems.length === 0}>
                  <Receipt className="h-4 w-4 mr-1" /> Create Progress Billing
                </Button>
              </div>
            </CardHeader>

            {/* SOV Validation */}
            {sovItems.length > 0 && !sovBalanced && (
              <div className="mx-4 mb-3 p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                SOV total ({formatSAR(totalScheduledValue)}) {sovDifference > 0 ? 'exceeds' : 'is less than'} contract value ({formatSAR(contractValue)}) by {formatSAR(Math.abs(sovDifference))} SAR
              </div>
            )}
            {sovItems.length > 0 && sovBalanced && (
              <div className="mx-4 mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> SOV total matches contract value ✓
              </div>
            )}

            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Contract Amount (SAR)</TableHead>
                    <TableHead className="text-right">Previous Billed</TableHead>
                    <TableHead className="text-right">% Complete</TableHead>
                    <TableHead className="text-right">Balance to Finish</TableHead>
                    <TableHead className="text-right">Retainage</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sovItems.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No SOV line items. Add items to define the billing breakdown.</TableCell></TableRow>
                  ) : sovItems.map((item: any, idx: number) => {
                    const pct = item.scheduled_value > 0 ? ((item.previous_billed_amount || 0) / item.scheduled_value) * 100 : 0;
                    const balance = item.scheduled_value - (item.previous_billed_amount || 0);
                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right font-mono">{formatSAR(item.scheduled_value)}</TableCell>
                        <TableCell className="text-right font-mono">{formatSAR(item.previous_billed_amount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Progress value={Math.min(pct, 100)} className="w-12 h-2" />
                            <span>{pct.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatSAR(balance)}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{formatSAR(item.retainage_amount)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingSOV({ ...item })}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive h-6 w-6 p-0" onClick={() => handleDeleteSOV(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {sovItems.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-semibold text-xs">
                      <TableCell colSpan={2} className="text-right">TOTALS</TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(totalScheduledValue)}</TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(totalPrevBilled)}</TableCell>
                      <TableCell className="text-right">{sovPctComplete.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(totalScheduledValue - totalPrevBilled)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">{formatSAR(totalRetainageFromSOV)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROGRESS BILLINGS */}
        <TabsContent value="progress">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Progress Billings</CardTitle>
              <Button size="sm" onClick={openBillingForm} disabled={sovItems.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> New Progress Billing
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Billing #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Work This Period (SAR)</TableHead>
                    <TableHead className="text-right">Retainage (SAR)</TableHead>
                    <TableHead className="text-right font-bold">Net Due (SAR)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billings.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No progress billings yet</TableCell></TableRow>
                  ) : billings.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-bold">{b.billing_number}</TableCell>
                      <TableCell>{b.billing_date ? format(new Date(b.billing_date), 'dd MMM yyyy') : '—'}</TableCell>
                      <TableCell className="text-xs">
                        {b.period_from && b.period_to ? `${format(new Date(b.period_from), 'dd MMM')} → ${format(new Date(b.period_to), 'dd MMM')}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(b.total_current_billed)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">-{formatSAR(b.total_retainage)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-600">{formatSAR(b.net_payment_due)}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'certified' ? 'secondary' : b.billing_method === 'retention_release' ? 'default' : 'outline'} className="capitalize">
                          {b.billing_method === 'retention_release' ? 'Retention Release' : b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RETENTION */}
        <TabsContent value="retention">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Total Retention Held</p>
                  <p className="text-2xl font-bold text-orange-600">{formatSAR(totalRetentionHeld)} SAR</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Total Released</p>
                  <p className="text-2xl font-bold text-green-600">{formatSAR(totalRetentionReleased)} SAR</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Retention Rate</p>
                  <p className="text-2xl font-bold">{retentionPct}%</p>
                </CardContent>
              </Card>
            </div>

            {totalRetentionHeld > 0 && (
              <Button onClick={() => { setReleaseAmount(totalRetentionHeld); setShowRetentionRelease(true); }} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Release Retention
              </Button>
            )}

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount (SAR)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Release Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retentions.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No retention records</TableCell></TableRow>
                    ) : retentions.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '—'}</TableCell>
                        <TableCell className="text-xs">{r.notes || '—'}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatSAR(r.retention_amount)}</TableCell>
                        <TableCell>
                          <Badge className={r.status === 'held' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
                            {r.status === 'held' ? <ShieldAlert className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.release_date ? format(new Date(r.release_date), 'dd MMM yyyy') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}

      {/* Add Milestone */}
      <Dialog open={showMilestoneForm} onOpenChange={setShowMilestoneForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Payment Milestone</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Description *</Label>
              <Input value={milestoneForm.description} onChange={e => setMilestoneForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="e.g. Foundation Complete" />
            </div>
            <div className="space-y-2">
              <Label>% of Contract</Label>
              <Input type="number" min={0} max={100} value={milestoneForm.percentage}
                onChange={e => {
                  const pct = parseFloat(e.target.value) || 0;
                  setMilestoneForm((f: any) => ({ ...f, percentage: pct, amount: contractValue * (pct / 100) }));
                }} />
            </div>
            <div className="space-y-2">
              <Label>Amount (SAR)</Label>
              <Input type="number" value={milestoneForm.amount}
                onChange={e => setMilestoneForm((f: any) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Target Date</Label>
              <Input type="date" value={milestoneForm.target_date} onChange={e => setMilestoneForm((f: any) => ({ ...f, target_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowMilestoneForm(false)}>Cancel</Button>
            <Button onClick={handleAddMilestone} disabled={!milestoneForm.description}>Add Milestone</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add SOV Item */}
      <Dialog open={showSOVForm} onOpenChange={setShowSOVForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Schedule of Values Line Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={sovForm.description} onChange={e => setSovForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="e.g. Site Clearing, Excavation, Foundation" />
            </div>
            <div className="space-y-2">
              <Label>Contract Amount (SAR)</Label>
              <Input type="number" value={sovForm.scheduled_value} onChange={e => setSovForm((f: any) => ({ ...f, scheduled_value: parseFloat(e.target.value) || 0 }))} />
              <p className="text-xs text-muted-foreground">Remaining to allocate: {formatSAR(contractValue - totalScheduledValue)} SAR</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowSOVForm(false)}>Cancel</Button>
            <Button onClick={handleAddSOVItem} disabled={!sovForm.description}>Add Line Item</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit SOV Item */}
      <Dialog open={!!editingSOV} onOpenChange={() => setEditingSOV(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit SOV Line Item</DialogTitle></DialogHeader>
          {editingSOV && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editingSOV.description} onChange={e => setEditingSOV((f: any) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contract Amount (SAR)</Label>
                <Input type="number" value={editingSOV.scheduled_value} onChange={e => setEditingSOV((f: any) => ({ ...f, scheduled_value: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSOV(null)}>Cancel</Button>
                <Button onClick={handleUpdateSOV}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Progress Billing - Line Level % Complete */}
      <Dialog open={showBillingForm} onOpenChange={setShowBillingForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Progress Billing</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Billing Date</Label>
              <Input type="date" value={billingForm.billing_date} onChange={e => setBillingForm((f: any) => ({ ...f, billing_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Retainage %</Label>
              <Input type="number" min={0} max={100} value={billingForm.retainage_percent} onChange={e => setBillingForm((f: any) => ({ ...f, retainage_percent: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Period From</Label>
              <Input type="date" value={billingForm.period_from} onChange={e => setBillingForm((f: any) => ({ ...f, period_from: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Period To</Label>
              <Input type="date" value={billingForm.period_to} onChange={e => setBillingForm((f: any) => ({ ...f, period_to: e.target.value }))} />
            </div>
          </div>

          {/* Line-level entry */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Contract Amt</TableHead>
                  <TableHead className="text-right">Prev Billed %</TableHead>
                  <TableHead className="text-right">Prev Billed</TableHead>
                  <TableHead className="text-right w-28">% Complete *</TableHead>
                  <TableHead className="text-right">This Period</TableHead>
                  <TableHead className="text-right w-28">Materials Stored</TableHead>
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
                      <Input
                        type="number" min={0} max={100} step={1}
                        className="w-20 h-7 text-xs text-right"
                        value={(line.previous_billed_pct + (line.current_pct || 0)).toFixed(0)}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          if (val > 100) {
                            toast({ title: '% cannot exceed 100%', variant: 'destructive' });
                            return;
                          }
                          updateBillingLinePct(idx, val);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatSAR(line.current_amount)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0}
                        className="w-24 h-7 text-xs text-right"
                        value={line.materials_stored || ''}
                        onChange={e => updateBillingLineMaterials(idx, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Billing Summary */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Work Completed This Period:</span>
              <span className="font-mono font-semibold">{formatSAR(billingTotalCurrentWork)} SAR</span>
            </div>
            <div className="flex justify-between">
              <span>Materials Stored:</span>
              <span className="font-mono font-semibold">{formatSAR(billingTotalMaterials)} SAR</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Subtotal:</span>
              <span className="font-mono font-semibold">{formatSAR(billingGross)} SAR</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>Less Retention ({billingForm.retainage_percent}%):</span>
              <span className="font-mono font-semibold">-{formatSAR(billingRetainage)} SAR</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Net Payment Due:</span>
              <span className="font-mono text-green-600">{formatSAR(billingNetDue)} SAR</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={billingForm.notes} onChange={e => setBillingForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBillingForm(false)}>Cancel</Button>
            <Button onClick={handleCreateProgressBilling} disabled={billingGross <= 0}>Create Progress Billing</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Release Retention */}
      <Dialog open={showRetentionRelease} onOpenChange={setShowRetentionRelease}>
        <DialogContent>
          <DialogHeader><DialogTitle>Release Retention</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm">
              <p>Total Retention Held: <strong className="text-orange-600">{formatSAR(totalRetentionHeld)} SAR</strong></p>
            </div>
            <div className="space-y-2">
              <Label>Release Amount (SAR)</Label>
              <Input type="number" min={0} max={totalRetentionHeld} value={releaseAmount}
                onChange={e => setReleaseAmount(parseFloat(e.target.value) || 0)} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setReleaseAmount(totalRetentionHeld)}>Full Release</Button>
                <Button variant="outline" size="sm" onClick={() => setReleaseAmount(totalRetentionHeld / 2)}>50% Release</Button>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <AlertTriangle className="h-3 w-3 inline mr-1" /> This will create a Retention Release invoice. This action cannot be undone.
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowRetentionRelease(false)}>Cancel</Button>
            <Button onClick={handleReleaseRetention} disabled={releaseAmount <= 0} className="bg-green-600 hover:bg-green-700 text-white">
              Release {formatSAR(releaseAmount)} SAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
