import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQualityCheckpoints, useQualityInspections } from '@/hooks/useMfgEnhanced';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function QualityCheckpointsPage() {
  const { data: checkpoints = [], create, remove } = useQualityCheckpoints();
  const { data: inspections = [], create: createInspection } = useQualityInspections();
  const [form, setForm] = useState<any>({ checkpoint_code: '', checkpoint_name: '', checkpoint_name_ar: '', operation_seq: 10, inspection_type: 'in_process', measurement_type: 'attribute', spec_min: null, spec_max: null, spec_target: null, uom: '', is_mandatory: true, sample_size: 1 });
  const [insForm, setInsForm] = useState<any>({ checkpoint_id: '', wo_number: '', measured_value: 0, pass_fail: 'pass', defect_code: '', notes: '' });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold">Quality Checkpoints in Production</h1>
        <p className="text-xs text-blue-100">In-process inspections embedded in routings</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">New Checkpoint</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Code</Label><Input value={form.checkpoint_code} onChange={(e) => setForm({ ...form, checkpoint_code: e.target.value })} className="h-8" /></div>
              <div><Label className="text-xs">Op Seq</Label><Input type="number" value={form.operation_seq} onChange={(e) => setForm({ ...form, operation_seq: parseInt(e.target.value) })} className="h-8" /></div>
            </div>
            <div><Label className="text-xs">Name (EN)</Label><Input value={form.checkpoint_name} onChange={(e) => setForm({ ...form, checkpoint_name: e.target.value })} className="h-8" /></div>
            <div><Label className="text-xs">الاسم (AR)</Label><Input dir="rtl" value={form.checkpoint_name_ar} onChange={(e) => setForm({ ...form, checkpoint_name_ar: e.target.value })} className="h-8" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Type</Label>
                <Select value={form.inspection_type} onValueChange={(v) => setForm({ ...form, inspection_type: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In-Process</SelectItem><SelectItem value="final">Final</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Measurement</Label>
                <Select value={form.measurement_type} onValueChange={(v) => setForm({ ...form, measurement_type: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="attribute">Attribute (Pass/Fail)</SelectItem><SelectItem value="variable">Variable (Numeric)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.measurement_type === 'variable' && (
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Min</Label><Input type="number" value={form.spec_min || ''} onChange={(e) => setForm({ ...form, spec_min: parseFloat(e.target.value) })} className="h-8" /></div>
                <div><Label className="text-xs">Target</Label><Input type="number" value={form.spec_target || ''} onChange={(e) => setForm({ ...form, spec_target: parseFloat(e.target.value) })} className="h-8" /></div>
                <div><Label className="text-xs">Max</Label><Input type="number" value={form.spec_max || ''} onChange={(e) => setForm({ ...form, spec_max: parseFloat(e.target.value) })} className="h-8" /></div>
              </div>
            )}
            <div className="flex items-center gap-2"><Switch checked={form.is_mandatory} onCheckedChange={(v) => setForm({ ...form, is_mandatory: v })} /><Label className="text-xs">Mandatory</Label></div>
            <Button size="sm" className="w-full" onClick={() => create.mutate(form)}>Save</Button>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader><CardTitle className="text-sm">Checkpoints ({checkpoints.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">Op</th><th className="p-2 text-left">Code</th><th className="p-2 text-left">Name</th>
                <th className="p-2 text-center">Type</th><th className="p-2 text-left">Spec</th><th className="p-2 text-center">Mand</th><th className="p-2"></th>
              </tr></thead>
              <tbody>
                {checkpoints.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No checkpoints</td></tr>}
                {checkpoints.map((c: any) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-2">{c.operation_seq}</td>
                    <td className="p-2 font-mono text-xs">{c.checkpoint_code}</td>
                    <td className="p-2 text-xs">{c.checkpoint_name}</td>
                    <td className="p-2 text-center"><Badge variant="outline">{c.inspection_type}</Badge></td>
                    <td className="p-2 text-xs">{c.measurement_type === 'variable' ? `${c.spec_min ?? '-'} / ${c.spec_target ?? '-'} / ${c.spec_max ?? '-'}` : 'Pass/Fail'}</td>
                    <td className="p-2 text-center">{c.is_mandatory ? '✓' : '—'}</td>
                    <td className="p-2"><Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Inspections ({inspections.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 mb-3 p-2 bg-muted rounded">
            <Select value={insForm.checkpoint_id} onValueChange={(v) => setInsForm({ ...insForm, checkpoint_id: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Checkpoint" /></SelectTrigger>
              <SelectContent>{checkpoints.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.checkpoint_code}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="WO #" value={insForm.wo_number} onChange={(e) => setInsForm({ ...insForm, wo_number: e.target.value })} className="h-8" />
            <Input type="number" placeholder="Value" value={insForm.measured_value} onChange={(e) => setInsForm({ ...insForm, measured_value: parseFloat(e.target.value) })} className="h-8" />
            <Select value={insForm.pass_fail} onValueChange={(v) => setInsForm({ ...insForm, pass_fail: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem><SelectItem value="conditional">Conditional</SelectItem></SelectContent>
            </Select>
            <Input placeholder="Defect" value={insForm.defect_code} onChange={(e) => setInsForm({ ...insForm, defect_code: e.target.value })} className="h-8" />
            <Button size="sm" onClick={() => createInspection.mutate(insForm)}>+ Record</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-2 text-left">Date</th><th className="p-2 text-left">WO</th><th className="p-2 text-right">Value</th>
              <th className="p-2 text-center">Result</th><th className="p-2 text-left">Defect</th>
            </tr></thead>
            <tbody>
              {inspections.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No inspections</td></tr>}
              {inspections.map((i: any) => (
                <tr key={i.id} className="border-b">
                  <td className="p-2 text-xs">{format(new Date(i.inspected_at), 'MMM d HH:mm')}</td>
                  <td className="p-2">{i.wo_number}</td>
                  <td className="p-2 text-right">{i.measured_value ?? '—'}</td>
                  <td className="p-2 text-center"><Badge className={i.pass_fail === 'pass' ? 'bg-green-100 text-green-800' : i.pass_fail === 'fail' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>{i.pass_fail}</Badge></td>
                  <td className="p-2 text-xs">{i.defect_code || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
