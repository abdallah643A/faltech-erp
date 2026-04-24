import { useState } from 'react';
import { useSaasTenants, useTenantSeats, useTenantSubscription } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';
import { format } from 'date-fns';

export default function SaasSeats() {
  const { data: tenants = [] } = useSaasTenants();
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const { data: seats = [] } = useTenantSeats(selectedTenant || undefined);
  const { data: subscription } = useTenantSubscription(selectedTenant || undefined);

  const activeSeats = seats.filter((s: any) => s.status === 'active').length;
  const maxSeats = subscription?.max_seats || 0;
  const pct = maxSeats > 0 ? Math.min((activeSeats / maxSeats) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Seats Management</h1>
        <p className="text-muted-foreground">Monitor seat usage and license allocation</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="w-80"><SelectValue placeholder="Select client..." /></SelectTrigger>
            <SelectContent>
              {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTenant && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Active Seats</p>
              <p className="text-2xl font-bold">{activeSeats}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Licensed Seats</p>
              <p className="text-2xl font-bold">{maxSeats}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Usage</p>
              <Progress value={pct} className="h-2 mt-2" />
              <p className="text-xs mt-1">{pct.toFixed(0)}%{pct >= 90 && <Badge className="ml-2 bg-red-100 text-red-800">Near Limit</Badge>}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Seat Licenses</CardTitle></CardHeader>
            <CardContent>
              {seats.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead><TableHead>Last Login</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {seats.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell><p className="font-medium">{(s as any).profiles?.full_name || '—'}</p><p className="text-xs text-muted-foreground">{(s as any).profiles?.email}</p></TableCell>
                        <TableCell><Badge variant="outline">{s.seat_type}</Badge></TableCell>
                        <TableCell><Badge className={s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{s.status}</Badge></TableCell>
                        <TableCell className="text-xs">{s.assigned_at ? format(new Date(s.assigned_at), 'dd MMM yyyy') : '—'}</TableCell>
                        <TableCell className="text-xs">{s.last_login_at ? format(new Date(s.last_login_at), 'dd MMM yyyy') : 'Never'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No seats for this client</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
