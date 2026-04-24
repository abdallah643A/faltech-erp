import { useState } from 'react';
import { useICRelationships, useICMirrorRules } from '@/hooks/useIntercompany';
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
import { Plus, Trash2, Copy } from 'lucide-react';

const DOC_TYPES = [
  'Sales Order', 'Purchase Order', 'Delivery', 'Goods Receipt PO',
  'AR Invoice', 'AP Invoice', 'AR Credit Memo', 'AP Credit Memo',
  'Goods Receipt', 'Goods Issue', 'Inventory Transfer', 'Down Payment Invoice',
  'Service Invoice', 'Expense Recharge',
];

const TIMINGS = [
  { value: 'on_save', label: 'On Save' },
  { value: 'on_post', label: 'On Post' },
  { value: 'on_approval', label: 'After Approval' },
  { value: 'manual', label: 'Manual' },
];

export default function ICMirrorRulesTab() {
  const { t } = useLanguage();
  const { relationships } = useICRelationships();
  const { companies } = useSAPCompanies();
  const [selectedRel, setSelectedRel] = useState('');
  const { mirrorRules, upsertMirrorRule, deleteMirrorRule } = useICMirrorRules(selectedRel || undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    rule_name: '', source_doc_type: '', target_doc_type: '',
    mirror_timing: 'on_post', auto_create: false, approval_required: true,
    copy_remarks: true, copy_attachments: false, copy_dimensions: true, apply_transfer_pricing: true,
    is_active: true, notes: '',
  });

  const companyName = (id: string) => companies.find(c => c.id === id)?.company_name || id?.slice(0, 8);

  const save = () => {
    upsertMirrorRule.mutate({ ...form, relationship_id: selectedRel }, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label>{t('ic.selectRelationship')}</Label>
        <Select value={selectedRel} onValueChange={setSelectedRel}>
          <SelectTrigger className="w-[400px]"><SelectValue placeholder={t('ic.selectRelationship')} /></SelectTrigger>
          <SelectContent>
            {relationships.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>
                {companyName(r.source_company_id)} ↔ {companyName(r.target_company_id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRel && <Button size="sm" onClick={() => { setForm({ rule_name: '', source_doc_type: '', target_doc_type: '', mirror_timing: 'on_post', auto_create: false, approval_required: true, copy_remarks: true, copy_attachments: false, copy_dimensions: true, apply_transfer_pricing: true, is_active: true, notes: '' }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />{t('ic.addRule')}</Button>}
      </div>

      {selectedRel ? (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ic.ruleName')}</TableHead>
                <TableHead>{t('ic.sourceDocType')}</TableHead>
                <TableHead>→</TableHead>
                <TableHead>{t('ic.targetDocType')}</TableHead>
                <TableHead>{t('ic.timing')}</TableHead>
                <TableHead>{t('ic.autoCreate')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mirrorRules.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('ic.noRules')}</TableCell></TableRow>
              ) : mirrorRules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rule_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.source_doc_type}</Badge></TableCell>
                  <TableCell><Copy className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                  <TableCell><Badge variant="secondary">{r.target_doc_type}</Badge></TableCell>
                  <TableCell>{r.mirror_timing?.replace('_', ' ')}</TableCell>
                  <TableCell>{r.auto_create ? '✓' : '—'}</TableCell>
                  <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => deleteMirrorRule.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
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
          <DialogHeader><DialogTitle>{t('ic.addMirrorRule')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('ic.ruleName')}</Label><Input value={form.rule_name} onChange={e => setForm((f: any) => ({ ...f, rule_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('ic.sourceDocType')}</Label>
                <Select value={form.source_doc_type} onValueChange={v => setForm((f: any) => ({ ...f, source_doc_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('ic.targetDocType')}</Label>
                <Select value={form.target_doc_type} onValueChange={v => setForm((f: any) => ({ ...f, target_doc_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('ic.timing')}</Label>
              <Select value={form.mirror_timing} onValueChange={v => setForm((f: any) => ({ ...f, mirror_timing: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMINGS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.auto_create} onCheckedChange={v => setForm((f: any) => ({ ...f, auto_create: v }))} /><Label>{t('ic.autoCreate')}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.approval_required} onCheckedChange={v => setForm((f: any) => ({ ...f, approval_required: v }))} /><Label>{t('ic.approvalReq')}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.copy_dimensions} onCheckedChange={v => setForm((f: any) => ({ ...f, copy_dimensions: v }))} /><Label>{t('ic.copyDimensions')}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.apply_transfer_pricing} onCheckedChange={v => setForm((f: any) => ({ ...f, apply_transfer_pricing: v }))} /><Label>{t('ic.applyTP')}</Label></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={save} disabled={!form.rule_name || !form.source_doc_type || !form.target_doc_type}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
