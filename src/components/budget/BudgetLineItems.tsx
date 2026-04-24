import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { type ColumnDef } from '@/utils/exportImportUtils';
import { BudgetVersionLine, useBudgetVersionLines } from '@/hooks/useBudgetMasters';
import { formatSAR } from '@/lib/currency';

const CATEGORIES = ['Labor', 'Materials', 'Equipment', 'Subcontractors', 'Overhead', 'Contingency', 'Professional Services', 'Travel', 'Utilities', 'Other'];
const ALLOCATION_METHODS = [
  { value: 'even', label: 'Even Distribution' },
  { value: 'manual', label: 'Manual Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'milestone', label: 'Milestone-Based' },
  { value: 'front_loaded', label: 'Front-Loaded' },
  { value: 'back_loaded', label: 'Back-Loaded' },
];

interface Props {
  versionId: string;
  isEditable: boolean;
}

const emptyLine = {
  budget_category: '',
  account_code: '',
  account_name: '',
  cost_element: '',
  cost_center_code: '',
  department: '',
  branch: '',
  project_code: '',
  phase: '',
  work_package: '',
  activity: '',
  vendor_name: '',
  description: '',
  uom: '',
  quantity: 0,
  unit_rate: 0,
  original_amount: 0,
  revised_amount: 0,
  allocation_method: 'even',
  remarks: '',
};

export function BudgetLineItems({ versionId, isEditable }: Props) {
  const { data: lines = [], upsert, remove } = useBudgetVersionLines(versionId);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyLine });

  const openNew = () => {
    const nextNum = lines.length + 1;
    setForm({ ...emptyLine, line_num: nextNum, version_id: versionId });
    setEditId(null);
    setDialog(true);
  };

  const openEdit = (line: BudgetVersionLine) => {
    setForm({ ...line });
    setEditId(line.id);
    setDialog(true);
  };

  const handleSave = () => {
    const amount = (form.quantity && form.unit_rate) ? form.quantity * form.unit_rate : form.original_amount;
    const revised = form.revised_amount || amount;
    const available = revised - (form.committed_amount || 0) - (form.actual_amount || 0);
    const variance = (form.actual_amount || 0) - revised;
    const variancePct = revised ? ((variance / revised) * 100) : 0;

    const payload: any = {
      ...form,
      version_id: versionId,
      original_amount: amount,
      revised_amount: revised,
      available_amount: available,
      variance_amount: variance,
      variance_percent: Math.round(variancePct * 100) / 100,
    };
    if (editId) payload.id = editId;
    upsert.mutate(payload);
    setDialog(false);
  };

  const totals = lines.reduce((acc, l) => ({
    original: acc.original + Number(l.original_amount || 0),
    revised: acc.revised + Number(l.revised_amount || 0),
    committed: acc.committed + Number(l.committed_amount || 0),
    actual: acc.actual + Number(l.actual_amount || 0),
    forecast: acc.forecast + Number(l.forecast_amount || 0),
    available: acc.available + Number(l.available_amount || 0),
  }), { original: 0, revised: 0, committed: 0, actual: 0, forecast: 0, available: 0 });

  const getVarianceColor = (line: BudgetVersionLine) => {
    const utilization = Number(line.revised_amount) > 0
      ? ((Number(line.actual_amount) + Number(line.committed_amount)) / Number(line.revised_amount)) * 100
      : 0;
    if (utilization > 100) return 'text-destructive';
    if (utilization > 80) return 'text-amber-600';
    return 'text-green-600';
  };

  const exportColumns: ColumnDef[] = [
    { header: '#', key: 'line_num' },
    { header: 'Category', key: 'budget_category' },
    { header: 'Account Code', key: 'account_code' },
    { header: 'Account Name', key: 'account_name' },
    { header: 'Description', key: 'description' },
    { header: 'Cost Center', key: 'cost_center_code' },
    { header: 'Department', key: 'department' },
    { header: 'Branch', key: 'branch' },
    { header: 'Project', key: 'project_code' },
    { header: 'Phase', key: 'phase' },
    { header: 'WBS', key: 'work_package' },
    { header: 'UOM', key: 'uom' },
    { header: 'Qty', key: 'quantity' },
    { header: 'Rate', key: 'unit_rate' },
    { header: 'Original', key: 'original_amount' },
    { header: 'Revised', key: 'revised_amount' },
    { header: 'Committed', key: 'committed_amount' },
    { header: 'Actual', key: 'actual_amount' },
    { header: 'Forecast', key: 'forecast_amount' },
    { header: 'Available', key: 'available_amount' },
    { header: 'Variance', key: 'variance_amount' },
    { header: 'Variance %', key: 'variance_percent' },
    { header: 'Allocation', key: 'allocation_method' },
    { header: 'Remarks', key: 'remarks' },
  ];

  const handleImport = async (rows: any[]) => {
    for (const row of rows) {
      const qty = Number(row['Qty'] || row.quantity || 0);
      const rate = Number(row['Rate'] || row.unit_rate || 0);
      const original = (qty && rate) ? qty * rate : Number(row['Original'] || row.original_amount || 0);
      const revised = Number(row['Revised'] || row.revised_amount || 0) || original;
      const committed = Number(row['Committed'] || row.committed_amount || 0);
      const actual = Number(row['Actual'] || row.actual_amount || 0);
      const available = revised - committed - actual;
      const variance = actual - revised;
      const variancePct = revised ? Math.round((variance / revised) * 10000) / 100 : 0;

      await upsert.mutateAsync({
        version_id: versionId,
        line_num: Number(row['#'] || row.line_num || lines.length + 1),
        budget_category: row['Category'] || row.budget_category || '',
        account_code: row['Account Code'] || row.account_code || '',
        account_name: row['Account Name'] || row.account_name || '',
        description: row['Description'] || row.description || '',
        cost_center_code: row['Cost Center'] || row.cost_center_code || '',
        department: row['Department'] || row.department || '',
        branch: row['Branch'] || row.branch || '',
        project_code: row['Project'] || row.project_code || '',
        phase: row['Phase'] || row.phase || '',
        work_package: row['WBS'] || row.work_package || '',
        uom: row['UOM'] || row.uom || '',
        quantity: qty,
        unit_rate: rate,
        original_amount: original,
        revised_amount: revised,
        committed_amount: committed,
        actual_amount: actual,
        forecast_amount: Number(row['Forecast'] || row.forecast_amount || 0),
        available_amount: available,
        variance_amount: variance,
        variance_percent: variancePct,
        allocation_method: row['Allocation'] || row.allocation_method || 'even',
        remarks: row['Remarks'] || row.remarks || '',
      } as any);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Budget Lines ({lines.length})</CardTitle>
          <div className="flex items-center gap-2">
            <ExportImportButtons
              data={lines}
              columns={exportColumns}
              filename="budget_lines"
              title="Budget Lines"
              onImport={isEditable ? handleImport : undefined}
            />
            {isEditable && (
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Line</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 w-10">#</TableHead>
                <TableHead className="sticky left-[40px] bg-background z-10 min-w-[80px]">Category</TableHead>
                <TableHead className="min-w-[80px]">Account</TableHead>
                <TableHead className="min-w-[120px]">Description</TableHead>
                <TableHead className="min-w-[80px]">Cost Center</TableHead>
                <TableHead className="min-w-[80px]">Project</TableHead>
                <TableHead className="min-w-[60px]">WBS</TableHead>
                <TableHead className="text-right min-w-[100px]">Qty</TableHead>
                <TableHead className="text-right min-w-[100px]">Rate</TableHead>
                <TableHead className="text-right min-w-[110px]">Original</TableHead>
                <TableHead className="text-right min-w-[110px]">Revised</TableHead>
                <TableHead className="text-right min-w-[110px]">Committed</TableHead>
                <TableHead className="text-right min-w-[110px]">Actual</TableHead>
                <TableHead className="text-right min-w-[110px]">Available</TableHead>
                <TableHead className="text-right min-w-[80px]">Var %</TableHead>
                {isEditable && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="sticky left-0 bg-background font-mono text-xs">{l.line_num}</TableCell>
                  <TableCell className="sticky left-[40px] bg-background text-xs">
                    <Badge variant="outline" className="text-[10px]">{l.budget_category || '—'}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.account_code || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{l.description || l.account_name || '—'}</TableCell>
                  <TableCell className="text-xs">{l.cost_center_code || '—'}</TableCell>
                  <TableCell className="text-xs">{l.project_code || '—'}</TableCell>
                  <TableCell className="text-xs">{l.work_package || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{Number(l.quantity) || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{Number(l.unit_rate) ? formatSAR(l.unit_rate) : '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatSAR(l.original_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-medium">{formatSAR(l.revised_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatSAR(l.committed_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatSAR(l.actual_amount)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs font-medium ${getVarianceColor(l)}`}>{formatSAR(l.available_amount)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs ${Number(l.variance_percent) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {Number(l.variance_percent).toFixed(1)}%
                  </TableCell>
                  {isEditable && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(l)}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove.mutate(l.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {lines.length === 0 && (
                <TableRow><TableCell colSpan={16} className="text-center py-8 text-muted-foreground">No budget lines. Click "Add Line" to start.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Sticky totals */}
        {lines.length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2 flex items-center gap-6 text-xs font-medium overflow-auto">
            <span>Original: <span className="font-mono">{formatSAR(totals.original)}</span></span>
            <span>Revised: <span className="font-mono">{formatSAR(totals.revised)}</span></span>
            <span>Committed: <span className="font-mono">{formatSAR(totals.committed)}</span></span>
            <span>Actual: <span className="font-mono">{formatSAR(totals.actual)}</span></span>
            <span className={totals.available < 0 ? 'text-destructive' : 'text-green-600'}>
              Available: <span className="font-mono">{formatSAR(totals.available)}</span>
            </span>
          </div>
        )}
      </CardContent>

      {/* Line Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Budget Line</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.budget_category || ''} onValueChange={v => setForm((f: any) => ({ ...f, budget_category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account Code</Label>
                <Input value={form.account_code || ''} onChange={e => setForm((f: any) => ({ ...f, account_code: e.target.value }))} />
              </div>
              <div>
                <Label>Account Name</Label>
                <Input value={form.account_name || ''} onChange={e => setForm((f: any) => ({ ...f, account_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Cost Center</Label>
                <Input value={form.cost_center_code || ''} onChange={e => setForm((f: any) => ({ ...f, cost_center_code: e.target.value }))} />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={form.department || ''} onChange={e => setForm((f: any) => ({ ...f, department: e.target.value }))} />
              </div>
              <div>
                <Label>Branch</Label>
                <Input value={form.branch || ''} onChange={e => setForm((f: any) => ({ ...f, branch: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Project Code</Label>
                <Input value={form.project_code || ''} onChange={e => setForm((f: any) => ({ ...f, project_code: e.target.value }))} />
              </div>
              <div>
                <Label>Phase / Stage</Label>
                <Input value={form.phase || ''} onChange={e => setForm((f: any) => ({ ...f, phase: e.target.value }))} />
              </div>
              <div>
                <Label>Work Package / WBS</Label>
                <Input value={form.work_package || ''} onChange={e => setForm((f: any) => ({ ...f, work_package: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Description</Label>
                <Input value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <Label>Vendor / Subcontractor</Label>
                <Input value={form.vendor_name || ''} onChange={e => setForm((f: any) => ({ ...f, vendor_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>UOM</Label>
                <Input value={form.uom || ''} onChange={e => setForm((f: any) => ({ ...f, uom: e.target.value }))} placeholder="e.g., m², hr" />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity || ''} onChange={e => setForm((f: any) => ({ ...f, quantity: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Unit Rate</Label>
                <Input type="number" value={form.unit_rate || ''} onChange={e => setForm((f: any) => ({ ...f, unit_rate: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Original Amount</Label>
                <Input type="number" value={form.original_amount || (form.quantity * form.unit_rate) || ''} onChange={e => setForm((f: any) => ({ ...f, original_amount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Revised Amount</Label>
                <Input type="number" value={form.revised_amount || ''} onChange={e => setForm((f: any) => ({ ...f, revised_amount: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Allocation Method</Label>
                <Select value={form.allocation_method || 'even'} onValueChange={v => setForm((f: any) => ({ ...f, allocation_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALLOCATION_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forecast Amount</Label>
                <Input type="number" value={form.forecast_amount || ''} onChange={e => setForm((f: any) => ({ ...f, forecast_amount: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea value={form.remarks || ''} onChange={e => setForm((f: any) => ({ ...f, remarks: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" />Save Line</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
