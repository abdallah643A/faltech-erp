import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Plus, AlertTriangle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { useComplianceItems, useComplianceActions } from '@/hooks/useSupplierPortalEnhanced';

export default function SupplierComplianceTracker() {
  const { data: items = [] } = useComplianceItems();
  const { upsert } = useComplianceActions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ item_type: 'cert', item_name: '', expiry_date: '', reminder_days_before: 30 });

  const today = new Date();
  const expiringSoon = items.filter((i: any) => i.expiry_date && differenceInDays(new Date(i.expiry_date), today) <= (i.reminder_days_before || 30) && differenceInDays(new Date(i.expiry_date), today) >= 0);
  const expired = items.filter((i: any) => i.expiry_date && new Date(i.expiry_date) < today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supplier Compliance Tracker</h2>
          <p className="text-sm text-muted-foreground">Certifications, insurance, licenses with renewal reminders</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expiring Soon</p><p className="text-2xl font-bold text-yellow-500">{expiringSoon.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expired</p><p className="text-2xl font-bold text-red-500">{expired.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead>Expiry</TableHead><TableHead>Days Left</TableHead><TableHead>Status</TableHead><TableHead>Reminder</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No compliance items</TableCell></TableRow> :
                items.map((i: any) => {
                  const days = i.expiry_date ? differenceInDays(new Date(i.expiry_date), today) : null;
                  const exp = days !== null && days < 0;
                  const soon = days !== null && days >= 0 && days <= (i.reminder_days_before || 30);
                  return (
                    <TableRow key={i.id}>
                      <TableCell><Badge variant="outline">{i.item_type}</Badge></TableCell>
                      <TableCell className="font-medium">{i.item_name}</TableCell>
                      <TableCell>{i.expiry_date ? format(new Date(i.expiry_date), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell className={exp ? 'text-red-500 font-medium' : soon ? 'text-yellow-500 font-medium' : ''}>{days !== null ? `${days}d` : '-'}</TableCell>
                      <TableCell>
                        {exp ? <Badge className="bg-red-500/10 text-red-500"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge> :
                          soon ? <Badge className="bg-yellow-500/10 text-yellow-500"><CalendarClock className="h-3 w-3 mr-1" />Renew</Badge> :
                            <Badge variant="outline">Active</Badge>}
                      </TableCell>
                      <TableCell>{i.reminder_days_before}d before</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Type</Label>
              <Select value={form.item_type} onValueChange={v => setForm((p: any) => ({ ...p, item_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cert">Certification</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="tax">Tax Cert</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="iso">ISO</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Item Name</Label><Input value={form.item_name} onChange={e => setForm((p: any) => ({ ...p, item_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm((p: any) => ({ ...p, expiry_date: e.target.value }))} /></div>
              <div><Label>Reminder (days before)</Label><Input type="number" value={form.reminder_days_before} onChange={e => setForm((p: any) => ({ ...p, reminder_days_before: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(form); setOpen(false); setForm({ item_type: 'cert', item_name: '', expiry_date: '', reminder_days_before: 30 }); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
