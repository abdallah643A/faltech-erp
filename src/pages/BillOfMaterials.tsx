import { useState } from 'react';
import { useBillOfMaterials, useBOMLines } from '@/hooks/useBOM';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Package, Layers, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const bomExpCols: ColumnDef[] = [
  { key: 'bom_number', header: 'BOM #' }, { key: 'product_name', header: 'Product' },
  { key: 'product_code', header: 'Code' }, { key: 'version', header: 'Version' },
  { key: 'total_cost', header: 'Total Cost' }, { key: 'status', header: 'Status' },
];

export default function BillOfMaterials() {
  const { t } = useLanguage();
  const { boms, isLoading, createBOM } = useBillOfMaterials();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ product_name: '', product_code: '', description: '', uom: 'EA', standard_qty: 1 });
  const [lineForm, setLineForm] = useState({ item_description: '', item_code: '', quantity: 1, uom: 'EA', unit_cost: 0 });

  const { lines, createLine, deleteLine } = useBOMLines(selectedBom || undefined);

  const filtered = (boms || []).filter(b =>
    !searchTerm || b.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || b.bom_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedBomData = boms?.find(b => b.id === selectedBom);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bill of Materials</h1>
          <p className="text-muted-foreground">Manage product structures and component lists</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={boms || []} columns={bomExpCols} filename="bill-of-materials" title="Bill of Materials" />
          <Button onClick={() => { setForm({ product_name: '', product_code: '', description: '', uom: 'EA', standard_qty: 1 }); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New BOM
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Layers className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{boms?.length || 0}</p><p className="text-xs text-muted-foreground">Total BOMs</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><Package className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{boms?.filter(b => b.status === 'active').length || 0}</p><p className="text-xs text-muted-foreground">{t('common.active')}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Layers className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{boms?.reduce((s, b) => s + (b.total_cost || 0), 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Cost (SAR)</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList><TabsTrigger value="list">BOM List</TabsTrigger><TabsTrigger value="detail" disabled={!selectedBom}>BOM Detail</TabsTrigger></TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search BOMs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>BOM #</TableHead><TableHead>Product</TableHead><TableHead>Code</TableHead>
                <TableHead>Version</TableHead><TableHead>Total Cost</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow> :
                 filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No BOMs found</TableCell></TableRow> :
                 filtered.map(bom => (
                  <TableRow key={bom.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedBom(bom.id)}>
                    <TableCell className="font-mono text-sm">{bom.bom_number}</TableCell>
                    <TableCell className="font-medium">{bom.product_name}</TableCell>
                    <TableCell>{bom.product_code || '—'}</TableCell>
                    <TableCell>v{bom.version}</TableCell>
                    <TableCell>{(bom.total_cost || 0).toLocaleString()} SAR</TableCell>
                    <TableCell><Badge variant={bom.status === 'active' ? 'default' : 'secondary'}>{bom.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="detail" className="space-y-4">
          {selectedBomData && (
            <>
              <Card><CardHeader><CardTitle>{selectedBomData.product_name} ({selectedBomData.bom_number})</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Code:</span> {selectedBomData.product_code || '—'}</div>
                    <div><span className="text-muted-foreground">UOM:</span> {selectedBomData.uom}</div>
                    <div><span className="text-muted-foreground">Qty:</span> {selectedBomData.standard_qty}</div>
                    <div><span className="text-muted-foreground">Total Cost:</span> {(selectedBomData.total_cost || 0).toLocaleString()} SAR</div>
                  </div>
                </CardContent>
              </Card>

              <Card><CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Components</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="Item" value={lineForm.item_description} onChange={e => setLineForm({...lineForm, item_description: e.target.value})} className="w-40" />
                  <Input placeholder="Code" value={lineForm.item_code} onChange={e => setLineForm({...lineForm, item_code: e.target.value})} className="w-24" />
                  <Input type="number" placeholder="Qty" value={lineForm.quantity} onChange={e => setLineForm({...lineForm, quantity: +e.target.value})} className="w-20" />
                  <Input type="number" placeholder="Cost" value={lineForm.unit_cost} onChange={e => setLineForm({...lineForm, unit_cost: +e.target.value})} className="w-24" />
                  <Button size="sm" disabled={!lineForm.item_description} onClick={() => {
                    createLine.mutate({ bom_id: selectedBom, ...lineForm, line_total: lineForm.quantity * lineForm.unit_cost, line_num: (lines?.length || 0) + 1 });
                    setLineForm({ item_description: '', item_code: '', quantity: 1, uom: 'EA', unit_cost: 0 });
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>#</TableHead><TableHead>Item</TableHead><TableHead>Code</TableHead>
                    <TableHead>Qty</TableHead><TableHead>Unit Cost</TableHead><TableHead>{t('common.total')}</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(lines || []).map(line => (
                      <TableRow key={line.id}>
                        <TableCell>{line.line_num}</TableCell>
                        <TableCell>{line.item_description}</TableCell>
                        <TableCell>{line.item_code || '—'}</TableCell>
                        <TableCell>{line.quantity}</TableCell>
                        <TableCell>{(line.unit_cost || 0).toLocaleString()}</TableCell>
                        <TableCell>{(line.line_total || 0).toLocaleString()}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteLine.mutate(line.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Bill of Materials</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Product Name</Label><Input value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Product Code</Label><Input value={form.product_code} onChange={e => setForm({...form, product_code: e.target.value})} /></div>
              <div><Label>UOM</Label><Input value={form.uom} onChange={e => setForm({...form, uom: e.target.value})} /></div>
            </div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!form.product_name} onClick={() => { createBOM.mutate(form); setFormOpen(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
