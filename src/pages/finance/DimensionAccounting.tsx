import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useDimensions, useDimensionValues } from '@/hooks/useFinanceEnhanced';
import { Plus, Trash2, Layers, ChevronRight } from 'lucide-react';

export default function DimensionAccounting() {
  const { dimensions, isLoading, create, remove } = useDimensions();
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [valOpen, setValOpen] = useState(false);
  const [form, setForm] = useState<any>({ dimension_code: '', dimension_name: '', dimension_name_ar: '', dimension_type: 'cost_center', is_mandatory: false, is_active: true });
  const [valForm, setValForm] = useState<any>({ value_code: '', value_name: '', value_name_ar: '' });
  const { data: values, upsert: upsertVal, remove: removeVal } = useDimensionValues(selected?.id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6" /> Dimension Accounting</h1>
          <p className="text-muted-foreground">Cost centers, projects, regions, segments — configurable analytical dimensions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Dimension</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Dimension</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code *</Label><Input value={form.dimension_code} onChange={e => setForm({ ...form, dimension_code: e.target.value })} /></div>
              <div><Label>Name *</Label><Input value={form.dimension_name} onChange={e => setForm({ ...form, dimension_name: e.target.value })} /></div>
              <div><Label>Name (AR)</Label><Input dir="rtl" value={form.dimension_name_ar} onChange={e => setForm({ ...form, dimension_name_ar: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.dimension_type} onValueChange={v => setForm({ ...form, dimension_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost_center">Cost Center</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                    <SelectItem value="segment">Business Segment</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_mandatory} onCheckedChange={v => setForm({ ...form, is_mandatory: v })} /><Label>Mandatory on JE</Label></div>
            </div>
            <DialogFooter><Button onClick={async () => { await create.mutateAsync(form); setOpen(false); }}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardHeader><CardTitle>Dimensions ({dimensions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
              dimensions.map((d: any) => (
                <button key={d.id} onClick={() => setSelected(d)}
                  className={`w-full flex items-center justify-between p-2 rounded text-left hover:bg-accent ${selected?.id === d.id ? 'bg-accent' : ''}`}>
                  <div>
                    <div className="font-medium text-sm">{d.dimension_code} · {d.dimension_name}</div>
                    <div className="text-xs text-muted-foreground">{d.dimension_type} {d.is_mandatory && '· Mandatory'}</div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Values {selected ? `· ${selected.dimension_name}` : ''}</CardTitle>
            {selected && (
              <Dialog open={valOpen} onOpenChange={setValOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Value</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Value</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Code *</Label><Input value={valForm.value_code} onChange={e => setValForm({ ...valForm, value_code: e.target.value })} /></div>
                    <div><Label>Name *</Label><Input value={valForm.value_name} onChange={e => setValForm({ ...valForm, value_name: e.target.value })} /></div>
                    <div><Label>Name (AR)</Label><Input dir="rtl" value={valForm.value_name_ar} onChange={e => setValForm({ ...valForm, value_name_ar: e.target.value })} /></div>
                  </div>
                  <DialogFooter><Button onClick={async () => { await upsertVal.mutateAsync(valForm); setValOpen(false); setValForm({ value_code: '', value_name: '' }); }}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? <p className="text-sm text-muted-foreground">Select a dimension</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {(values || []).map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono">{v.value_code}</TableCell>
                      <TableCell>{v.value_name} {v.value_name_ar && <span className="text-xs text-muted-foreground"> · {v.value_name_ar}</span>}</TableCell>
                      <TableCell>{v.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => removeVal.mutate(v.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
