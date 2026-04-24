import { useState } from 'react';
import { useRestaurantReservations, useRestaurantBranches } from '@/hooks/useRestaurantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarDays, Plus, Users, Clock, Phone } from 'lucide-react';

const statusColors: Record<string, string> = { confirmed: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', cancelled: 'bg-red-100 text-red-800', seated: 'bg-blue-100 text-blue-800', completed: 'bg-gray-100 text-gray-800', no_show: 'bg-red-100 text-red-800' };

export default function RestaurantReservations() {
  const { data: branches } = useRestaurantBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const { data: reservations } = useRestaurantReservations(selectedBranch || undefined);
  const { create, updateStatus } = useRestaurantReservations(selectedBranch || undefined);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', party_size: '2', reservation_date: '', reservation_time: '', special_requests: '' });

  const today = new Date().toISOString().split('T')[0];
  const upcoming = (reservations || []).filter((r: any) => r.reservation_date >= today && r.status !== 'cancelled');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservations</h1>
          <p className="text-sm text-muted-foreground">Booking management, waitlist, and seating</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select Branch" /></SelectTrigger>
            <SelectContent>{(branches || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Reservation</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {upcoming.map((r: any) => (
          <Card key={r.id} className="border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">{r.customer_name}</h3>
                <Badge className={`${statusColors[r.status] || ''} text-xs`}>{r.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{r.reservation_date}</div>
                <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.reservation_time}</div>
                <div className="flex items-center gap-1"><Users className="h-3 w-3" />{r.party_size} guests</div>
                {r.customer_phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.customer_phone}</div>}
              </div>
              {r.special_requests && <p className="text-xs italic text-muted-foreground">"{r.special_requests}"</p>}
              {r.rest_tables?.table_number && <Badge variant="outline" className="text-[10px]">Table {r.rest_tables.table_number}</Badge>}
              <div className="flex gap-1 pt-1">
                {r.status === 'confirmed' && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus.mutate({ id: r.id, status: 'seated' })}>Seat</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-red-600" onClick={() => updateStatus.mutate({ id: r.id, status: 'no_show' })}>No Show</Button>
                  </>
                )}
                {r.status === 'seated' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus.mutate({ id: r.id, status: 'completed' })}>Complete</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!upcoming.length && <p className="col-span-full text-center text-muted-foreground py-8">No upcoming reservations</p>}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Reservation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Guest Name</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} /></div>
            <div><Label>Party Size</Label><Input type="number" value={form.party_size} onChange={e => setForm({ ...form, party_size: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={form.reservation_date} onChange={e => setForm({ ...form, reservation_date: e.target.value })} /></div>
            <div><Label>Time</Label><Input type="time" value={form.reservation_time} onChange={e => setForm({ ...form, reservation_time: e.target.value })} /></div>
            <div><Label>Special Requests</Label><Input value={form.special_requests} onChange={e => setForm({ ...form, special_requests: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={() => {
              create.mutate({ branch_id: selectedBranch, ...form, party_size: parseInt(form.party_size) || 2 });
              setShowNew(false);
              setForm({ customer_name: '', customer_phone: '', party_size: '2', reservation_date: '', reservation_time: '', special_requests: '' });
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
