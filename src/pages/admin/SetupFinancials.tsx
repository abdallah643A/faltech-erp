import { useSettingsService } from '@/hooks/useSettingsService';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { AdminPageLayout, AdminSection, SettingField } from '@/components/admin/AdminPageLayout';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Landmark, Calculator, Percent, DollarSign, Calendar, CreditCard, Layers } from 'lucide-react';

export default function SetupFinancials() {
  const s = useSettingsService('setup_financials');
  const { entries: auditEntries } = useAuditTrail('setup_financials');

  const F = ({ label, k, type = 'text', help, opts, effect, required }: {
    label: string; k: string; type?: string; help?: string;
    opts?: { value: string; label: string }[]; effect?: string; required?: boolean;
  }) => (
    <SettingField label={label} helpText={help} error={s.validationErrors[k]} effectType={effect} required={required}>
      {type === 'switch' ? (
        <Switch checked={s.getValue(k) === 'true'} onCheckedChange={v => s.setValue(k, v ? 'true' : 'false')} />
      ) : type === 'select' && opts ? (
        <Select value={s.getValue(k)} onValueChange={v => s.setValue(k, v)}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{opts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Input type={type === 'number' ? 'number' : 'text'} value={s.getValue(k)} onChange={e => s.setValue(k, e.target.value)} className="h-8" />
      )}
    </SettingField>
  );

  return (
    <AdminPageLayout
      title="Financials Setup" titleAr="إعداد المالية"
      description="Accounting, tax, cost accounting, budget, currency, and period control configuration"
      descriptionAr="تهيئة المحاسبة والضرائب والتحكم في الميزانية"
      icon={<Landmark className="h-6 w-6" />} module="setup_financials"
      isDirty={s.isDirty} isLoading={s.isLoading} isSaving={s.isSaving}
      onSave={() => s.save([])} onReset={s.reset} onResetToDefaults={() => s.resetToDefaults([])}
      changeSummary={s.getChangeSummary()} auditEntries={auditEntries}
      affectedModules={['Finance', 'AP', 'AR', 'Inventory', 'Payroll']}
    >
      <Tabs defaultValue="gl" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="gl" className="gap-1"><Landmark className="h-3 w-3" />G/L Defaults</TabsTrigger>
          <TabsTrigger value="tax" className="gap-1"><Percent className="h-3 w-3" />Tax Setup</TabsTrigger>
          <TabsTrigger value="cost" className="gap-1"><Calculator className="h-3 w-3" />Cost Accounting</TabsTrigger>
          <TabsTrigger value="budget" className="gap-1"><DollarSign className="h-3 w-3" />Budget Control</TabsTrigger>
          <TabsTrigger value="fx" className="gap-1"><DollarSign className="h-3 w-3" />Foreign Currency</TabsTrigger>
          <TabsTrigger value="period" className="gap-1"><Calendar className="h-3 w-3" />Period Control</TabsTrigger>
          <TabsTrigger value="payment" className="gap-1"><CreditCard className="h-3 w-3" />Payment Terms</TabsTrigger>
          <TabsTrigger value="dimensions" className="gap-1"><Layers className="h-3 w-3" />Dimensions</TabsTrigger>
        </TabsList>

        <TabsContent value="gl" className="space-y-4">
          <AdminSection title="G/L Account Defaults" description="Core general ledger account mappings. Changes after posting transactions may cause inconsistencies." badge="Critical">
            <F label="Chart of Accounts Template" k="coa_template" type="select" opts={[
              { value: 'standard', label: 'Standard' }, { value: 'ifrs', label: 'IFRS' }, { value: 'custom', label: 'Custom' }
            ]} effect="future_transactions" required />
            <F label="Default Receivables Account" k="default_ar_account" help="e.g. 1200 - Accounts Receivable" effect="immediate" required />
            <F label="Default Payables Account" k="default_ap_account" help="e.g. 2100 - Accounts Payable" effect="immediate" required />
            <F label="Suspense Account" k="suspense_account" help="Used for unresolved or temporary postings" effect="immediate" />
            <F label="Retained Earnings Account" k="retained_earnings_account" help="Year-end closing target account" effect="future_transactions" />
            <F label="Auto Journal Entry Creation" k="auto_journal_creation" type="switch" help="Automatically create JE when posting documents" effect="immediate" />
            <F label="Allow Backdated Journal Entries" k="allow_backdated_je" type="switch" help="Permit postings to previous open periods" effect="immediate" />
            <F label="Default Journal Remark Format" k="journal_remark_format" help="Variables: {DocType}, {DocNum}, {Date}, {BP}" effect="future_transactions" />
          </AdminSection>

          <AdminSection title="Year-End Closing" description="Settings controlling fiscal year closure behavior">
            <F label="Year-End Closing Method" k="year_end_method" type="select" opts={[
              { value: 'auto', label: 'Automatic Transfer' }, { value: 'manual', label: 'Manual Journal' }
            ]} effect="future_transactions" />
            <F label="Unrealized Exchange Difference Handling" k="unrealized_fx_handling" type="select" opts={[
              { value: 'revalue', label: 'Revaluation' }, { value: 'realize', label: 'Realize on Close' }
            ]} effect="future_transactions" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <AdminSection title="Tax Configuration" description="Tax calculation method and default tax behavior">
            <F label="Tax Calculation Method" k="tax_calc_method" type="select" opts={[
              { value: 'line', label: 'Line Level' }, { value: 'header', label: 'Header Level' }, { value: 'document', label: 'Document Total' }
            ]} effect="future_transactions" required />
            <F label="Default Tax Group" k="default_tax_group" type="select" opts={[
              { value: 'vat15', label: 'VAT 15%' }, { value: 'vat5', label: 'VAT 5%' }, { value: 'exempt', label: 'Exempt' }, { value: 'zero', label: 'Zero Rated' }
            ]} effect="future_transactions" />
            <F label="Withholding Tax Enabled" k="withholding_tax_enabled" type="switch" help="Enable withholding tax deduction on vendor payments" effect="immediate" />
            <F label="Tax Rounding" k="tax_rounding" type="select" opts={[
              { value: 'up', label: 'Round Up' }, { value: 'down', label: 'Round Down' }, { value: 'nearest', label: 'Nearest' }
            ]} effect="future_transactions" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <AdminSection title="Cost Accounting Settings" description="Cost centers, profit centers, and dimension requirements">
            <F label="Cost Centers Mandatory" k="cost_centers_mandatory" type="switch" help="Require cost center on all financial transactions" effect="immediate" />
            <F label="Dimensions Mandatory" k="dimensions_mandatory" type="switch" help="Require at least one dimension on journal entries" effect="immediate" />
            <F label="Cost Accounting Method" k="cost_accounting_method" type="select" opts={[
              { value: 'standard', label: 'Standard Costing' }, { value: 'actual', label: 'Actual Costing' }, { value: 'marginal', label: 'Marginal Costing' }
            ]} effect="future_transactions" />
            <F label="Profit Center Tracking" k="profit_center_tracking" type="switch" effect="immediate" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <AdminSection title="Budget Control" description="Budget enforcement and deviation handling">
            <F label="Budget Control Enabled" k="budget_control_enabled" type="switch" help="Master switch for budget checking on transactions" effect="immediate" />
            <F label="Budget Exceed Behavior" k="budget_exceed_behavior" type="select" opts={[
              { value: 'warning', label: 'Warning Only' }, { value: 'block', label: 'Block Transaction' }, { value: 'approval', label: 'Send to Approval' }
            ]} help="What happens when a transaction exceeds budget" effect="immediate" />
            <F label="Budget Check Level" k="budget_check_level" type="select" opts={[
              { value: 'account', label: 'Per Account' }, { value: 'cost_center', label: 'Per Cost Center' }, { value: 'department', label: 'Per Department' }
            ]} effect="immediate" />
            <F label="Budget Tolerance (%)" k="budget_tolerance_pct" type="number" help="Allow exceeding budget up to this percentage" effect="immediate" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="fx" className="space-y-4">
          <AdminSection title="Foreign Currency Settings" description="Exchange rate sources and multi-currency behavior">
            <F label="Multi-Currency Enabled" k="multi_currency_enabled" type="switch" help="Enable foreign currency transactions" effect="immediate" />
            <F label="Exchange Rate Source" k="exchange_rate_source" type="select" opts={[
              { value: 'manual', label: 'Manual Entry' }, { value: 'central_bank', label: 'Central Bank API' }, { value: 'custom', label: 'Custom Provider' }
            ]} effect="immediate" />
            <F label="Revaluation Gain Account" k="reval_gain_account" help="Account for unrealized FX gains" effect="immediate" />
            <F label="Revaluation Loss Account" k="reval_loss_account" help="Account for unrealized FX losses" effect="immediate" />
            <F label="Realized Gain Account" k="realized_gain_account" effect="immediate" />
            <F label="Realized Loss Account" k="realized_loss_account" effect="immediate" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="period" className="space-y-4">
          <AdminSection title="Period Control Settings" description="How posting periods interact with document processing">
            <F label="Allow Posting to Prior Periods" k="allow_prior_period_posting" type="switch" help="Requires permission override even if period is open" effect="immediate" />
            <F label="Period Lock Behavior" k="period_lock_behavior" type="select" opts={[
              { value: 'soft', label: 'Soft Lock (Override Allowed)' }, { value: 'hard', label: 'Hard Lock (No Override)' }
            ]} effect="immediate" />
            <F label="Auto-Close Period After (days)" k="auto_close_days" type="number" help="0 = manual close only" effect="immediate" />
            <F label="Year-End Adjustment Period Enabled" k="adjustment_period_enabled" type="switch" help="Allow special period for year-end adjustments" effect="future_transactions" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <AdminSection title="Payment Terms Defaults" description="Default payment behavior for new documents">
            <F label="Default Customer Payment Terms" k="default_customer_payment_terms" type="select" opts={[
              { value: 'net30', label: 'Net 30' }, { value: 'net60', label: 'Net 60' }, { value: 'immediate', label: 'Immediate' }, { value: 'cod', label: 'Cash on Delivery' }
            ]} effect="future_transactions" />
            <F label="Default Vendor Payment Terms" k="default_vendor_payment_terms" type="select" opts={[
              { value: 'net30', label: 'Net 30' }, { value: 'net60', label: 'Net 60' }, { value: 'immediate', label: 'Immediate' }
            ]} effect="future_transactions" />
            <F label="Early Payment Discount (%)" k="early_payment_discount" type="number" effect="future_transactions" />
            <F label="Discount Period (days)" k="discount_period_days" type="number" effect="future_transactions" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="dimensions" className="space-y-4">
          <AdminSection title="Financial Dimensions" description="Define mandatory dimensions for financial transactions">
            <F label="Dimension 1 Label" k="dim1_label" help="e.g. Department, Branch" effect="immediate" />
            <F label="Dimension 1 Mandatory" k="dim1_mandatory" type="switch" effect="immediate" />
            <F label="Dimension 2 Label" k="dim2_label" help="e.g. Project, Cost Center" effect="immediate" />
            <F label="Dimension 2 Mandatory" k="dim2_mandatory" type="switch" effect="immediate" />
            <F label="Dimension 3 Label" k="dim3_label" help="e.g. Employee, Region" effect="immediate" />
            <F label="Dimension 3 Mandatory" k="dim3_mandatory" type="switch" effect="immediate" />
            <F label="Dimension 4 Label" k="dim4_label" effect="immediate" />
            <F label="Dimension 4 Mandatory" k="dim4_mandatory" type="switch" effect="immediate" />
          </AdminSection>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
