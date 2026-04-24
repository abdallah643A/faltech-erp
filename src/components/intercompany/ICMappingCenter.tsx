import { useState } from 'react';
import { useICRelationships, useICMappings } from '@/hooks/useIntercompany';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Package, BookOpen, Receipt, Warehouse } from 'lucide-react';

const MAPPING_TABS = [
  { key: 'bp', icon: Users, label: 'Business Partners' },
  { key: 'item', icon: Package, label: 'Items' },
  { key: 'account', icon: BookOpen, label: 'G/L Accounts' },
  { key: 'tax', icon: Receipt, label: 'Tax Codes' },
  { key: 'warehouse', icon: Warehouse, label: 'Warehouses' },
] as const;

function MappingTable({ type, relationshipId }: { type: 'bp' | 'item' | 'account' | 'tax' | 'warehouse'; relationshipId: string }) {
  const { t } = useLanguage();
  const { mappings, isLoading, upsertMapping, deleteMapping } = useICMappings(type, relationshipId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const fields: Record<string, { source: string; target: string; extra?: string[] }> = {
    bp: { source: 'source_bp_code', target: 'target_bp_code', extra: ['source_bp_name', 'target_bp_name'] },
    item: { source: 'source_item_code', target: 'target_item_code', extra: ['source_item_name', 'target_item_name'] },
    account: { source: 'source_account_code', target: 'target_account_code', extra: ['source_account_name', 'target_account_name'] },
    tax: { source: 'source_tax_code', target: 'target_tax_code', extra: ['source_tax_name', 'target_tax_name'] },
    warehouse: { source: 'source_warehouse_code', target: 'target_warehouse_code', extra: ['source_warehouse_name', 'target_warehouse_name'] },
  };

  const f = fields[type];

  const save = () => {
    upsertMapping.mutate({ ...form, relationship_id: relationshipId, is_active: true }, { onSuccess: () => { setOpen(false); setForm({}); } });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setForm({}); setOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" />{t('ic.addMapping')}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('ic.sourceCode')}</TableHead>
            <TableHead>{t('ic.sourceName')}</TableHead>
            <TableHead>{t('ic.targetCode')}</TableHead>
            <TableHead>{t('ic.targetName')}</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">{t('ic.noMappings')}</TableCell></TableRow>
          ) : mappings.map((m: any) => (
            <TableRow key={m.id}>
              <TableCell className="font-mono text-xs">{m[f.source]}</TableCell>
              <TableCell>{m[f.extra?.[0] || '']}</TableCell>
              <TableCell className="font-mono text-xs">{m[f.target]}</TableCell>
              <TableCell>{m[f.extra?.[1] || '']}</TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => deleteMapping.mutate(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('ic.addMapping')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('ic.sourceCode')}</Label><Input value={form[f.source] || ''} onChange={e => setForm((p: any) => ({ ...p, [f.source]: e.target.value }))} /></div>
              <div><Label>{t('ic.sourceName')}</Label><Input value={form[f.extra?.[0] || ''] || ''} onChange={e => setForm((p: any) => ({ ...p, [f.extra?.[0] || '']: e.target.value }))} /></div>
              <div><Label>{t('ic.targetCode')}</Label><Input value={form[f.target] || ''} onChange={e => setForm((p: any) => ({ ...p, [f.target]: e.target.value }))} /></div>
              <div><Label>{t('ic.targetName')}</Label><Input value={form[f.extra?.[1] || ''] || ''} onChange={e => setForm((p: any) => ({ ...p, [f.extra?.[1] || '']: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={save} disabled={upsertMapping.isPending}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ICMappingCenter() {
  const { t } = useLanguage();
  const { relationships } = useICRelationships();
  const { companies } = useSAPCompanies();
  const [selectedRel, setSelectedRel] = useState<string>('');

  const companyName = (id: string) => companies.find(c => c.id === id)?.company_name || id?.slice(0, 8);

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
      </div>

      {selectedRel ? (
        <Tabs defaultValue="bp">
          <TabsList>
            {MAPPING_TABS.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {MAPPING_TABS.map(tab => (
            <TabsContent key={tab.key} value={tab.key}>
              <Card><CardContent className="pt-4">
                <MappingTable type={tab.key} relationshipId={selectedRel} />
              </CardContent></Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('ic.selectRelFirst')}</CardContent></Card>
      )}
    </div>
  );
}
