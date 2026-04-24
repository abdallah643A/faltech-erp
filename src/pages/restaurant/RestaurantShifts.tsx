import { useState } from 'react';
import { useRestaurantShifts, useRestaurantBranches } from '@/hooks/useRestaurantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clock, DollarSign, Play, Square } from 'lucide-react';

export default function RestaurantShifts() {
  const { data: branches } = useRestaurantBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const { data: shifts } = useRestaurantShifts(selectedBranch || undefined);
  const { openShift, closeShift } = useRestaurantShifts(selectedBranch || undefined);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState<any>(null);
  const [openForm, setOpenForm] = useState({ cashier_name: '', terminal_name: '', opening_cash: '' });
  const [closingCash, setClosingCash] = useState('');

  const activeShift = (shifts || []).find((s: any) => s.status === 'open');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shift Management</h1>
          <p className="text-sm text-muted-foreground">Open/close shifts, cash reconciliation, and session history</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select Branch" /></SelectTrigger>
            <SelectContent>{(branches || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
          </Select>
          {!activeShift && <Button onClick={() => setShowOpen(true)} className="gap-1"><Play className="h-4 w-4" /> Open Shift</Button>}
        </div>
      </div>

      {activeShift && (
        <Card className="border-2 border-green-400 bg-green-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"><Clock className="h-5 w-5 text-green-700" /></div>
              <div>
                <p className="font-bold text-sm">Active Shift — {activeShift.cashier_name}</p>
                <p className="text-xs text-muted-foreground">Opened: {new Date(activeShift.opened_at).toLocaleTimeString()} • Terminal: {activeShift.terminal_name || 'Main'} • Opening: SAR {Number(activeShift.opening_cash).toFixed(2)}</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => setShowClose(activeShift)}><Square className="h-3.5 w-3.5" /> Close Shift</Button>
          </CardContent>
        </Card>
      )}

      <Card className="border">
        <CardHeader><CardTitle className="text-sm">Shift History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left py-2 px-3">Cashier</th>
              <th className="text-left py-2 px-3">Terminal</th>
              <th className="text-right py-2 px-3">Opening</th>
              <th className="text-right py-2 px-3">Closing</th>
              <th className="text-right py-2 px-3">Sales</th>
              <th className="text-right py-2 px-3">Over/Short</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-left py-2 px-3">Opened</th>
            </tr></thead>
            <tbody>
              {(shifts || []).map((s: any) => (
                <tr key={s.id} className="border-b">
                  <td className="py-2 px-3">{s.cashier_name}</td>
                  <td className="py-2 px-3 text-xs">{s.terminal_name || '-'}</td>
                  <td className="py-2 px-3 text-right">{Number(s.opening_cash || 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">{s.closing_cash != null ? Number(s.closing_cash).toFixed(2) : '-'}</td>
                  <td className="py-2 px-3 text-right font-bold">{Number(s.total_sales || 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">
                    {s.over_short != null ? <span className={Number(s.over_short) < 0 ? 'text-red-600' : 'text-green-600'}>{Number(s.over_short).toFixed(2)}</span> : '-'}
                  </td>
                  <td className="py-2 px-3"><Badge variant={s.status === 'open' ? 'default' : 'secondary'} className="text-xs">{s.status}</Badge></td>
                  <td className="py-2 px-3 text-xs">{new Date(s.opened_at).toLocaleString()}</td>
                </tr>
              ))}
              {!(shifts || []).length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">No shift history</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Open Shift Dialog */}
      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Open New Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cashier Name</Label><Input value={openForm.cashier_name} onChange={e => setOpenForm({ ...openForm, cashier_name: e.target.value })} /></div>
            <div><Label>Terminal</Label><Input value={openForm.terminal_name} onChange={e => setOpenForm({ ...openForm, terminal_name: e.target.value })} placeholder="e.g. Terminal 1" /></div>
            <div><Label>Opening Cash (SAR)</Label><Input type="number" value={openForm.opening_cash} onChange={e => setOpenForm({ ...openForm, opening_cash: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              openShift.mutate({ branch_id: selectedBranch, cashier_name: openForm.cashier_name, terminal_name: openForm.terminal_name, opening_cash: parseFloat(openForm.opening_cash) || 0 });
              setShowOpen(false);
              setOpenForm({ cashier_name: '', terminal_name: '', opening_cash: '' });
            }}>Open Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={!!showClose} onOpenChange={() => setShowClose(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Close Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Cashier: <strong>{showClose?.cashier_name}</strong></p>
            <p className="text-sm">Opening Cash: <strong>SAR {Number(showClose?.opening_cash || 0).toFixed(2)}</strong></p>
            <div><Label>Closing Cash Count (SAR)</Label><Input type="number" value={closingCash} onChange={e => setClosingCash(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClose(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              const cc = parseFloat(closingCash) || 0;
              closeShift.mutate({ id: showClose.id, closing_cash: cc, over_short: cc - Number(showClose.opening_cash || 0) });
              setShowClose(null);
              setClosingCash('');
            }}>Close Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
