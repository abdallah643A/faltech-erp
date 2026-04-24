import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEntityRelationships, EntityRelationship } from '@/hooks/useEntityRelationships';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Link2, Plus, Trash2, Loader2, Search, ArrowRight, Network } from 'lucide-react';

const ENTITY_OPTIONS = [
  { value: 'business_partners', label: 'Business Partner' },
  { value: 'sales_orders', label: 'Sales Order' },
  { value: 'ar_invoices', label: 'A/R Invoice' },
  { value: 'quotes', label: 'Quotation' },
  { value: 'delivery_notes', label: 'Delivery Note' },
  { value: 'incoming_payments', label: 'Incoming Payment' },
  { value: 'purchase_orders', label: 'Purchase Order' },
  { value: 'items', label: 'Item' },
  { value: 'leads', label: 'Lead' },
  { value: 'opportunities', label: 'Opportunity' },
  { value: 'activities', label: 'Activity' },
  { value: 'projects', label: 'Project' },
];

const REL_TYPES = [
  { value: 'related', label: 'Related To' },
  { value: 'parent', label: 'Parent Of' },
  { value: 'child', label: 'Child Of' },
  { value: 'reference', label: 'References' },
  { value: 'created_from', label: 'Created From' },
];

export default function DragAndRelate() {
  const { language } = useLanguage();
  const { allRelationships, loadingAll, createRelationship, deleteRelationship, ENTITY_LABELS } = useEntityRelationships();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const [form, setForm] = useState({
    source_entity: '',
    source_id: '',
    source_label: '',
    target_entity: '',
    target_id: '',
    target_label: '',
    relationship_type: 'related',
    notes: '',
  });

  const handleCreate = () => {
    createRelationship.mutate(form);
    setShowDialog(false);
    setForm({ source_entity: '', source_id: '', source_label: '', target_entity: '', target_id: '', target_label: '', relationship_type: 'related', notes: '' });
  };

  const filtered = allRelationships.filter(r => {
    if (entityFilter !== 'all' && r.source_entity !== entityFilter && r.target_entity !== entityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (r.source_label?.toLowerCase().includes(q) || r.target_label?.toLowerCase().includes(q) ||
        r.source_id.toLowerCase().includes(q) || r.target_id.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q));
    }
    return true;
  });

  // Build a visual graph summary
  const entityCounts: Record<string, number> = {};
  allRelationships.forEach(r => {
    entityCounts[r.source_entity] = (entityCounts[r.source_entity] || 0) + 1;
    entityCounts[r.target_entity] = (entityCounts[r.target_entity] || 0) + 1;
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            {language === 'ar' ? 'الربط والعلاقات' : 'Drag & Relate'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'ربط السجلات عبر الوحدات المختلفة - مثل SAP B1 Drag & Relate' : 'Cross-module record linking — SAP B1-style Drag & Relate'}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'ربط جديد' : 'New Relationship'}
        </Button>
      </div>

      {/* Entity summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(entityCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([entity, count]) => (
          <Card key={entity} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setEntityFilter(entity)}>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">{count}</div>
              <div className="text-xs text-muted-foreground">{ENTITY_LABELS[entity] || entity}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === 'ar' ? 'بحث...' : 'Search relationships...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الكيانات' : 'All Entities'}</SelectItem>
                {ENTITY_OPTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAll ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              {language === 'ar' ? 'لا توجد علاقات' : 'No relationships found. Create one to link records across modules.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'المصدر' : 'Source'}</TableHead>
                  <TableHead className="w-[140px] text-center">{language === 'ar' ? 'العلاقة' : 'Relationship'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الهدف' : 'Target'}</TableHead>
                  <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                  <TableHead className="w-[80px]">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rel) => (
                  <TableRow key={rel.id}>
                    <TableCell>
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1">{ENTITY_LABELS[rel.source_entity] || rel.source_entity}</Badge>
                        <div className="text-sm font-medium">{rel.source_label || rel.source_id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-[10px]">{REL_TYPES.find(r => r.value === rel.relationship_type)?.label || rel.relationship_type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1">{ENTITY_LABELS[rel.target_entity] || rel.target_entity}</Badge>
                        <div className="text-sm font-medium">{rel.target_label || rel.target_id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{rel.notes || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(rel.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRelationship.mutate(rel.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'إنشاء علاقة جديدة' : 'Create New Relationship'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 border rounded-lg space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'المصدر' : 'SOURCE'}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.source_entity} onValueChange={v => setForm(f => ({ ...f, source_entity: v }))}>
                  <SelectTrigger><SelectValue placeholder="Entity type..." /></SelectTrigger>
                  <SelectContent>{ENTITY_OPTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Record ID or Code" value={form.source_id} onChange={e => setForm(f => ({ ...f, source_id: e.target.value }))} />
              </div>
              <Input placeholder="Label (optional)" value={form.source_label} onChange={e => setForm(f => ({ ...f, source_label: e.target.value }))} />
            </div>

            <div className="flex justify-center">
              <Select value={form.relationship_type} onValueChange={v => setForm(f => ({ ...f, relationship_type: v }))}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>{REL_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="p-3 border rounded-lg space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground">{language === 'ar' ? 'الهدف' : 'TARGET'}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.target_entity} onValueChange={v => setForm(f => ({ ...f, target_entity: v }))}>
                  <SelectTrigger><SelectValue placeholder="Entity type..." /></SelectTrigger>
                  <SelectContent>{ENTITY_OPTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Record ID or Code" value={form.target_id} onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))} />
              </div>
              <Input placeholder="Label (optional)" value={form.target_label} onChange={e => setForm(f => ({ ...f, target_label: e.target.value }))} />
            </div>

            <Textarea placeholder={language === 'ar' ? 'ملاحظات...' : 'Notes (optional)...'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.source_entity || !form.source_id || !form.target_entity || !form.target_id}>
              <Link2 className="h-4 w-4 mr-1" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
