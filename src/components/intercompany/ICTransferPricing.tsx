import { useState } from 'react';
import { useICRelationships, useICTransferPricing } from '@/hooks/useIntercompany';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';

const METHODS = [
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'fixed_markup', label: 'Fixed Markup %' },
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'price_list', label: 'Price List' },
  { value: 'last_purchase', label: 'Last Purchase Price' },
  { value: 'standard_cost', label: 'Standard Cost' },
  { value: 'moving_average', label: 'Moving Average' },
];

const SCOPES = [
  { value: 'all', label: 'All Items' },
  { value: 'item', label: 'Specific Item' },
  { value: 'item_group', label: 'Item Group' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'project', label: 'Project' },
  { value: 'transaction_type', label: 'Transaction Type' },
];

export default function ICTransferPricing() {
  const { t } = useLanguage();
  const { relationships } = useICRelationships();
  const { companies } = useSAPCompanies();
  const [selectedRel, setSelectedRel] = useState('');
  const { rules, upsertRule, deleteRule } = useICTransferPricing(selectedRel || undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    rule_name: '', pricing_method: 'cost_plus', markup_percent: 0,
    fixed_price: '', price_list_name: '', scope_type: 'all', scope_value: '',
    effective_from: '', effective_to: '', priority: 100, is_active: true, notes: '',
  });

  const companyName = (id: string) => companies.find(c => c.id === id)?.company_name || id?.slice(0, 8);

  const save = () => {
    upsertRule.mutate({
      ...form,
      relationship_id: selectedRel,
      markup_percent: Number(form.markup_percent) || 0,
      fixed_price: form.fixed_price ? parseFloat(form.fixed_price) : null,
      priority: Number(form.priority) || 100,
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
    }, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label>{t('ic.selectRelationship')}</Label>
        <Select value={selectedRel} onValueChange={setSelectedRel}>
          <SelectTrigger className="w-[400px]"><SelectValue placeholder={t('ic.selectRelationship')} /></SelectTrigger>
          <SelectContent>
            {relationships.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>{companyName(r.source_company_id)} ↔ {companyName(r.target_company_id)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRel && <Button size="sm" onClick={() => { setForm({ rule_name: '', pricing_method: 'cost_plus', markup_percent: 0, fixed_price: '', price_list_name: '', scope_type: 'all', scope_value: '', effective_from: '', effective_to: '', priority: 100, is_active: true, notes: '' }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />{t('ic.addRule')}</Button>}
      </div>

      {selectedRel ? (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ic.ruleName')}</TableHead>
                <TableHead>{t('ic.method')}</TableHead>
                <TableHead>{t('ic.markup')}</TableHead>
                <TableHead>{t('ic.scope')}</TableHead>
                <TableHead>{t('ic.priority')}</TableHead>
                <TableHead>{t('ic.effectiveDates')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('ic.noRules')}</TableCell></TableRow>
              ) : rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rule_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.pricing_method?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{r.markup_percent}%</TableCell>
                  <TableCell>{r.scope_type}{r.scope_value ? `: ${r.scope_value}` : ''}</TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell className="text-xs">{r.effective_from || '—'} → {r.effective_to || '—'}</TableCell>
                  <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('ic.selectRelFirst')}</CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('ic.addPricingRule')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('ic.ruleName')}</Label><Input value={form.rule_name} onChange={e => setForm((f: any) => ({ ...f, rule_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('ic.method')}</Label>
                <Select value={form.pricing_method} onValueChange={v => setForm((f: any) => ({ ...f, pricing_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('ic.markup')} %</Label><Input type="number" value={form.markup_percent} onChange={e => setForm((f: any) => ({ ...f, markup_percent: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('ic.scope')}</Label>
                <Select value={form.scope_type} onValueChange={v => setForm((f: any) => ({ ...f, scope_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.scope_type !== 'all' && <div><Label>{t('ic.scopeValue')}</Label><Input value={form.scope_value} onChange={e => setForm((f: any) => ({ ...f, scope_value: e.target.value }))} /></div>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('ic.priority')}</Label><Input type="number" value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))} /></div>
              <div><Label>{t('ic.from')}</Label><Input type="date" value={form.effective_from} onChange={e => setForm((f: any) => ({ ...f, effective_from: e.target.value }))} /></div>
              <div><Label>{t('ic.to')}</Label><Input type="date" value={form.effective_to} onChange={e => setForm((f: any) => ({ ...f, effective_to: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={save} disabled={!form.rule_name}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
