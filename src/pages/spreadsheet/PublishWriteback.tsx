import { useState } from 'react';
import { useWorkbooks, useWritebacks } from '@/hooks/useSpreadsheetStudio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, CheckCircle, XCircle, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const TARGET_MODULES = [
  { value: 'budget', label: 'Budget Planning' },
  { value: 'forecast', label: 'Sales Forecast' },
  { value: 'manpower', label: 'Manpower Plan' },
  { value: 'procurement', label: 'Procurement Plan' },
  { value: 'cashflow', label: 'Cash Flow Plan' },
];

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-yellow-500/10 text-yellow-700', icon: Clock },
  approved: { color: 'bg-green-500/10 text-green-700', icon: CheckCircle },
  rejected: { color: 'bg-destructive/10 text-destructive', icon: XCircle },
  executed: { color: 'bg-blue-500/10 text-blue-700', icon: ShieldCheck },
};

export default function PublishWriteback() {
  const { data: workbooks = [] } = useWorkbooks();
  const { data: writebacks = [], submit, approve, reject } = useWritebacks();
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState({ workbook_id: '', target_module: 'budget', changes: '' });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleSubmit = () => {
    if (!form.workbook_id || !form.target_module) return;
    submit.mutate({
      workbook_id: form.workbook_id,
      target_module: form.target_module,
      changes: [{ description: form.changes || 'Writeback from spreadsheet' }],
    }, { onSuccess: () => { setShowSubmit(false); setForm({ workbook_id: '', target_module: 'budget', changes: '' }); } });
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    reject.mutate({ id: rejectId, reason: rejectReason }, { onSuccess: () => { setRejectId(null); setRejectReason(''); } });
  };

  const stats = {
    pending: writebacks.filter(w => w.status === 'pending').length,
    approved: writebacks.filter(w => w.status === 'approved').length,
    rejected: writebacks.filter(w => w.status === 'rejected').length,
    executed: writebacks.filter(w => w.status === 'executed').length,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Upload className="h-6 w-6" />Publish & Writeback</h1>
          <p className="text-muted-foreground">Submit spreadsheet data to update ERP planning records with approval</p>
        </div>
        <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
          <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-2" />Submit Writeback</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Writeback Request</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Workbook</Label>
                <Select value={form.workbook_id} onValueChange={v => setForm(p => ({ ...p, workbook_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select workbook" /></SelectTrigger>
                  <SelectContent>{workbooks.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Target Module</Label>
                <Select value={form.target_module} onValueChange={v => setForm(p => ({ ...p, target_module: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TARGET_MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Change Description</Label><Textarea value={form.changes} onChange={e => setForm(p => ({ ...p, changes: e.target.value }))} placeholder="Describe the changes being written back" /></div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Writeback will only update ERP data after manager approval. All changes are audited.</p>
              </div>
              <Button onClick={handleSubmit} disabled={submit.isPending} className="w-full">Submit for Approval</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats).map(([key, val]) => {
          const cfg = STATUS_CONFIG[key];
          const Icon = cfg?.icon || Clock;
          return (
            <Card key={key}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="h-8 w-8 text-primary" />
                <div><p className="text-2xl font-bold">{val}</p><p className="text-xs text-muted-foreground capitalize">{key}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Writeback Requests</CardTitle></CardHeader>
        <CardContent>
          {writebacks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No writeback requests yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Workbook</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {writebacks.map(wb => {
                  const cfg = STATUS_CONFIG[wb.status] || STATUS_CONFIG.pending;
                  const wbName = workbooks.find(w => w.id === wb.workbook_id)?.name || 'Unknown';
                  return (
                    <TableRow key={wb.id}>
                      <TableCell className="text-sm">{format(new Date(wb.created_at), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell className="font-medium">{wbName}</TableCell>
                      <TableCell>{TARGET_MODULES.find(m => m.value === wb.target_module)?.label || wb.target_module}</TableCell>
                      <TableCell className="text-sm">{wb.submitted_by_name}</TableCell>
                      <TableCell><Badge className={cfg.color}>{wb.status}</Badge></TableCell>
                      <TableCell>
                        {wb.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-green-600" onClick={() => approve.mutate(wb.id)}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={() => setRejectId(wb.id)}>Reject</Button>
                          </div>
                        )}
                        {wb.status === 'rejected' && wb.rejected_reason && (
                          <span className="text-xs text-destructive">{wb.rejected_reason}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Writeback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
            <Button onClick={handleReject} variant="destructive" className="w-full">Reject</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
