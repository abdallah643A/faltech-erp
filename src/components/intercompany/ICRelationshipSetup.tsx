import { useState } from 'react';
import { useICRelationships } from '@/hooks/useIntercompany';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Link2 } from 'lucide-react';

const REL_TYPES = [
  { value: 'parent_subsidiary', label: 'Parent → Subsidiary' },
  { value: 'subsidiary_parent', label: 'Subsidiary → Parent' },
  { value: 'sister', label: 'Sister Companies' },
  { value: 'branch_to_branch', label: 'Branch to Branch' },
];

const DIRECTIONS = [
  { value: 'one_way', label: 'One-Way' },
  { value: 'two_way', label: 'Two-Way' },
];

const TAX_POLICIES = [
  { value: 'exempt', label: 'Exempt' },
  { value: 'standard', label: 'Standard' },
  { value: 'reverse_charge', label: 'Reverse Charge' },
  { value: 'zero_rated', label: 'Zero Rated' },
];

const PRICING_METHODS = [
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'fixed_markup', label: 'Fixed Markup' },
  { value: 'price_list', label: 'Price List' },
  { value: 'last_purchase', label: 'Last Purchase' },
  { value: 'standard_cost', label: 'Standard Cost' },
  { value: 'moving_average', label: 'Moving Average' },
  { value: 'item_specific', label: 'Item Specific' },
];

export default function ICRelationshipSetup() {
  const { t } = useLanguage();
  const { relationships, isLoading, upsertRelationship, deleteRelationship } = useICRelationships();
  const { companies } = useSAPCompanies();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const defaultForm = {
    source_company_id: '', target_company_id: '', relationship_type: 'sister', direction: 'two_way',
    is_active: true, ic_customer_code: '', ic_vendor_code: '',
    due_to_account: '', due_from_account: '', ic_revenue_account: '', ic_expense_account: '',
    ic_inventory_account: '', ic_clearing_account: '',
    tax_policy: 'exempt', transfer_pricing_method: 'cost_plus', default_markup_percent: 0,
    currency_handling: 'source', auto_post: false, draft_only: true, approval_required: true,
    approval_threshold: '', notes: '',
  };

  const [form, setForm] = useState(defaultForm);

  const openNew = () => { setEditing(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ ...defaultForm, ...r, approval_threshold: r.approval_threshold?.toString() || '' });
    setOpen(true);
  };

  const save = () => {
    const payload = {
      ...form,
      approval_threshold: form.approval_threshold ? parseFloat(form.approval_threshold) : null,
      default_markup_percent: Number(form.default_markup_percent) || 0,
      ...(editing ? { id: editing.id } : {}),
    };
    upsertRelationship.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  const companyName = (id: string) => companies.find(c => c.id === id)?.company_name || id?.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('ic.relDesc')}</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />{t('ic.addRelationship')}</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ic.source')}</TableHead>
                <TableHead>{t('ic.target')}</TableHead>
                <TableHead>{t('ic.type')}</TableHead>
                <TableHead>{t('ic.direction')}</TableHead>
                <TableHead>{t('ic.taxPolicy')}</TableHead>
                <TableHead>{t('ic.pricing')}</TableHead>
                <TableHead>{t('ic.autoPost')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relationships.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('ic.noRelationships')}</TableCell></TableRow>
              ) : relationships.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{companyName(r.source_company_id)}</TableCell>
                  <TableCell>{companyName(r.target_company_id)}</TableCell>
                  <TableCell><Badge variant="outline">{r.relationship_type?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{r.direction?.replace('_', '-')}</TableCell>
                  <TableCell>{r.tax_policy}</TableCell>
                  <TableCell>{r.transfer_pricing_method?.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{r.auto_post ? '✓' : '—'}</TableCell>
                  <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRelationship.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />{editing ? t('ic.editRelationship') : t('ic.addRelationship')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('ic.sourceCompany')}</Label>
                <Select value={form.source_company_id} onValueChange={v => setForm(f => ({ ...f, source_company_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('ic.targetCompany')}</Label>
                <Select value={form.target_company_id} onValueChange={v => setForm(f => ({ ...f, target_company_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t('ic.relType')}</Label>
                <Select value={form.relationship_type} onValueChange={v => setForm(f => ({ ...f, relationship_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REL_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('ic.direction')}</Label>
                <Select value={form.direction} onValueChange={v => setForm(f => ({ ...f, direction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('ic.taxPolicy')}</Label>
                <Select value={form.tax_policy} onValueChange={v => setForm(f => ({ ...f, tax_policy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TAX_POLICIES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('ic.icCustomerCode')}</Label><Input value={form.ic_customer_code} onChange={e => setForm(f => ({ ...f, ic_customer_code: e.target.value }))} /></div>
              <div><Label>{t('ic.icVendorCode')}</Label><Input value={form.ic_vendor_code} onChange={e => setForm(f => ({ ...f, ic_vendor_code: e.target.value }))} /></div>
            </div>

            <p className="text-xs font-semibold text-muted-foreground mt-2">{t('ic.accountSettings')}</p>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>{t('ic.dueToAcct')}</Label><Input value={form.due_to_account} onChange={e => setForm(f => ({ ...f, due_to_account: e.target.value }))} placeholder="e.g. 2110001" /></div>
              <div><Label>{t('ic.dueFromAcct')}</Label><Input value={form.due_from_account} onChange={e => setForm(f => ({ ...f, due_from_account: e.target.value }))} placeholder="e.g. 1310001" /></div>
              <div><Label>{t('ic.revenueAcct')}</Label><Input value={form.ic_revenue_account} onChange={e => setForm(f => ({ ...f, ic_revenue_account: e.target.value }))} /></div>
              <div><Label>{t('ic.expenseAcct')}</Label><Input value={form.ic_expense_account} onChange={e => setForm(f => ({ ...f, ic_expense_account: e.target.value }))} /></div>
              <div><Label>{t('ic.inventoryAcct')}</Label><Input value={form.ic_inventory_account} onChange={e => setForm(f => ({ ...f, ic_inventory_account: e.target.value }))} /></div>
              <div><Label>{t('ic.clearingAcct')}</Label><Input value={form.ic_clearing_account} onChange={e => setForm(f => ({ ...f, ic_clearing_account: e.target.value }))} /></div>
            </div>

            <p className="text-xs font-semibold text-muted-foreground mt-2">{t('ic.pricingAndApproval')}</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t('ic.pricingMethod')}</Label>
                <Select value={form.transfer_pricing_method} onValueChange={v => setForm(f => ({ ...f, transfer_pricing_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRICING_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('ic.defaultMarkup')}</Label><Input type="number" value={form.default_markup_percent} onChange={e => setForm(f => ({ ...f, default_markup_percent: Number(e.target.value) }))} /></div>
              <div><Label>{t('ic.approvalThreshold')}</Label><Input type="number" value={form.approval_threshold} onChange={e => setForm(f => ({ ...f, approval_threshold: e.target.value }))} /></div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>{t('common.active')}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.auto_post} onCheckedChange={v => setForm(f => ({ ...f, auto_post: v }))} /><Label>{t('ic.autoPost')}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.draft_only} onCheckedChange={v => setForm(f => ({ ...f, draft_only: v }))} /><Label>{t('ic.draftOnly')}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.approval_required} onCheckedChange={v => setForm(f => ({ ...f, approval_required: v }))} /><Label>{t('ic.approvalReq')}</Label></div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={save} disabled={!form.source_company_id || !form.target_company_id || upsertRelationship.isPending}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
