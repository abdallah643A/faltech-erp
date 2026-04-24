import { useState } from 'react';
import { useCashierShifts } from '@/hooks/useCashierShifts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Clock, DollarSign, CheckCircle2, AlertTriangle, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function POSSessions() {
  const { shifts, isLoading, openShift, closeShift, approveShift } = useCashierShifts();
  const { toast } = useToast();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [openForm, setOpenForm] = useState({ cashier_name: '', opening_float: '' });
  const [closeForm, setCloseForm] = useState({ actual_cash: '', actual_card: '', actual_digital_wallet: '0', actual_bank_transfer: '0', variance_notes: '' });

  const handleOpen = async () => {
    await openShift.mutateAsync({ cashier_name: openForm.cashier_name, opening_float: Number(openForm.opening_float || 0) });
    setShowOpen(false);
    setOpenForm({ cashier_name: '', opening_float: '' });
  };

  const handleClose = async () => {
    if (!selectedShift) return;
    await closeShift.mutateAsync({
      shift_id: selectedShift.id,
      actual_cash: Number(closeForm.actual_cash || 0),
      actual_card: Number(closeForm.actual_card || 0),
      actual_digital_wallet: Number(closeForm.actual_digital_wallet || 0),
      actual_bank_transfer: Number(closeForm.actual_bank_transfer || 0),
      variance_notes: closeForm.variance_notes,
    });
    setShowClose(false);
    setSelectedShift(null);
  };

  const openShifts = (shifts || []).filter((s: any) => s.status === 'open');
  const closedShifts = (shifts || []).filter((s: any) => s.status !== 'open');

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-blue-100 text-blue-800';
      case 'reconciled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shift Management</h1>
          <p className="text-sm text-muted-foreground">Open, close, and reconcile cashier shifts</p>
        </div>
        <Button onClick={() => setShowOpen(true)} className="gap-2"><Play className="h-4 w-4" /> Open Shift</Button>
      </div>

      {/* Active Shifts */}
      {openShifts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Shifts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {openShifts.map((s: any) => (
              <Card key={s.id} className="border-green-200 bg-green-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold">{s.shift_number}</span>
                    <Badge className={statusColor(s.status)}>{s.status}</Badge>
                  </div>
                  <p className="text-sm font-medium">{s.cashier_name}</p>
                  <p className="text-xs text-muted-foreground">Opened: {new Date(s.opened_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Float: SAR {Number(s.opening_float || 0).toFixed(2)}</p>
                  <Button variant="destructive" size="sm" className="w-full mt-3 gap-1" onClick={() => { setSelectedShift(s); setShowClose(true); }}>
                    <Square className="h-3 w-3" /> Close Shift
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Shift History */}
      <Card className="border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Shift History</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-2">Shift #</th>
                <th className="text-left py-2 px-2">Cashier</th>
                <th className="text-left py-2 px-2">Opened</th>
                <th className="text-left py-2 px-2">Closed</th>
                <th className="text-right py-2 px-2">Expected</th>
                <th className="text-right py-2 px-2">Actual</th>
                <th className="text-right py-2 px-2">Variance</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-left py-2 px-2">Actions</th>
              </tr></thead>
              <tbody>
                {closedShifts.map((s: any) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 px-2 font-mono text-xs">{s.shift_number}</td>
                    <td className="py-2 px-2">{s.cashier_name}</td>
                    <td className="py-2 px-2 text-xs">{new Date(s.opened_at).toLocaleString()}</td>
                    <td className="py-2 px-2 text-xs">{s.closed_at ? new Date(s.closed_at).toLocaleString() : '-'}</td>
                    <td className="py-2 px-2 text-right">{Number(s.expected_total || 0).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right">{Number(s.actual_total || 0).toFixed(2)}</td>
                    <td className={`py-2 px-2 text-right font-medium ${Number(s.total_variance || 0) < 0 ? 'text-red-600' : Number(s.total_variance || 0) > 0 ? 'text-green-600' : ''}`}>
                      {Number(s.total_variance || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-2"><Badge className={statusColor(s.status)} variant="outline">{s.status}</Badge></td>
                    <td className="py-2 px-2">
                      {s.status === 'closed' && !s.manager_approved && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => approveShift.mutate({ shift_id: s.id })}>Approve</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Open Shift Dialog */}
      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open New Shift</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Cashier Name</Label><Input value={openForm.cashier_name} onChange={e => setOpenForm(p => ({ ...p, cashier_name: e.target.value }))} placeholder="Enter name" /></div>
            <div><Label>Opening Float (SAR)</Label><Input type="number" value={openForm.opening_float} onChange={e => setOpenForm(p => ({ ...p, opening_float: e.target.value }))} placeholder="0.00" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpen(false)}>Cancel</Button>
            <Button onClick={handleOpen} disabled={!openForm.cashier_name}>Open Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Close Shift: {selectedShift?.shift_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Actual Cash</Label><Input type="number" value={closeForm.actual_cash} onChange={e => setCloseForm(p => ({ ...p, actual_cash: e.target.value }))} /></div>
              <div><Label>Actual Card</Label><Input type="number" value={closeForm.actual_card} onChange={e => setCloseForm(p => ({ ...p, actual_card: e.target.value }))} /></div>
              <div><Label>Digital Wallet</Label><Input type="number" value={closeForm.actual_digital_wallet} onChange={e => setCloseForm(p => ({ ...p, actual_digital_wallet: e.target.value }))} /></div>
              <div><Label>Bank Transfer</Label><Input type="number" value={closeForm.actual_bank_transfer} onChange={e => setCloseForm(p => ({ ...p, actual_bank_transfer: e.target.value }))} /></div>
            </div>
            <div><Label>Variance Notes</Label><Input value={closeForm.variance_notes} onChange={e => setCloseForm(p => ({ ...p, variance_notes: e.target.value }))} placeholder="Optional notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClose(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClose}>Close Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
