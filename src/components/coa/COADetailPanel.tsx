import { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Save, Loader2, Trash2 } from 'lucide-react';
import { useDimensionLevels } from '@/hooks/useDimensionLevels';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Account } from './COATreeItem';

export interface COADetailPanelHandle {
  hasChanges: () => boolean;
  save: () => Promise<void>;
}

interface COADetailPanelProps {
  account: Account | null;
  computedLevel?: number;
  onBalanceDrilldown?: () => void;
  accounts?: Account[];
  depthMap?: Map<string, number>;
  onDirtyChange?: (dirty: boolean) => void;
  onAccountDeleted?: () => void;
}

const ACCT_TYPES = [
  { value: 'A', label: 'Assets', labelAr: 'أصول' },
  { value: 'L', label: 'Liabilities', labelAr: 'خصوم' },
  { value: 'I', label: 'Income', labelAr: 'إيرادات' },
  { value: 'E', label: 'Expense', labelAr: 'مصروفات' },
  { value: 'N', label: 'Non-Operating', labelAr: 'غير تشغيلي' },
];

export const COADetailPanel = forwardRef<COADetailPanelHandle, COADetailPanelProps>(function COADetailPanel({ account, computedLevel, onBalanceDrilldown, accounts = [], depthMap, onDirtyChange, onAccountDeleted }, ref) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeLevels } = useDimensionLevels();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [acctName, setAcctName] = useState('');
  const [externalCode, setExternalCode] = useState('');
  const [acctType, setAcctType] = useState('');
  const [acctLevel, setAcctLevel] = useState<number>(1);
  const [fatherAcctCode, setFatherAcctCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isControlAccount, setIsControlAccount] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);
  const [isCashAccount, setIsCashAccount] = useState(false);
  const [isRevalCurrency, setIsRevalCurrency] = useState(false);
  const [isConfidential, setIsConfidential] = useState(false);
  const [blockManualPosting, setBlockManualPosting] = useState(false);
  const [cashFlowRelevant, setCashFlowRelevant] = useState(false);
  const [bsDebit, setBsDebit] = useState('');
  const [bsCredit, setBsCredit] = useState('');
  const [initId, setInitId] = useState<string | null>(null);

  // Determine if this is a title account (has children)
  const isTitle = useMemo(() => {
    if (!account || !accounts.length) return false;
    return accounts.some(a => a.father_acct_code === account.acct_code);
  }, [account, accounts]);

  // Sync state when account changes
  useEffect(() => {
    if (account && initId !== account.id) {
      setAcctName(account.acct_name || '');
      setExternalCode((account as any).external_code || '');
      setAcctType(account.acct_type || '');
      setAcctLevel(computedLevel ?? account.acct_level ?? 1);
      setFatherAcctCode(account.father_acct_code || '');
      setIsActive(account.is_active ?? true);
      setIsControlAccount(!!account.is_control_account);
      setIsIndexed(!!(account as any).is_indexed);
      setIsCashAccount(!!(account as any).is_cash_account);
      setIsRevalCurrency(!!(account as any).is_reval_currency);
      setIsConfidential(!!account.is_confidential);
      setBlockManualPosting(!!(account as any).block_manual_posting);
      setCashFlowRelevant(!!(account as any).cash_flow_relevant);
      setBsDebit((account as any).bs_debit_line_id || '');
      setBsCredit((account as any).bs_credit_line_id || '');
      setInitId(account.id);
      setEditing(false);
    }
  }, [account, initId, computedLevel]);

  // Load BS report lines
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

  // Check if any field has changed
  const hasChanges = useMemo(() => {
    if (!account) return false;
    return (
      acctName !== (account.acct_name || '') ||
      externalCode !== ((account as any).external_code || '') ||
      acctType !== (account.acct_type || '') ||
      isActive !== (account.is_active ?? true) ||
      isControlAccount !== (!!account.is_control_account) ||
      isIndexed !== (!!(account as any).is_indexed) ||
      isCashAccount !== (!!(account as any).is_cash_account) ||
      isRevalCurrency !== (!!(account as any).is_reval_currency) ||
      isConfidential !== (!!account.is_confidential) ||
      blockManualPosting !== (!!(account as any).block_manual_posting) ||
      cashFlowRelevant !== (!!(account as any).cash_flow_relevant) ||
      bsDebit !== ((account as any).bs_debit_line_id || '') ||
      bsCredit !== ((account as any).bs_credit_line_id || '') ||
      acctLevel !== (computedLevel ?? account.acct_level ?? 1) ||
      fatherAcctCode !== (account.father_acct_code || '')
    );
  }, [account, acctName, externalCode, acctType, isActive, isControlAccount, isIndexed, isCashAccount, isRevalCurrency, isConfidential, blockManualPosting, cashFlowRelevant, bsDebit, bsCredit, acctLevel, fatherAcctCode, computedLevel]);

  // Notify parent of dirty state
  useEffect(() => {
    onDirtyChange?.(hasChanges && editing);
  }, [hasChanges, editing, onDirtyChange]);


  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const updateData: any = {
        acct_name: acctName,
        external_code: externalCode || null,
        acct_type: acctType || null,
        is_active: isActive,
        is_control_account: isControlAccount,
        is_confidential: isConfidential,
        is_indexed: isIndexed,
        is_cash_account: isCashAccount,
        is_reval_currency: isRevalCurrency,
        block_manual_posting: blockManualPosting,
        cash_flow_relevant: cashFlowRelevant,
        bs_debit_line_id: bsDebit || null,
        bs_credit_line_id: bsCredit || null,
      };

      // If level changed, update acct_level and potentially father_acct_code
      if (acctLevel !== (computedLevel ?? account.acct_level ?? 1) || fatherAcctCode !== (account.father_acct_code || '')) {
        updateData.acct_level = acctLevel;
        updateData.father_acct_code = fatherAcctCode || null;
      }

      const { error } = await supabase.from('chart_of_accounts').update(updateData as any).eq('id', account.id);
      if (error) throw error;

      // Cascade: if setting inactive, deactivate all descendant accounts
      if (!isActive && (account.is_active ?? true)) {
        const descendantIds: string[] = [];
        const findDescendants = (parentCode: string) => {
          for (const a of accounts) {
            if (a.father_acct_code === parentCode && a.id !== account.id) {
              descendantIds.push(a.id);
              findDescendants(a.acct_code);
            }
          }
        };
        findDescendants(account.acct_code);
        if (descendantIds.length > 0) {
          await supabase.from('chart_of_accounts').update({ is_active: false } as any).in('id', descendantIds);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      toast({ title: isAr ? 'تم حفظ التغييرات' : 'Changes saved successfully' });
      setEditing(false);
    } catch (e: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Delete account with validation
  const canDelete = useMemo(() => {
    if (!account) return { allowed: false, reason: '' };
    const hasChildren = accounts.some(a => a.father_acct_code === account.acct_code);
    if (hasChildren) return { allowed: false, reason: isAr ? 'لا يمكن حذف حساب له حسابات فرعية' : 'Cannot delete account with child accounts' };
    if (account.balance && Math.abs(account.balance) > 0.001) return { allowed: false, reason: isAr ? 'لا يمكن حذف حساب له رصيد' : 'Cannot delete account with balance' };
    return { allowed: true, reason: '' };
  }, [account, accounts, isAr]);

  const handleDelete = async () => {
    if (!account) return;
    setDeleting(true);
    try {
      const { count } = await supabase
        .from('journal_entry_lines')
        .select('id', { count: 'exact', head: true })
        .eq('acct_code', account.acct_code);
      if (count && count > 0) {
        toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'لا يمكن حذف حساب له قيود يومية' : 'Cannot delete account with journal entries', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('chart_of_accounts').delete().eq('id', account.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
      toast({ title: isAr ? 'تم حذف الحساب' : 'Account deleted' });
      onAccountDeleted?.();
    } catch (e: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Expose imperative handle for parent to call save
  useImperativeHandle(ref, () => ({
    hasChanges: () => hasChanges && editing,
    save: handleSave,
  }), [hasChanges, editing, handleSave]);

  if (!account) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {isAr ? 'اختر حساباً لعرض التفاصيل' : 'Select an account to view details'}
      </div>
    );
  }

  const showDimReqs = acctType === 'I' || acctType === 'E';
  const dimFlags = [
    { key: 'require_dim1', num: 1 },
    { key: 'require_dim2', num: 2 },
    { key: 'require_dim3', num: 3 },
    { key: 'require_dim4', num: 4 },
    { key: 'require_dim5', num: 5 },
  ];
  const hasAnyDimReq = showDimReqs && dimFlags.some(d => account[d.key]);

  return (
    <div className="space-y-4 p-3 pb-20 relative">
      {/* Section: G/L Account Details */}
      <div>
        <h3 className="text-[12px] font-semibold text-foreground border-b border-border pb-1 mb-3">
          {isAr ? 'تفاصيل حساب الأستاذ' : 'G/L Account Details'}
        </h3>

        <div className="flex items-center gap-6 mb-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full border-2 ${isTitle ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
            <span className="text-[12px] text-muted-foreground">{isAr ? 'عنوان' : 'Title'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full border-2 ${isActive ? 'border-primary bg-primary' : 'border-destructive bg-destructive'}`} />
            <span className="text-[12px] text-muted-foreground">{isAr ? 'حساب نشط' : 'Active Account'}</span>
          </div>
        </div>

        <div className="space-y-2">
          {/* G/L Account - read-only */}
          <div className="flex items-center gap-2">
            <Label className="text-[12px] text-muted-foreground whitespace-nowrap min-w-[110px] text-right">
              {isAr ? 'حساب الأستاذ' : 'G/L Account'}
            </Label>
            <Input readOnly value={account.acct_code} className="h-7 text-[12px] bg-accent/40 border-border font-mono" />
          </div>

          {/* Name - editable when editing */}
          <div className="flex items-center gap-2">
            <Label className="text-[12px] text-muted-foreground whitespace-nowrap min-w-[110px] text-right">
              {isAr ? 'الاسم' : 'Name'}
            </Label>
            <Input
              value={acctName}
              onChange={e => setAcctName(e.target.value)}
              readOnly={!editing}
              className={`h-7 text-[12px] border-border ${!editing ? 'bg-accent/40' : ''}`}
            />
          </div>

          {/* External Code */}
          <div className="flex items-center gap-2">
            <Label className="text-[12px] text-muted-foreground whitespace-nowrap min-w-[110px] text-right">
              {isAr ? 'الرمز الخارجي' : 'External Code'}
            </Label>
            <Input
              value={externalCode}
              onChange={e => setExternalCode(e.target.value)}
              readOnly={!editing}
              className={`h-7 text-[12px] border-border ${!editing ? 'bg-accent/40' : ''}`}
            />
          </div>

          {/* Level - editable when editing */}
          <div className="flex items-center gap-2">
            <Label className="text-[12px] text-muted-foreground whitespace-nowrap min-w-[110px] text-right">
              {isAr ? 'المستوى' : 'Level'}
            </Label>
            {editing ? (
              <Input
                type="number"
                min={1}
                max={10}
                value={acctLevel}
                onChange={e => setAcctLevel(parseInt(e.target.value) || 1)}
                className="h-7 text-[12px] border-border font-mono"
              />
            ) : (
              <Input readOnly value={computedLevel ?? account.acct_level ?? '-'} className="h-7 text-[12px] bg-accent/40 border-border font-mono" />
            )}
          </div>

          {/* Balance - read-only with drilldown */}
          <div className="flex items-center gap-2">
            <Label className="text-[12px] text-muted-foreground whitespace-nowrap min-w-[110px] text-right">
              {isAr ? 'الرصيد' : 'Balance'}
            </Label>
            {account.is_confidential ? (
              <Input readOnly value="••••••••" className="h-7 text-[12px] bg-destructive/5 border-border font-mono text-muted-foreground italic" title={isAr ? 'حساب سري' : 'Confidential'} />
            ) : (
              <>
                <Input readOnly value={account.balance != null ? account.balance.toLocaleString('en', { minimumFractionDigits: 2 }) : '0.00'} className="h-7 text-[12px] bg-accent/40 border-border font-mono font-semibold" />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-primary/10" onClick={onBalanceDrilldown} title={isAr ? 'تفاصيل الرصيد' : 'Balance Details'}>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section: Active / Inactive Toggle */}
      <div className="flex items-center justify-between py-2 border-y border-border">
        <span className="text-[12px] font-medium text-foreground">{isAr ? 'الحالة' : 'Status'}</span>
        <div className="flex items-center gap-2">
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={!editing}
          />
          <span className={`text-[12px] ${isActive ? 'text-primary font-medium' : 'text-destructive'}`}>
            {isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
          </span>
        </div>
      </div>

      {/* Section: G/L Account Properties */}
      <div>
        <h3 className="text-[12px] font-semibold text-foreground border-b border-border pb-1 mb-3">
          {isAr ? 'خصائص حساب الأستاذ' : 'G/L Account Properties'}
        </h3>

        <div className="space-y-2">
          {/* Account Type */}
          <div className="flex items-center gap-2">
            <Label className="text-[12px] text-muted-foreground whitespace-nowrap min-w-[110px] text-right">
              {isAr ? 'نوع الحساب' : 'Account Type'}
            </Label>
            {editing ? (
              <Select value={acctType} onValueChange={setAcctType}>
                <SelectTrigger className="h-7 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{isAr ? t.labelAr : t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input readOnly value={ACCT_TYPES.find(t => t.value === acctType)?.[isAr ? 'labelAr' : 'label'] || acctType} className="h-7 text-[12px] bg-accent/40 border-border" />
            )}
          </div>

          {/* Checkbox properties */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={isControlAccount} onCheckedChange={v => setIsControlAccount(!!v)} className="h-3.5 w-3.5" disabled={!editing} />
              <span className="text-[12px] text-muted-foreground">{isAr ? 'حساب مراقبة' : 'Control Account'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={isIndexed} onCheckedChange={v => setIsIndexed(!!v)} className="h-3.5 w-3.5" disabled={!editing} />
              <span className="text-[12px] text-muted-foreground">{isAr ? 'مفهرس' : 'Indexed'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={isCashAccount} onCheckedChange={v => setIsCashAccount(!!v)} className="h-3.5 w-3.5" disabled={!editing} />
              <span className="text-[12px] text-muted-foreground">{isAr ? 'حساب نقدي' : 'Cash Account'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={isRevalCurrency} onCheckedChange={v => setIsRevalCurrency(!!v)} className="h-3.5 w-3.5" disabled={!editing} />
              <span className="text-[12px] text-muted-foreground">{isAr ? 'إعادة تقييم (عملة)' : 'Reval. (Currency)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={isConfidential} onCheckedChange={v => setIsConfidential(!!v)} className="h-3.5 w-3.5" disabled={!editing} />
              <span className="text-[12px] text-muted-foreground">{isAr ? 'حساب سري' : 'Confidential'}</span>
            </div>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <Checkbox checked={blockManualPosting} onCheckedChange={v => setBlockManualPosting(!!v)} className="h-3.5 w-3.5" disabled={!editing} />
              <span className="text-[12px] text-muted-foreground">{isAr ? 'منع القيد اليدوي' : 'Block Manual Posting'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={cashFlowRelevant} onCheckedChange={v => setCashFlowRelevant(!!v)} className="h-3.5 w-3.5" disabled={!editing} />
              <span className="text-[12px] text-muted-foreground">{isAr ? 'متعلق بالتدفق النقدي' : 'Cash Flow Relevant'}</span>
            </div>
          </div>

          {account.account_currency && account.account_currency !== 'SAR' && (
            <div className="mt-2 flex items-center gap-2">
              <Label className="text-[12px] text-muted-foreground whitespace-nowrap min-w-[110px] text-right">{isAr ? 'العملة' : 'Currency'}</Label>
              <Input readOnly value={account.account_currency} className="h-7 text-[12px] bg-accent/40 border-border font-mono" />
            </div>
          )}
        </div>
      </div>

      {/* Section: Cost Center / Dimension Requirements */}
      {showDimReqs && (
        <div>
          <h3 className="text-[12px] font-semibold text-foreground border-b border-border pb-1 mb-3">
            {isAr ? 'مراكز التكلفة (الأبعاد)' : 'Cost Center (Dimensions)'}
          </h3>
          {hasAnyDimReq ? (
            <div className="space-y-1.5">
              {dimFlags.map(({ key, num }) => {
                const level = activeLevels.find(l => l.dimension_number === num);
                if (!level) return null;
                const required = !!account[key];
                return (
                  <div key={num} className="flex items-center gap-2">
                    <Checkbox checked={required} disabled className="h-3.5 w-3.5" />
                    <span className={`text-[12px] ${required ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      Dim {num}: {level.name}
                      {required && <span className="text-destructive ml-1 text-[10px]">(mandatory in JE)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              {isAr ? 'لم يتم تفعيل أي بعد إلزامي' : 'No mandatory dimensions configured for this account.'}
            </p>
          )}
        </div>
      )}

      {/* Section: Balance Sheet Report Mapping */}
      <div>
        <h3 className="text-[12px] font-semibold text-foreground border-b border-border pb-1 mb-3">
          {isAr ? 'ربط تقرير الميزانية' : 'BS Report Mapping'}
        </h3>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{isAr ? 'سطر رصيد مدين' : 'Debit Balance Line'}</Label>
            {editing ? (
              <Select value={bsDebit || 'none'} onValueChange={v => setBsDebit(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {bsLines.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="text-[10px] text-muted-foreground">{isAr ? l.section_ar : l.section_en}</span> → {isAr ? l.label_ar : l.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input readOnly value={bsLines.find((l: any) => l.id === bsDebit)?.[isAr ? 'label_ar' : 'label_en'] || '— None —'} className="h-7 text-[11px] bg-accent/40 border-border" />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{isAr ? 'سطر رصيد دائن' : 'Credit Balance Line'}</Label>
            {editing ? (
              <Select value={bsCredit || 'none'} onValueChange={v => setBsCredit(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {bsLines.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="text-[10px] text-muted-foreground">{isAr ? l.section_ar : l.section_en}</span> → {isAr ? l.label_ar : l.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input readOnly value={bsLines.find((l: any) => l.id === bsCredit)?.[isAr ? 'label_ar' : 'label_en'] || '— None —'} className="h-7 text-[11px] bg-accent/40 border-border" />
            )}
          </div>
        </div>
      </div>

      {/* Parent Account */}
      <div>
        <h3 className="text-[12px] font-semibold text-foreground border-b border-border pb-1 mb-3">
          {isAr ? 'الحساب الأب' : 'Parent Account'}
        </h3>
        <div className="flex items-center gap-2">
          <Label className="text-[12px] text-muted-foreground whitespace-nowrap min-w-[110px] text-right">{isAr ? 'الأب' : 'Father'}</Label>
          {editing ? (
            <Input value={fatherAcctCode} onChange={e => setFatherAcctCode(e.target.value)} className="h-7 text-[12px] border-border font-mono" />
          ) : (
            <Input readOnly value={account.father_acct_code || '-'} className="h-7 text-[12px] bg-accent/40 border-border font-mono" />
          )}
        </div>
      </div>

      {/* Edit / Save / Delete Buttons - sticky at bottom */}
      <div className="sticky bottom-0 bg-card pt-2 pb-1 border-t border-border space-y-1.5">
        {!editing ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[12px] flex-1 gap-1.5"
              onClick={() => setEditing(true)}
            >
              {isAr ? 'تعديل' : 'Edit'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-[12px] gap-1.5"
              disabled={!canDelete.allowed}
              title={canDelete.reason}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isAr ? 'حذف' : 'Delete'}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[12px] flex-1"
              onClick={() => {
                setEditing(false);
                setInitId(null);
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              className="h-8 text-[12px] flex-1 gap-1.5"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isAr ? 'حفظ' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? 'حذف الحساب' : 'Delete Account'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? `هل أنت متأكد من حذف الحساب ${account.acct_code} - ${account.acct_name}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete account ${account.acct_code} - ${account.acct_name}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isAr ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
