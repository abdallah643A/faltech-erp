import { useState } from 'react';
import { useSaasAuditLogs, useSaasTenants } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

export default function SaasAuditLog() {
  const { data: tenants = [] } = useSaasTenants();
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const { data: logs = [] } = useSaasAuditLogs(tenantFilter === 'all' ? undefined : tenantFilter);
  const [search, setSearch] = useState('');

  const filtered = logs.filter((l: any) =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.entity_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Access Audit Log</h1>
        <p className="text-muted-foreground">Track all permission and access changes</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search actions..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-60"><SelectValue placeholder="Filter by client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                  <TableCell className="text-sm">{l.entity_type}</TableCell>
                  <TableCell className="text-sm">{l.performed_by_name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {l.new_values ? JSON.stringify(l.new_values).slice(0, 80) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit events</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
