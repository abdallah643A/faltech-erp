import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Search, Download, Filter } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'user', header: 'User' },
  { key: 'action', header: 'Action' },
  { key: 'result', header: 'Result' },
  { key: 'ip_address', header: 'IP Address' },
  { key: 'device', header: 'Device' },
];


export default function ECMAuditTrail() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['ecm-audit-trail', search, actionFilter, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('ecm_document_audit').select('*').order('created_at', { ascending: false }).limit(200);
      if (search) q = q.or(`user_name.ilike.%${search}%,action.ilike.%${search}%`);
      if (actionFilter) q = q.eq('action', actionFilter);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const ACTIONS = ['view', 'upload', 'edit', 'delete', 'download', 'print', 'share', 'approve', 'reject', 'sign', 'checkout', 'checkin', 'version_create'];
  const ACTION_COLORS: Record<string, string> = {
    view: 'bg-blue-100 text-blue-800', upload: 'bg-green-100 text-green-800', edit: 'bg-amber-100 text-amber-800',
    delete: 'bg-red-100 text-red-800', download: 'bg-purple-100 text-purple-800', approve: 'bg-emerald-100 text-emerald-800',
    reject: 'bg-red-100 text-red-800', sign: 'bg-indigo-100 text-indigo-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ECM Audit Trail</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="ecmaudit-trail" title="E C M Audit Trail" />
          <p className="text-sm text-muted-foreground">Complete activity log for all document actions</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search user, action..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" className="w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input type="date" className="w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left px-4 py-2 font-medium">Timestamp</th>
                <th className="text-left px-4 py-2 font-medium">User</th>
                <th className="text-left px-4 py-2 font-medium">Action</th>
                <th className="text-left px-4 py-2 font-medium">Result</th>
                <th className="text-left px-4 py-2 font-medium">IP Address</th>
                <th className="text-left px-4 py-2 font-medium">Device</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No audit entries found</td></tr>
              ) : entries.map(e => (
                <tr key={e.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-medium">{e.user_name || 'System'}</td>
                  <td className="px-4 py-2"><Badge variant="outline" className={ACTION_COLORS[e.action] || 'bg-gray-100 text-gray-800'}>{e.action}</Badge></td>
                  <td className="px-4 py-2"><Badge variant={e.result === 'success' ? 'default' : 'destructive'} className="text-xs">{e.result}</Badge></td>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{e.ip_address || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{e.device_info || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
