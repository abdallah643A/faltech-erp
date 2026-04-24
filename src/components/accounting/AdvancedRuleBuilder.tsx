import { useState, useEffect } from 'react';
import { useGLAdvancedRules } from '@/hooks/useGLAdvancedRules';
import { ACCOUNT_TYPE_LABELS, SAP_DOCUMENT_TYPES } from '@/services/sapPostingEngine';
import { useGLAccountDefaults } from '@/hooks/useGLAccountDefaults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Copy, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AdvancedRule, RuleAccount } from '@/services/sapPostingEngine';

const RULE_ACCOUNT_TYPES = [
  'inventory', 'cogs', 'revenue', 'sales_returns', 'purchase', 'purchase_returns',
  'variance', 'price_difference', 'gr_clearing', 'inventory_offset', 'wip',
  'revaluation', 'exchange_gain', 'exchange_loss', 'freight_expense', 'freight_revenue',
  'output_vat', 'input_vat', 'down_payment_clearing_ar', 'down_payment_clearing_ap',
];

export default function AdvancedRuleBuilder() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { criteria, rules, rulesLoading, getRuleAccounts, createRule, updateRule, deleteRule } = useGLAdvancedRules();
  const { accounts } = useGLAccountDefaults();
  const activeCriteria = criteria.filter(c => c.is_active);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AdvancedRule | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state
  const [form, setForm] = useState({
    rule_code: '', rule_name: '', description: '', priority: 100,
    status: 'draft', effective_from: '', effective_to: '', posting_period: '',
    match_type: 'exact',
  });
  const [criteriaValues, setCriteriaValues] = useState<Record<string, string>>({});
  const [ruleAccounts, setRuleAccounts] = useState<RuleAccount[]>([]);

  const openCreate = () => {
    setEditingRule(null);
    setForm({ rule_code: '', rule_name: '', description: '', priority: 100, status: 'draft', effective_from: '', effective_to: '', posting_period: '', match_type: 'exact' });
    setCriteriaValues({});
    setRuleAccounts([]);
    setDialogOpen(true);
  };

  const openEdit = async (rule: AdvancedRule) => {
    setEditingRule(rule);
    setForm({
      rule_code: rule.rule_code, rule_name: rule.rule_name, description: rule.description || '',
      priority: rule.priority, status: rule.status, effective_from: rule.effective_from || '',
      effective_to: rule.effective_to || '', posting_period: rule.posting_period || '', match_type: rule.match_type,
    });
    setCriteriaValues(rule.criteria_values || {});
    const accts = await getRuleAccounts(rule.id);
    setRuleAccounts(accts);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      rule: {
        ...form,
        criteria_values: criteriaValues,
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
        posting_period: form.posting_period || null,
      },
      accounts: ruleAccounts.filter(a => a.acct_code),
    };
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createRule.mutate(payload as any, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const addAccount = () => setRuleAccounts([...ruleAccounts, { account_type: '', acct_code: '', acct_name: '' }]);
  const removeAccount = (i: number) => setRuleAccounts(ruleAccounts.filter((_, idx) => idx !== i));

  const filteredRules = filterStatus === 'all' ? rules : rules.filter(r => r.status === filterStatus);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{isAr ? 'القواعد المتقدمة' : 'Advanced G/L Rules'}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isAr ? 'القواعد المتقدمة تأخذ الأولوية على التحديد الافتراضي' : 'Advanced rules override default account determination'}
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Rule</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'الأولوية' : 'Priority'}</TableHead>
                <TableHead>{isAr ? 'الكود' : 'Code'}</TableHead>
                <TableHead>{isAr ? 'اسم القاعدة' : 'Rule Name'}</TableHead>
                <TableHead>{isAr ? 'المعايير' : 'Criteria'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{isAr ? 'الفعالية' : 'Validity'}</TableHead>
                <TableHead>{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map(rule => {
                const cv = rule.criteria_values || {};
                const criteriaCount = Object.keys(cv).length;
                return (
                  <TableRow key={rule.id}>
                    <TableCell><Badge variant="outline">{rule.priority}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{rule.rule_code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rule.rule_name}</p>
                        {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(cv).map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="text-xs">{k}={v as string}</Badge>
                        ))}
                        {criteriaCount === 0 && <span className="text-xs text-muted-foreground">No criteria</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.status === 'active' ? 'default' : rule.status === 'draft' ? 'secondary' : 'outline'}>
                        {rule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rule.effective_from || rule.effective_to
                        ? `${rule.effective_from || '∞'} → ${rule.effective_to || '∞'}`
                        : 'Always'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteRule.mutate(rule.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRules.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No rules found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rule Builder Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? (isAr ? 'تعديل القاعدة' : 'Edit Rule') : (isAr ? 'إنشاء قاعدة جديدة' : 'Create Advanced Rule')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Rule Code *</Label>
                <Input value={form.rule_code} onChange={e => setForm({ ...form, rule_code: e.target.value })} placeholder="e.g. ADV-001" />
              </div>
              <div>
                <Label>Rule Name *</Label>
                <Input value={form.rule_name} onChange={e => setForm({ ...form, rule_name: e.target.value })} />
              </div>
              <div>
                <Label>Priority (lower = higher)</Label>
                <Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 100 })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Match Type</Label>
                <Select value={form.match_type} onValueChange={v => setForm({ ...form, match_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exact Match</SelectItem>
                    <SelectItem value="partial">Partial Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Posting Period</Label>
                <Input value={form.posting_period} onChange={e => setForm({ ...form, posting_period: e.target.value })} placeholder="e.g. 2026-01" />
              </div>
              <div>
                <Label>Effective From</Label>
                <Input type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })} />
              </div>
              <div>
                <Label>Effective To</Label>
                <Input type="date" value={form.effective_to} onChange={e => setForm({ ...form, effective_to: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            {/* Criteria Values */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Matching Criteria</Label>
              <p className="text-sm text-muted-foreground mb-3">Set values for active criteria. Only rules matching all specified criteria will be selected.</p>
              <div className="grid grid-cols-3 gap-3">
                {activeCriteria.map(c => (
                  <div key={c.criterion_key}>
                    <Label className="text-xs">{c.criterion_label}</Label>
                    <Input
                      value={criteriaValues[c.criterion_key] || ''}
                      onChange={e => setCriteriaValues({ ...criteriaValues, [c.criterion_key]: e.target.value })}
                      placeholder={`Enter ${c.criterion_label}...`}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Target Accounts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Target Accounts</Label>
                <Button size="sm" variant="outline" onClick={addAccount}><Plus className="h-3 w-3 mr-1" /> Add Account</Button>
              </div>
              <div className="space-y-2">
                {ruleAccounts.map((acct, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="w-[200px]">
                      <Label className="text-xs">Account Type</Label>
                      <Select value={acct.account_type} onValueChange={v => {
                        const upd = [...ruleAccounts]; upd[i] = { ...upd[i], account_type: v }; setRuleAccounts(upd);
                      }}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {RULE_ACCOUNT_TYPES.map(t => (
                            <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t] || t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">G/L Account</Label>
                      <Select value={acct.acct_code || ''} onValueChange={v => {
                        const a = accounts.find((ac: any) => ac.acct_code === v);
                        const upd = [...ruleAccounts]; upd[i] = { ...upd[i], acct_code: v, acct_name: a?.acct_name || '' }; setRuleAccounts(upd);
                      }}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select account..." /></SelectTrigger>
                        <SelectContent>
                          {accounts.slice(0, 100).map((a: any) => (
                            <SelectItem key={a.acct_code} value={a.acct_code}>{a.acct_code} - {a.acct_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeAccount(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                {ruleAccounts.length === 0 && <p className="text-xs text-muted-foreground">No target accounts. Add accounts this rule should override.</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.rule_code || !form.rule_name}>
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
