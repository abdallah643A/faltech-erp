import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQTO, QTOSheet } from '@/hooks/useQTO';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Ruler, Trash2, Search, FileText, CheckCircle, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function QTOModule() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { sheets, createSheet, deleteSheet, useMeasurements, createMeasurement, deleteMeasurement } = useQTO();
  const [selectedSheet, setSelectedSheet] = useState<QTOSheet | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMeasure, setShowAddMeasure] = useState(false);
  const [search, setSearch] = useState('');

  const measurements = useMeasurements(selectedSheet?.id || null);
  const measData = measurements.data || [];
  const totalQuantity = measData.reduce((s, m) => s + (m.quantity || 0), 0);

  const filteredSheets = (sheets.data || []).filter(s =>
    !search || s.sheet_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.drawing_reference || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateSheet = async (fd: FormData) => {
    await createSheet.mutateAsync({
      sheet_name: fd.get('sheet_name') as string,
      description: fd.get('description') as string,
      drawing_reference: fd.get('drawing_reference') as string,
      measurement_standard: fd.get('measurement_standard') as string || 'NRM',
      created_by: user?.id,
    });
    setShowCreate(false);
  };

  const handleAddMeasurement = async (fd: FormData) => {
    if (!selectedSheet) return;
    await createMeasurement.mutateAsync({
      sheet_id: selectedSheet.id,
      line_num: measData.length + 1,
      description: fd.get('description') as string,
      location: fd.get('location') as string,
      dimension_type: fd.get('dimension_type') as string || 'area',
      nr: Number(fd.get('nr')) || 1,
      length: Number(fd.get('length')) || 0,
      width: Number(fd.get('width')) || 0,
      height: Number(fd.get('height')) || 0,
      unit: fd.get('unit') as string || 'm²',
      notes: fd.get('notes') as string,
      sort_order: measData.length + 1,
    } as any);
    setShowAddMeasure(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quantity Take-Off (QTO)</h1>
          <p className="text-muted-foreground">On-screen measurement linked to BOQ items</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New QTO Sheet</Button>
      </div>

      <Tabs defaultValue={selectedSheet ? 'measurements' : 'sheets'}>
        <TabsList>
          <TabsTrigger value="sheets">QTO Sheets</TabsTrigger>
          <TabsTrigger value="measurements" disabled={!selectedSheet}>Measurements</TabsTrigger>
        </TabsList>

        <TabsContent value="sheets">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sheets..." className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sheet Name</TableHead>
                    <TableHead>Drawing Ref</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Rev</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSheets.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No QTO sheets. Create your first sheet to start measuring.</TableCell></TableRow>
                  ) : filteredSheets.map(sheet => (
                    <TableRow key={sheet.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSheet(sheet)}>
                      <TableCell className="font-medium">{sheet.sheet_name}</TableCell>
                      <TableCell>{sheet.drawing_reference || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{sheet.measurement_standard}</Badge></TableCell>
                      <TableCell>{sheet.revision}</TableCell>
                      <TableCell><Badge className={statusColors[sheet.status]}>{sheet.status}</Badge></TableCell>
                      <TableCell>{format(new Date(sheet.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteSheet.mutate(sheet.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements">
          {selectedSheet && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-primary" />
                    {selectedSheet.sheet_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedSheet.drawing_reference || 'No drawing ref'} · {selectedSheet.measurement_standard} · Rev {selectedSheet.revision}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedSheet(null)}>Back to Sheets</Button>
                  <Button onClick={() => setShowAddMeasure(true)}><Plus className="h-4 w-4 mr-2" />Add Measurement</Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Total Lines</p>
                  <p className="text-2xl font-bold">{measData.length}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">{totalQuantity.toFixed(2)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">BOQ Linked</p>
                  <p className="text-2xl font-bold">{measData.filter(m => m.boq_item_id).length}</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>{t('common.description')}</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>{t('common.type')}</TableHead>
                        <TableHead className="text-right">Nr</TableHead>
                        <TableHead className="text-right">Length</TableHead>
                        <TableHead className="text-right">Width</TableHead>
                        <TableHead className="text-right">Height</TableHead>
                        <TableHead className="text-right font-bold">Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {measData.length === 0 ? (
                        <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No measurements yet.</TableCell></TableRow>
                      ) : measData.map((m, i) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{m.description}</TableCell>
                          <TableCell>{m.location || '-'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.dimension_type}</Badge></TableCell>
                          <TableCell className="text-right">{m.nr}</TableCell>
                          <TableCell className="text-right">{m.length}</TableCell>
                          <TableCell className="text-right">{m.width}</TableCell>
                          <TableCell className="text-right">{m.height}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{m.quantity.toFixed(2)}</TableCell>
                          <TableCell>{m.unit}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteMeasurement.mutate(m.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {measData.length > 0 && (
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={8} className="text-right">{t('common.total')}</TableCell>
                          <TableCell className="text-right text-primary">{totalQuantity.toFixed(2)}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Sheet Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New QTO Sheet</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleCreateSheet(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="space-y-2"><Label>Sheet Name *</Label><Input name="sheet_name" required /></div>
            <div className="space-y-2"><Label>Drawing Reference</Label><Input name="drawing_reference" /></div>
            <div className="space-y-2">
              <Label>Measurement Standard</Label>
              <select name="measurement_standard" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="NRM">NRM (New Rules of Measurement)</option>
                <option value="CESMM4">CESMM4</option>
                <option value="SMM7">SMM7</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-2"><Label>{t('common.description')}</Label><Input name="description" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createSheet.isPending}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Measurement Dialog */}
      <Dialog open={showAddMeasure} onOpenChange={setShowAddMeasure}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Measurement</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAddMeasurement(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="space-y-2"><Label>Description *</Label><Input name="description" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input name="location" placeholder="e.g. Ground Floor" /></div>
              <div className="space-y-2">
                <Label>Dimension Type</Label>
                <select name="dimension_type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="area">Area (L×W)</option>
                  <option value="volume">Volume (L×W×H)</option>
                  <option value="length">Length</option>
                  <option value="count">Count</option>
                  <option value="weight">Weight</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2"><Label>Nr</Label><Input name="nr" type="number" step="0.01" defaultValue="1" /></div>
              <div className="space-y-2"><Label>Length</Label><Input name="length" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Width</Label><Input name="width" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Height</Label><Input name="height" type="number" step="0.01" defaultValue="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Unit</Label><Input name="unit" defaultValue="m²" /></div>
              <div className="space-y-2"><Label>{t('common.notes')}</Label><Input name="notes" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddMeasure(false)}>{t('common.cancel')}</Button>
              <Button type="submit">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
