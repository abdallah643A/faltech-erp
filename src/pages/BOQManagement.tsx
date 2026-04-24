import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBOQ, BOQSection } from '@/hooks/useBOQ';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Lock, Unlock, FileText, Layers, DollarSign, ChevronRight, Package, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  priced: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  superseded: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export default function BOQManagement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sections, createSection, deleteSection, useItems, createItem, deleteItem } = useBOQ();
  const [selectedSection, setSelectedSection] = useState<BOQSection | null>(null);
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSection) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (rows.length === 0) { toast({ title: 'Empty file', variant: 'destructive' }); return; }
      let imported = 0;
      for (const row of rows) {
        const ref = row['Item Ref'] || row['item_ref'] || row['Ref'] || '';
        const desc = row['Description'] || row['description'] || '';
        if (!ref && !desc) continue;
        await createItem.mutateAsync({
          section_id: selectedSection.id,
          item_ref: String(ref),
          description: String(desc),
          unit: String(row['Unit'] || row['unit'] || 'nr'),
          quantity: Number(row['Quantity'] || row['quantity'] || row['Qty'] || 0),
          rate: Number(row['Rate'] || row['rate'] || 0),
          labor_cost: Number(row['Labour'] || row['labor_cost'] || row['Labor'] || 0),
          material_cost: Number(row['Material'] || row['material_cost'] || 0),
          plant_cost: Number(row['Plant'] || row['plant_cost'] || 0),
          subcontract_cost: Number(row['Subcontract'] || row['subcontract_cost'] || 0),
          markup_percent: Number(row['Markup %'] || row['markup_percent'] || 0),
          is_provisional: false,
          sort_order: imported + 1,
        } as any);
        imported++;
      }
      toast({ title: `Imported ${imported} items from Excel` });
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const items = useItems(selectedSection?.id || null);
  const itemsData = items.data || [];
  const totalAmount = itemsData.reduce((s, i) => s + (i.amount || 0), 0);
  const sectionsList = sections.data || [];

  const handleCreateSection = async (fd: FormData) => {
    await createSection.mutateAsync({
      section_code: fd.get('section_code') as string,
      section_title: fd.get('section_title') as string,
      measurement_standard: fd.get('measurement_standard') as string || 'NRM',
      currency: fd.get('currency') as string || 'SAR',
      created_by: user?.id,
    });
    setShowCreateSection(false);
  };

  const handleAddItem = async (fd: FormData) => {
    if (!selectedSection) return;
    await createItem.mutateAsync({
      section_id: selectedSection.id,
      item_ref: fd.get('item_ref') as string,
      description: fd.get('description') as string,
      unit: fd.get('unit') as string || 'nr',
      quantity: Number(fd.get('quantity')) || 0,
      rate: Number(fd.get('rate')) || 0,
      labor_cost: Number(fd.get('labor_cost')) || 0,
      material_cost: Number(fd.get('material_cost')) || 0,
      plant_cost: Number(fd.get('plant_cost')) || 0,
      subcontract_cost: Number(fd.get('subcontract_cost')) || 0,
      markup_percent: Number(fd.get('markup_percent')) || 0,
      is_provisional: fd.get('is_provisional') === 'on',
      sort_order: itemsData.length + 1,
    } as any);
    setShowAddItem(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bill of Quantities (BOQ)</h1>
          <p className="text-muted-foreground">NRM / CESMM4 / SMM7 compliant BOQ with versioning and multi-currency</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!selectedSection || importing}>
            <Upload className="h-4 w-4 mr-2" />{importing ? 'Importing...' : 'Import Excel'}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
          <Button onClick={() => setShowCreateSection(true)}><Plus className="h-4 w-4 mr-2" />New Section</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Sections</span></div>
          <p className="text-2xl font-bold mt-1">{sectionsList.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2"><Package className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Items</span></div>
          <p className="text-2xl font-bold mt-1">{itemsData.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Total Value</span></div>
          <p className="text-2xl font-bold mt-1">{totalAmount.toLocaleString()} SAR</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Standards</span></div>
          <p className="text-lg font-bold mt-1">{[...new Set(sectionsList.map(s => s.measurement_standard))].join(', ') || '-'}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section List */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">BOQ Sections</CardTitle></CardHeader>
          <CardContent className="p-0">
            {sectionsList.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No sections yet</p>
            ) : sectionsList.map(sec => (
              <div
                key={sec.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition ${selectedSection?.id === sec.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                onClick={() => setSelectedSection(sec)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{sec.section_code} - {sec.section_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{sec.measurement_standard}</Badge>
                      <Badge className={`text-xs ${statusColors[sec.status]}`}>{sec.status}</Badge>
                      <span className="text-xs text-muted-foreground">{sec.version_label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {sec.is_locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Unlock className="h-3 w-3 text-green-500" />}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Items Detail */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {selectedSection ? `${selectedSection.section_code} - ${selectedSection.section_title}` : 'Select a Section'}
              </CardTitle>
              {selectedSection && !selectedSection.is_locked && (
                <Button size="sm" onClick={() => setShowAddItem(true)}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedSection ? (
              <p className="text-center py-12 text-muted-foreground">Select a section to view BOQ items</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsData.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No items in this section</TableCell></TableRow>
                  ) : (
                    <>
                      {itemsData.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.item_ref}</TableCell>
                          <TableCell className="font-medium">
                            {item.description}
                            {item.is_provisional && <Badge variant="outline" className="ml-2 text-xs">P/S</Badge>}
                            {item.is_prime_cost && <Badge variant="outline" className="ml-2 text-xs">P/C</Badge>}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.rate.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{item.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            L:{item.labor_cost} M:{item.material_cost} P:{item.plant_cost} S:{item.subcontract_cost}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={5} className="text-right">Section Total</TableCell>
                        <TableCell className="text-right text-primary">{totalAmount.toLocaleString()} {selectedSection.currency}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Section Dialog */}
      <Dialog open={showCreateSection} onOpenChange={setShowCreateSection}>
        <DialogContent>
          <DialogHeader><DialogTitle>New BOQ Section</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleCreateSection(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Section Code *</Label><Input name="section_code" required placeholder="e.g. 1.0, 2.1" /></div>
              <div className="space-y-2"><Label>Section Title *</Label><Input name="section_title" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Standard</Label>
                <select name="measurement_standard" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="NRM">NRM</option><option value="CESMM4">CESMM4</option><option value="SMM7">SMM7</option><option value="custom">Custom</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <select name="currency" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="SAR">SAR</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateSection(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createSection.isPending}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add BOQ Item</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAddItem(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Item Ref *</Label><Input name="item_ref" required placeholder="1.1.1" /></div>
              <div className="col-span-2 space-y-2"><Label>Description *</Label><Input name="description" required /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Unit</Label><Input name="unit" defaultValue="nr" /></div>
              <div className="space-y-2"><Label>Quantity</Label><Input name="quantity" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Rate</Label><Input name="rate" type="number" step="0.01" defaultValue="0" /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2"><Label>Labour</Label><Input name="labor_cost" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Material</Label><Input name="material_cost" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Plant</Label><Input name="plant_cost" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Subcontract</Label><Input name="subcontract_cost" type="number" step="0.01" defaultValue="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Markup %</Label><Input name="markup_percent" type="number" step="0.01" defaultValue="0" /></div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" name="is_provisional" id="is_provisional" className="rounded" />
                <Label htmlFor="is_provisional">Provisional Sum</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddItem(false)}>{t('common.cancel')}</Button>
              <Button type="submit">Add Item</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
