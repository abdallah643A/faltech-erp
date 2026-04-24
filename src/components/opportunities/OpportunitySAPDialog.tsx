import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { type Opportunity } from '@/hooks/useOpportunities';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Minus, Square, X } from 'lucide-react';
import { RequiredFieldsProvider, useRequiredFieldsContext, useRequiredFieldValidation } from '@/components/RequiredFieldsProvider';

const stageOrder = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const sourceOptions = ['Website', 'Referral', 'Cold Call', 'Event', 'Social Media', 'Partner', 'Other'];
const closingTypes = ['Single', 'Multiple', 'Phase-based'];
const interestLevels = ['Low', 'Medium', 'High', 'Very High'];

interface OpportunitySAPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  opportunity?: Opportunity | null;
  allBPs: Array<{ id: string; card_code: string; card_name: string; contact_person?: string | null; territory?: string | null }>;
  salesEmployees: Array<{ id: string; slp_name: string; slp_code: number }>;
  onSave: (data: any) => Promise<void>;
  isPending: boolean;
  defaultOwnerName?: string;
  opportunityNumber?: number;
}

function OpportunitySAPDialogInner({
  open,
  onOpenChange,
  mode,
  opportunity,
  allBPs,
  salesEmployees,
  onSave,
  isPending,
  defaultOwnerName,
  opportunityNumber,
}: OpportunitySAPDialogProps) {
  const { language } = useLanguage();
  const { validate } = useRequiredFieldValidation();

  const [form, setForm] = useState({
    name: '',
    company: '',
    business_partner_id: '',
    value: '',
    probability: '50',
    stage: 'Discovery',
    expected_close: '',
    owner_name: '',
    notes: '',
    industry: '',
    source: '',
    contact_person: '',
    interest_field: '',
    closing_type: '',
    start_date: new Date().toISOString().split('T')[0],
    remarks: '',
    sales_employee_code: '',
    territory: '',
    gross_profit_percent: '0',
    weighted_amount: '0',
    level_of_interest: '',
    predicted_closing_days: '',
  });

  useEffect(() => {
    if (mode === 'edit' && opportunity) {
      setForm({
        name: opportunity.name || '',
        company: opportunity.company || '',
        business_partner_id: opportunity.business_partner_id || '',
        value: opportunity.value?.toString() || '',
        probability: opportunity.probability?.toString() || '50',
        stage: opportunity.stage || 'Discovery',
        expected_close: opportunity.expected_close || '',
        owner_name: opportunity.owner_name || '',
        notes: opportunity.notes || '',
        industry: opportunity.industry || '',
        source: opportunity.source || '',
        contact_person: opportunity.contact_person || '',
        interest_field: opportunity.interest_field || '',
        closing_type: opportunity.closing_type || '',
        start_date: opportunity.start_date || '',
        remarks: opportunity.remarks || '',
        sales_employee_code: opportunity.sales_employee_code?.toString() || '',
        territory: opportunity.territory?.toString() || '',
        gross_profit_percent: '0',
        weighted_amount: (opportunity.weighted_amount || 0).toString(),
        level_of_interest: '',
        predicted_closing_days: '',
      });
    } else if (mode === 'add') {
      setForm({
        name: '', company: '', business_partner_id: '', value: '', probability: '50',
        stage: 'Discovery', expected_close: '', owner_name: '', notes: '',
        industry: '', source: '', contact_person: '', interest_field: '',
        closing_type: '', start_date: new Date().toISOString().split('T')[0],
        remarks: '', sales_employee_code: '', territory: '',
        gross_profit_percent: '0', weighted_amount: '0', level_of_interest: '',
        predicted_closing_days: '',
      });
    }
  }, [mode, opportunity, open]);

  const handleBPSelect = (bpId: string) => {
    const bp = allBPs.find(b => b.id === bpId);
    if (bp) {
      setForm(prev => ({
        ...prev,
        business_partner_id: bp.id,
        company: bp.card_name,
        name: prev.name || `${bp.card_name} - Opportunity`,
        contact_person: bp.contact_person || prev.contact_person,
        territory: bp.territory || prev.territory,
      }));
    }
  };

  // Auto-calculate weighted amount
  useEffect(() => {
    const val = parseFloat(form.value) || 0;
    const prob = parseInt(form.probability) || 0;
    setForm(prev => ({ ...prev, weighted_amount: ((val * prob) / 100).toFixed(2) }));
  }, [form.value, form.probability]);

  const handleSubmit = () => {
    if (!validate(form as Record<string, any>, {
      opportunity_name: 'Opportunity Name',
      bp_code: 'Business Partner',
      name: 'Name',
      company: 'BP Name',
      value: 'Amount',
    })) return;
    if (!form.name || !form.company || !form.value) return;
    onSave(form);
  };

  const stageIndex = stageOrder.indexOf(form.stage);
  const closingPercent = ((stageIndex + 1) / stageOrder.length * 100).toFixed(0);

  const selectedBP = allBPs.find(b => b.id === form.business_partner_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[850px] p-0 gap-0 max-h-[90vh] overflow-hidden">
        {/* SAP B1 Window Header */}
        <div className="bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] px-3 py-1.5 flex items-center justify-between rounded-t-lg">
          <span className="text-sm font-semibold">
            {mode === 'edit' ? 'Opportunity' : 'Opportunity - Add'}
          </span>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-white/10 rounded"><Minus className="h-3 w-3" /></button>
            <button className="p-1 hover:bg-white/10 rounded"><Square className="h-3 w-3" /></button>
            <button className="p-1 hover:bg-white/10 rounded" onClick={() => onOpenChange(false)}><X className="h-3 w-3" /></button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* SAP B1 Header Fields - Dual Column */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-4 border-b border-border bg-card">
            {/* Left Column */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="w-40 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Business Partner Code
                </Label>
                <Select value={form.business_partner_id || '__none__'} onValueChange={(v) => { if (v !== '__none__') handleBPSelect(v); }}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Select...</SelectItem>
                    {allBPs.map(bp => <SelectItem key={bp.id} value={bp.id}>{bp.card_code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-40 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Business Partner Name
                </Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="h-7 text-xs bg-amber-50/50 dark:bg-amber-900/10" readOnly={!!form.business_partner_id} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-40 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Contact Person
                </Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  className="h-7 text-xs" placeholder="" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-40 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  BP Territory
                </Label>
                <Input value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })}
                  className="h-7 text-xs bg-amber-50/50 dark:bg-amber-900/10" readOnly />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-40 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Sales Employee
                </Label>
                <Select value={form.sales_employee_code || '__none__'} onValueChange={(v) => setForm({ ...form, sales_employee_code: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-</SelectItem>
                    {salesEmployees.map((se) => <SelectItem key={se.id} value={se.slp_code?.toString() || se.id}>{se.slp_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-40 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Owner
                </Label>
                <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                  className="h-7 text-xs" placeholder={defaultOwnerName || ''} />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="w-32 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Opportunity Name
                </Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-7 text-xs flex-1" placeholder="Enter name..." />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-32 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Opportunity No.
                </Label>
                <Input value={opportunityNumber || (mode === 'edit' ? opportunity?.id?.slice(0, 8) : 'Auto')}
                  className="h-7 text-xs flex-1 bg-amber-50/50 dark:bg-amber-900/10" readOnly />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-32 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Status
                </Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{stageOrder.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-32 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Start Date
                </Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="h-7 text-xs flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-32 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Closing Date
                </Label>
                <Input type="date" value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })}
                  className="h-7 text-xs flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-32 text-xs text-right shrink-0 text-[hsl(var(--primary))] font-semibold">
                  Closing %
                </Label>
                <div className="flex items-center gap-2 flex-1">
                  <Progress value={parseInt(closingPercent)} className="h-2 flex-1" />
                  <span className="text-xs font-bold w-10 text-right">{closingPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* SAP B1 Tabbed Body */}
          <div className="p-4">
            <Tabs defaultValue="potential" className="w-full">
              <TabsList className="w-full grid grid-cols-6 h-8">
                <TabsTrigger value="potential" className="text-xs h-7">Potential</TabsTrigger>
                <TabsTrigger value="general" className="text-xs h-7">General</TabsTrigger>
                <TabsTrigger value="stages" className="text-xs h-7">Stages</TabsTrigger>
                <TabsTrigger value="partners" className="text-xs h-7">Partners</TabsTrigger>
                <TabsTrigger value="summary" className="text-xs h-7">Summary</TabsTrigger>
                <TabsTrigger value="attachments" className="text-xs h-7">Attachments</TabsTrigger>
              </TabsList>

              {/* Potential Tab */}
              <TabsContent value="potential" className="mt-3">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="w-36 text-xs text-right shrink-0">Predicted Closing In</Label>
                      <Input value={form.predicted_closing_days} onChange={(e) => setForm({ ...form, predicted_closing_days: e.target.value })}
                        className="h-7 text-xs w-20" placeholder="" type="number" />
                      <span className="text-xs text-muted-foreground">Days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-36 text-xs text-right shrink-0">Predicted Closing Date</Label>
                      <Input value={form.expected_close} className="h-7 text-xs bg-amber-50/50 dark:bg-amber-900/10" readOnly />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-36 text-xs text-right shrink-0">Potential Amount</Label>
                      <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                        className="h-7 text-xs" placeholder="0.00" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-36 text-xs text-right shrink-0">Weighted Amount</Label>
                      <Input value={form.weighted_amount} className="h-7 text-xs bg-amber-50/50 dark:bg-amber-900/10" readOnly />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-36 text-xs text-right shrink-0">Gross Profit %</Label>
                      <Input type="number" value={form.gross_profit_percent}
                        onChange={(e) => setForm({ ...form, gross_profit_percent: e.target.value })}
                        className="h-7 text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-36 text-xs text-right shrink-0">Level of Interest</Label>
                      <Select value={form.level_of_interest || '__none__'} onValueChange={(v) => setForm({ ...form, level_of_interest: v === '__none__' ? '' : v })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-</SelectItem>
                          {interestLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Interest Range</p>
                    <div className="border border-border rounded text-xs min-h-[120px]">
                      <div className="grid grid-cols-3 gap-0 border-b border-border bg-muted/30 p-1.5">
                        <span className="font-medium">#</span>
                        <span className="font-medium">Description</span>
                        <span className="font-medium">Primary</span>
                      </div>
                      <div className="p-1.5">
                        <div className="grid grid-cols-3 gap-0 items-center">
                          <span>1</span>
                          <Input value={form.interest_field} onChange={(e) => setForm({ ...form, interest_field: e.target.value })}
                            className="h-6 text-xs border-0 p-0 shadow-none" placeholder="Enter interest..." />
                          <input type="checkbox" className="h-3 w-3 ml-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* General Tab */}
              <TabsContent value="general" className="mt-3">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="w-32 text-xs text-right shrink-0">Industry</Label>
                      <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                        className="h-7 text-xs" placeholder="e.g. Manufacturing" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-32 text-xs text-right shrink-0">Source</Label>
                      <Select value={form.source || '__none__'} onValueChange={(v) => setForm({ ...form, source: v === '__none__' ? '' : v })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-</SelectItem>
                          {sourceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-32 text-xs text-right shrink-0">Closing Type</Label>
                      <Select value={form.closing_type || '__none__'} onValueChange={(v) => setForm({ ...form, closing_type: v === '__none__' ? '' : v })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-</SelectItem>
                          {closingTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-32 text-xs text-right shrink-0">Probability %</Label>
                      <Input type="number" min="0" max="100" value={form.probability}
                        onChange={(e) => setForm({ ...form, probability: e.target.value })}
                        className="h-7 text-xs w-20" />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Label className="w-24 text-xs text-right shrink-0 pt-1">Notes</Label>
                      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className="text-xs min-h-[80px]" placeholder="Additional notes..." />
                    </div>
                    <div className="flex items-start gap-2">
                      <Label className="w-24 text-xs text-right shrink-0 pt-1">Remarks</Label>
                      <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                        className="text-xs min-h-[60px]" placeholder="Remarks..." />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Stages Tab */}
              <TabsContent value="stages" className="mt-3">
                <div className="border border-border rounded">
                  <div className="grid grid-cols-4 gap-0 border-b border-border bg-muted/30 p-2">
                    <span className="text-xs font-medium">#</span>
                    <span className="text-xs font-medium">Stage Name</span>
                    <span className="text-xs font-medium">Closing %</span>
                    <span className="text-xs font-medium">Status</span>
                  </div>
                  {stageOrder.map((stage, i) => {
                    const isActive = stage === form.stage;
                    const isPast = i < stageIndex;
                    return (
                      <div key={stage} className={`grid grid-cols-4 gap-0 p-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${isActive ? 'bg-primary/5' : ''}`}
                        onClick={() => setForm({ ...form, stage })}>
                        <span className="text-xs">{i + 1}</span>
                        <span className={`text-xs ${isActive ? 'font-bold text-primary' : ''}`}>{stage}</span>
                        <span className="text-xs">{((i + 1) / stageOrder.length * 100).toFixed(0)}%</span>
                        <Badge variant={isActive ? 'default' : isPast ? 'secondary' : 'outline'} className="text-[10px] w-fit h-5">
                          {isActive ? 'Current' : isPast ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Partners Tab */}
              <TabsContent value="partners" className="mt-3">
                <div className="text-xs text-muted-foreground">
                  {selectedBP ? (
                    <div className="border border-border rounded p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="font-medium">Code:</span> {selectedBP.card_code}</div>
                        <div><span className="font-medium">Name:</span> {selectedBP.card_name}</div>
                        <div><span className="font-medium">Contact:</span> {form.contact_person || '-'}</div>
                        <div><span className="font-medium">Territory:</span> {form.territory || '-'}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-8">Select a Business Partner in the header to see partner details.</p>
                  )}
                </div>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="mt-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2 border border-border rounded p-3">
                    <p className="font-semibold text-sm mb-2">Financial Summary</p>
                    <div className="flex justify-between"><span>Potential Amount:</span><span className="font-bold">{parseFloat(form.value || '0').toLocaleString('en-SA')} SAR</span></div>
                    <div className="flex justify-between"><span>Probability:</span><span>{form.probability}%</span></div>
                    <div className="flex justify-between"><span>Weighted Amount:</span><span className="font-bold">{parseFloat(form.weighted_amount).toLocaleString('en-SA')} SAR</span></div>
                    <div className="flex justify-between"><span>Gross Profit %:</span><span>{form.gross_profit_percent}%</span></div>
                  </div>
                  <div className="space-y-2 border border-border rounded p-3">
                    <p className="font-semibold text-sm mb-2">Timeline</p>
                    <div className="flex justify-between"><span>Start Date:</span><span>{form.start_date || '-'}</span></div>
                    <div className="flex justify-between"><span>Closing Date:</span><span>{form.expected_close || '-'}</span></div>
                    <div className="flex justify-between"><span>Current Stage:</span><span className="font-bold">{form.stage}</span></div>
                    <div className="flex justify-between"><span>Closing %:</span><span>{closingPercent}%</span></div>
                  </div>
                </div>
              </TabsContent>

              {/* Attachments Tab */}
              <TabsContent value="attachments" className="mt-3">
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded">
                  No attachments. Drag & drop files here or use the attachment feature after saving.
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* SAP B1 Footer */}
        <div className="border-t border-border px-3 py-2 flex items-center justify-between bg-muted/30">
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs px-4" onClick={handleSubmit} disabled={isPending || !form.name || !form.company || !form.value}>
              {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {mode === 'add' ? 'Add' : 'Update'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-4" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled>Related Activities</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled>Related Documents</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OpportunitySAPDialog(props: OpportunitySAPDialogProps) {
  return (
    <RequiredFieldsProvider module="opportunities">
      <OpportunitySAPDialogInner {...props} />
    </RequiredFieldsProvider>
  );
}
