import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDimensionLevels } from '@/hooks/useDimensionLevels';
import { useCurrencies } from '@/hooks/useCurrencies';
import type { Account } from './COATreeItem';
import { useActiveCompany } from '@/hooks/useActiveCompany';

interface COAAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  parentCode?: string | null;
  suggestedCode?: string;
  suggestedLevel?: number;
}

export function COAAccountDialog({ open, onOpenChange, account, parentCode, suggestedCode, suggestedLevel }: COAAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { activeLevels } = useDimensionLevels();
  const { currencies } = useCurrencies();
  const isEdit = !!account;

  const { data: bsLines = [] } = useQuery({
    queryKey: ['bs-report-lines-dropdown'],
    queryFn: async () => {
      const { data: sections } = await (supabase.from as any)('bs_report_sections').select('id, header_ar, header_en, section_key').order('display_order');
      const { data: lines } = await (supabase.from as any)('bs_report_lines').select('id, label_ar, label_en, section_id, line_order').order('line_order');
      if (!sections || !lines) return [];
      return (lines as any[]).map((l: any) => {
        const sec = (sections as any[]).find((s: any) => s.id === l.section_id);
        return { id: l.id, label_ar: l.label_ar, label_en: l.label_en, section_ar: sec?.header_ar || '', section_en: sec?.header_en || '' };
      });
    },
  });

  const [form, setForm] = useState({
    acct_code: '',
    acct_name: '',
    acct_type: 'A',
    acct_level: 1,
    father_acct_code: '',
    is_active: true,
    balance: 0,
    require_dim1: false,
    require_dim2: false,
    require_dim3: false,
    require_dim4: false,
    require_dim5: false,
    is_confidential: false,
    is_control_account: false,
    account_currency: 'SAR',
    bs_debit_line_id: '' as string,
    bs_credit_line_id: '' as string,
  });
  const [saving, setSaving] = useState(false);

  const showDimensions = form.acct_type === 'I' || form.acct_type === 'E';

  useEffect(() => {
    if (account) {
      setForm({
        acct_code: account.acct_code || '',
        acct_name: account.acct_name || '',
        acct_type: account.acct_type || 'A',
        acct_level: account.acct_level || 1,
        father_acct_code: account.father_acct_code || '',
        is_active: account.is_active ?? true,
        balance: account.balance || 0,
        require_dim1: account.require_dim1 ?? false,
        require_dim2: account.require_dim2 ?? false,
        require_dim3: account.require_dim3 ?? false,
        require_dim4: account.require_dim4 ?? false,
        require_dim5: account.require_dim5 ?? false,
        is_confidential: account.is_confidential ?? false,
        is_control_account: account.is_control_account ?? false,
        account_currency: account.account_currency || 'SAR',
        bs_debit_line_id: (account as any).bs_debit_line_id || '',
        bs_credit_line_id: (account as any).bs_credit_line_id || '',
      });
    } else {
      setForm({
        acct_code: suggestedCode || '',
        acct_name: '',
        acct_type: 'A',
        acct_level: suggestedLevel ?? 1,
        father_acct_code: parentCode || '',
        is_active: true,
        balance: 0,
        require_dim1: false,
        require_dim2: false,
        require_dim3: false,
        require_dim4: false,
        require_dim5: false,
        is_confidential: false,
        is_control_account: false,
        account_currency: 'SAR',
        bs_debit_line_id: '',
        bs_credit_line_id: '',
      });
    }
  }, [account, parentCode, suggestedCode, suggestedLevel, open]);

  const handleSave = async () => {
    if (!form.acct_code.trim() || !form.acct_name.trim()) {
      toast({ title: 'Validation Error', description: 'Account code and name are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const dimFields = {
        require_dim1: showDimensions ? form.require_dim1 : false,
        require_dim2: showDimensions ? form.require_dim2 : false,
        require_dim3: showDimensions ? form.require_dim3 : false,
        require_dim4: showDimensions ? form.require_dim4 : false,
        require_dim5: showDimensions ? form.require_dim5 : false,
      };
      const bsFields = {
        bs_debit_line_id: form.bs_debit_line_id || null,
        bs_credit_line_id: form.bs_credit_line_id || null,
      };

      if (isEdit) {
        const { error } = await (supabase
          .from('chart_of_accounts') as any)
          .update({
            acct_name: form.acct_name,
            acct_type: form.acct_type,
            acct_level: form.acct_level,
            father_acct_code: form.father_acct_code || null,
            is_active: form.is_active,
            is_confidential: form.is_confidential,
            is_control_account: form.is_control_account,
            account_currency: form.account_currency,
            ...dimFields,
            ...bsFields,
          })
          .eq('id', account!.id);
        if (error) throw error;
        toast({ title: 'Account updated successfully' });
      } else {
        const { error } = await (supabase
          .from('chart_of_accounts') as any)
          .insert({
            acct_code: form.acct_code,
            acct_name: form.acct_name,
            acct_type: form.acct_type,
            acct_level: form.acct_level,
            father_acct_code: form.father_acct_code || null,
            is_active: form.is_active,
            balance: 0,
            is_confidential: form.is_confidential,
            is_control_account: form.is_control_account,
            account_currency: form.account_currency,
            company_id: activeCompanyId || null,
            ...dimFields,
            ...bsFields,
          });
        if (error) throw error;
        toast({ title: 'Account created successfully' });
      }
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'Add New Account'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Account Code *</Label>
              <Input
                value={form.acct_code}
                onChange={e => setForm(f => ({ ...f, acct_code: e.target.value }))}
                disabled={isEdit}
                placeholder="e.g. 110101"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account Type</Label>
              <Select value={form.acct_type} onValueChange={v => setForm(f => ({ ...f, acct_type: v }))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Assets</SelectItem>
                  <SelectItem value="L">Liabilities</SelectItem>
                  <SelectItem value="I">Income</SelectItem>
                  <SelectItem value="E">Expense</SelectItem>
                  <SelectItem value="N">Non-Operating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Account Name *</Label>
            <Input
              value={form.acct_name}
              onChange={e => setForm(f => ({ ...f, acct_name: e.target.value }))}
              placeholder="Account name"
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Parent Account Code</Label>
              <Input
                value={form.father_acct_code}
                onChange={e => setForm(f => ({ ...f, father_acct_code: e.target.value }))}
                placeholder="Parent code"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Level</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.acct_level}
                onChange={e => setForm(f => ({ ...f, acct_level: parseInt(e.target.value) || 1 }))}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <Label className="text-xs">Account Currency</Label>
            <Select value={form.account_currency} onValueChange={v => setForm(f => ({ ...f, account_currency: v }))}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.length > 0 ? currencies.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </SelectItem>
                )) : (
                  <>
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>

          {/* Confidential & Control Account */}
          <div className="space-y-2 border border-border rounded-md p-3 bg-accent/20">
            <Label className="text-xs font-semibold text-foreground">Account Restrictions</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.is_confidential}
                  onCheckedChange={v => setForm(f => ({ ...f, is_confidential: !!v }))}
                  className="h-3.5 w-3.5"
                />
                <div>
                  <span className="text-xs text-foreground">Confidential Account</span>
                  <p className="text-[10px] text-muted-foreground">Balance hidden from users without confidential access authorization</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.is_control_account}
                  onCheckedChange={v => setForm(f => ({ ...f, is_control_account: !!v }))}
                  className="h-3.5 w-3.5"
                />
                <div>
                  <span className="text-xs text-foreground">Control Account</span>
                  <p className="text-[10px] text-muted-foreground">Cannot be used directly in manual journal entries</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Center / Dimension Requirements */}
          {showDimensions && (
            <div className="space-y-2 border border-border rounded-md p-3 bg-accent/20">
              <Label className="text-xs font-semibold text-foreground">
                Cost Center (Dimensions) — Mandatory in Journal Entries
              </Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Check the dimensions that must be filled when this account is used in a Journal Entry.
              </p>
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5].map(n => {
                  const level = activeLevels.find(l => l.dimension_number === n);
                  if (!level) return null;
                  const key = `require_dim${n}` as keyof typeof form;
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <Checkbox
                        checked={form[key] as boolean}
                        onCheckedChange={v => setForm(f => ({ ...f, [key]: !!v }))}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs text-foreground">
                        Dim {n}: {level.name}
                      </span>
                    </div>
                  );
                })}
                {activeLevels.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic">No active dimension levels configured.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
