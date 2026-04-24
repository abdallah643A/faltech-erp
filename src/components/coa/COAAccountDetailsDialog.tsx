import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Account } from './COATreeItem';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

export function COAAccountDetailsDialog({ open, onOpenChange, account }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    acct_code: '',
    acct_name: '',
    foreign_name: '',
    code_for_exporting: '',
    default_vat_group: '',
    category: '',
    planning_level: '',
    remarks: '',
    remarks_template: '',
    account_status: 'active',
    active_from: '',
    active_to: '',
    active_remarks: '',
    balance_allowed: false,
    balance_from: '',
    balance_to: '',
    cost_accounting_only: false,
    allow_multi_linking: false,
    permit_other_vat: true,
  });

  useEffect(() => {
    if (account && open) {
      setForm({
        acct_code: account.acct_code || '',
        acct_name: account.acct_name || '',
        foreign_name: account.foreign_name || '',
        code_for_exporting: account.code_for_exporting || '',
        default_vat_group: account.default_vat_group || '',
        category: account.category || '',
        planning_level: account.planning_level || '',
        remarks: account.remarks || '',
        remarks_template: account.remarks_template || '',
        account_status: account.account_status || 'active',
        active_from: account.active_from || '',
        active_to: account.active_to || '',
        active_remarks: account.active_remarks || '',
        balance_allowed: account.balance_allowed ?? false,
        balance_from: account.balance_from?.toString() || '',
        balance_to: account.balance_to?.toString() || '',
        cost_accounting_only: account.cost_accounting_only ?? false,
        allow_multi_linking: account.allow_multi_linking ?? false,
        permit_other_vat: account.permit_other_vat ?? true,
      });
    }
  }, [account, open]);

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({
          foreign_name: form.foreign_name || null,
          code_for_exporting: form.code_for_exporting || null,
          default_vat_group: form.default_vat_group || null,
          category: form.category || null,
          planning_level: form.planning_level || null,
          remarks: form.remarks || null,
          remarks_template: form.remarks_template || null,
          account_status: form.account_status,
          active_from: form.active_from || null,
          active_to: form.active_to || null,
          active_remarks: form.active_remarks || null,
          balance_allowed: form.balance_allowed,
          balance_from: form.balance_from ? parseFloat(form.balance_from) : null,
          balance_to: form.balance_to ? parseFloat(form.balance_to) : null,
          cost_accounting_only: form.cost_accounting_only,
          allow_multi_linking: form.allow_multi_linking,
          permit_other_vat: form.permit_other_vat,
        })
        .eq('id', account.id);
      if (error) throw error;
      toast({ title: 'Account details saved' });
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        {/* SAP-style navy title bar */}
        <div className="bg-[#1a3a5c] text-white px-4 py-2.5 flex items-center">
          <span className="text-sm font-semibold">G/L Account Details</span>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Top fields */}
          <div className="space-y-2.5">
            <Row label="G/L Account">
              <Input value={form.acct_code} readOnly className="h-7 text-xs font-mono bg-[#fffbea] border-[#d0d5dd]" />
            </Row>
            <Row label="Account Name">
              <Input value={form.acct_name} readOnly className="h-7 text-xs bg-[#fffbea] border-[#d0d5dd]" />
            </Row>
            <Row label="Foreign Name">
              <Input value={form.foreign_name} onChange={e => set('foreign_name', e.target.value)} className="h-7 text-xs border-[#d0d5dd]" />
            </Row>
          </div>

          <hr className="border-[#d0d5dd]" />

          {/* Code for Exporting */}
          <Row label="Code for Exporting">
            <Input value={form.code_for_exporting} onChange={e => set('code_for_exporting', e.target.value)} className="h-7 text-xs border-[#d0d5dd]" />
          </Row>

          <hr className="border-[#d0d5dd]" />

          {/* Default VAT Group */}
          <Row label="Default VAT Group">
            <Input value={form.default_vat_group} onChange={e => set('default_vat_group', e.target.value)} className="h-7 text-xs border-[#d0d5dd]" placeholder="Select or type..." />
          </Row>

          {/* Category & Planning Level */}
          <div className="bg-[#fffbea] border border-[#e8a000]/30 rounded p-2.5 space-y-2">
            <Row label="Category">
              <div className="flex gap-2">
                <Select value={form.category} onValueChange={v => set('category', v)}>
                  <SelectTrigger className="h-7 text-xs border-[#d0d5dd] flex-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="purchasing">Purchasing</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Row>
            <Row label="Planning Level">
              <Input value={form.planning_level} onChange={e => set('planning_level', e.target.value)} className="h-7 text-xs border-[#d0d5dd] bg-[#fffbea]" />
            </Row>
          </div>

          <hr className="border-[#d0d5dd]" />

          {/* Remarks */}
          <Row label="Remarks" alignTop>
            <Textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} className="text-xs border-[#d0d5dd] min-h-[60px] resize-none" />
          </Row>
          <Row label="Remarks Template">
            <Input value={form.remarks_template} onChange={e => set('remarks_template', e.target.value)} className="h-7 text-xs border-[#d0d5dd]" />
          </Row>

          <hr className="border-[#d0d5dd]" />

          {/* Status: Active / Inactive / Advanced */}
          <div className="space-y-2">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="status" checked={form.account_status === 'active'} onChange={() => set('account_status', 'active')} className="accent-[#0066cc]" />
                <span className="text-xs font-medium">Active</span>
              </label>
              {form.account_status === 'active' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">From</span>
                  <Input type="date" value={form.active_from} onChange={e => set('active_from', e.target.value)} className="h-7 text-xs w-28 border-[#d0d5dd]" />
                  <span className="text-muted-foreground">To</span>
                  <Input type="date" value={form.active_to} onChange={e => set('active_to', e.target.value)} className="h-7 text-xs w-28 border-[#d0d5dd]" />
                </div>
              )}
            </div>
            {form.account_status === 'active' && (
              <div className="ml-[72px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Remarks</span>
                  <Input value={form.active_remarks} onChange={e => set('active_remarks', e.target.value)} className="h-7 text-xs border-[#d0d5dd]" />
                </div>
              </div>
            )}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="status" checked={form.account_status === 'inactive'} onChange={() => set('account_status', 'inactive')} className="accent-[#0066cc]" />
              <span className="text-xs">Inactive</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="status" checked={form.account_status === 'advanced'} onChange={() => set('account_status', 'advanced')} className="accent-[#0066cc]" />
              <span className="text-xs">Advanced</span>
            </label>
          </div>

          <hr className="border-[#d0d5dd]" />

          {/* Bottom checkboxes */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Checkbox checked={form.balance_allowed} onCheckedChange={v => set('balance_allowed', !!v)} className="h-3.5 w-3.5" />
              <span className="text-xs">Account Balance Allowed</span>
              {form.balance_allowed && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Input value={form.balance_from} onChange={e => set('balance_from', e.target.value)} className="h-7 text-xs w-24 border-[#d0d5dd]" type="number" />
                  <span className="text-xs text-muted-foreground">To</span>
                  <Input value={form.balance_to} onChange={e => set('balance_to', e.target.value)} className="h-7 text-xs w-24 border-[#d0d5dd]" type="number" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={form.cost_accounting_only} onCheckedChange={v => set('cost_accounting_only', !!v)} className="h-3.5 w-3.5" />
              <span className="text-xs">Cost Accounting Adjustment Only</span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={form.allow_multi_linking} onCheckedChange={v => set('allow_multi_linking', !!v)} className="h-3.5 w-3.5" />
              <span className="text-xs">Allow Multiple Linking to Financial Templates</span>
            </div>
          </div>

          <hr className="border-[#d0d5dd]" />

          {/* Permit Other VAT Group */}
          <div className="flex items-center gap-3">
            <Checkbox checked={form.permit_other_vat} onCheckedChange={v => set('permit_other_vat', !!v)} className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Permit Other VAT Group</span>
          </div>
        </div>

        {/* SAP-style footer */}
        <DialogFooter className="px-5 py-3 border-t border-[#d0d5dd] bg-[#f0f2f4] gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#1a7a4a] hover:bg-[#156b3e] text-white min-w-[80px]">
            {saving ? 'Saving...' : 'OK'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="min-w-[80px] border-[#d0d5dd]">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children, alignTop }: { label: string; children: React.ReactNode; alignTop?: boolean }) {
  return (
    <div className={`flex gap-3 ${alignTop ? 'items-start' : 'items-center'}`}>
      <Label className="text-xs text-muted-foreground whitespace-nowrap min-w-[130px] text-right pt-0.5">
        {label}
      </Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
